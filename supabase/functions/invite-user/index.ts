import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user making the request
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if the requesting user has owner role
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .single();

    // Only owners can add new users
    if (roleError || !roleData || roleData.role !== 'owner') {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Only owners can add users.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request body
    const { email, role } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate role
    const validRoles = ['admin', 'manager', 'staff', 'viewer'];
    if (!role || !validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role. Must be one of: admin, manager, staff, viewer' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Inviting user: ${email} with role: ${role}`);

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabaseClient.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error checking existing users:', listError);
    }

    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    let userId: string;

    const redirectUrl = `${req.headers.get('origin') || 'https://undppzthskqsikywqvwn.lovable.app'}/auth`;

    if (existingUser) {
      console.log(`User ${email} already exists with ID: ${existingUser.id}`);
      userId = existingUser.id;

      // Check if they already have a role
      const { data: existingRole } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', existingUser.id)
        .single();

      if (existingRole) {
        return new Response(
          JSON.stringify({ error: `User already exists with role: ${existingRole.role}. Use the role dropdown to change their role instead.` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // User exists but has no role - assign the role
      console.log(`Assigning role ${role} to existing user ${existingUser.id}`);

      // Assign role first
      const { error: roleInsertError } = await supabaseClient
        .from('user_roles')
        .insert([{ 
          user_id: userId, 
          role: role,
          created_by: requestingUser.id 
        }]);

      if (roleInsertError) {
        console.error('Error assigning role:', roleInsertError);
        return new Response(
          JSON.stringify({ error: 'Failed to assign role: ' + roleInsertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Send password reset email for existing user to set up their account
      const { error: resetError } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (resetError) {
        console.error('Error sending reset email:', resetError);
        return new Response(
          JSON.stringify({ 
            success: true, 
            userId: userId,
            warning: 'Role assigned but setup email could not be sent.',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Role ${role} assigned and setup email sent to existing user ${email}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          userId: userId,
          message: 'Role assigned to existing user. Setup email sent.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Invite new user - this creates the user AND sends the invitation email
    console.log(`Inviting new user: ${email}`);
    const { data: inviteData, error: inviteError } = await supabaseClient.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: redirectUrl,
        data: {
          invited_by: requestingUser.id,
          setup_required: true,
        },
      }
    );

    if (inviteError) {
      console.error('Error inviting user:', inviteError);
      return new Response(
        JSON.stringify({ error: inviteError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!inviteData.user) {
      return new Response(
        JSON.stringify({ error: 'User invitation failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    userId = inviteData.user.id;
    console.log(`User invited with ID: ${userId}`);

    // Assign role to the new user
    const { error: roleInsertError } = await supabaseClient
      .from('user_roles')
      .insert([{ 
        user_id: userId, 
        role: role,
        created_by: requestingUser.id 
      }]);

    if (roleInsertError) {
      console.error('Error assigning role:', roleInsertError);
      // Rollback - delete the invited user
      await supabaseClient.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: 'Failed to assign role: ' + roleInsertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Role ${role} assigned to new user ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: userId,
        message: 'User invited successfully. Setup email sent.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in invite-user function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
