import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

function getEmailTemplate(role: string, setupLink: string, isNewUser: boolean) {
  const subject = isNewUser 
    ? "Welcome to VOICE AI SmartFlow Automation" 
    : "Complete Your VOICE AI SmartFlow Setup";
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f0f23; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f0f23; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #1a1a2e; border-radius: 16px; box-shadow: 0 8px 32px rgba(79, 70, 229, 0.3); overflow: hidden;">
          <!-- Header with gradient -->
          <tr>
            <td style="padding: 48px 40px 32px; text-align: center; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #06B6D4 100%);">
              <div style="margin-bottom: 16px;">
                <span style="font-size: 48px;">🎙️</span>
              </div>
              <h1 style="margin: 0 0 8px; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">VOICE AI</h1>
              <p style="margin: 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase;">SmartFlow Automation</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 24px; color: #ffffff; font-size: 28px; font-weight: 700; text-align: center;">
                ${isNewUser ? "Welcome to the Team!" : "Complete Your Setup"}
              </h2>
              
              <p style="margin: 0 0 24px; color: #a1a1aa; font-size: 16px; line-height: 1.7; text-align: center;">
                ${isNewUser 
                  ? "You've been invited to join our intelligent voice automation platform. We're excited to have you on board!" 
                  : "Your account is ready! Complete your setup to start using our powerful voice automation tools."}
              </p>
              
              <!-- Role Badge -->
              <div style="background: linear-gradient(135deg, rgba(79, 70, 229, 0.2) 0%, rgba(124, 58, 237, 0.2) 100%); border-left: 4px solid #7C3AED; padding: 20px 24px; margin: 32px 0; border-radius: 0 12px 12px 0;">
                <p style="margin: 0; color: #c4b5fd; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Your Role</p>
                <p style="margin: 8px 0 0; color: #ffffff; font-size: 20px; font-weight: 700; text-transform: capitalize;">${role}</p>
              </div>
              
              <p style="margin: 0 0 32px; color: #a1a1aa; font-size: 16px; line-height: 1.6; text-align: center;">
                Click the button below to set up your password and access your account:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${setupLink}" style="display: inline-block; padding: 18px 48px; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 700; border-radius: 12px; box-shadow: 0 8px 24px rgba(79, 70, 229, 0.5); letter-spacing: 0.5px;">
                      Complete Account Setup
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 40px 0 0; color: #71717a; font-size: 14px; line-height: 1.6; text-align: center;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 12px 0 0; word-break: break-all; text-align: center;">
                <a href="${setupLink}" style="color: #06B6D4; font-size: 14px;">${setupLink}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; background-color: rgba(0, 0, 0, 0.3); border-top: 1px solid rgba(255, 255, 255, 0.1);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px; color: #71717a; font-size: 12px;">
                      This invitation link will expire in 24 hours.
                    </p>
                    <p style="margin: 0 0 16px; color: #52525b; font-size: 11px;">
                      If you didn't expect this invitation, you can safely ignore this email.
                    </p>
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255, 255, 255, 0.05);">
                      <p style="margin: 0 0 4px; color: #a1a1aa; font-size: 13px; font-weight: 600;">
                        🎙️ VOICE AI SmartFlow Automation
                      </p>
                      <p style="margin: 0; color: #71717a; font-size: 11px;">
                        Intelligent Voice Solutions
                      </p>
                      <p style="margin: 8px 0 0; color: #52525b; font-size: 10px;">
                        © ${new Date().getFullYear()} VOICE AI SmartFlow Automation. All rights reserved.
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return { subject, html };
}

async function sendInvitationEmail(email: string, role: string, setupLink: string, isNewUser: boolean) {
  try {
    const { subject, html } = getEmailTemplate(role, setupLink, isNewUser);

    const { error } = await resend.emails.send({
      from: "VOICE AI SmartFlow Automation <notifications@mail.smartflowautomation.io>",
      to: [email],
      subject: subject,
      html: html,
    });

    if (error) {
      console.error("Error sending email via Resend:", error);
      throw error;
    }

    console.log(`Invitation email sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error("Failed to send invitation email:", error);
    return false;
  }
}

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

    // Validate email format (server-side)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = email.trim();
    if (!emailRegex.test(trimmedEmail) || trimmedEmail.length > 255) {
      return new Response(
        JSON.stringify({ error: 'Please enter a valid email address' }),
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
    const redirectUrl = `https://voiceai.smartflowautomation.io/auth?mode=setup`;

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

      // Generate magic link for setup
      const { data: linkData, error: linkError } = await supabaseClient.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (linkError) {
        console.error('Error generating recovery link:', linkError);
      }

      // Send custom email via Resend
      const setupLink = linkData?.properties?.action_link || redirectUrl;
      const emailSent = await sendInvitationEmail(email, role, setupLink, false);

      console.log(`Role ${role} assigned to existing user ${email}, email sent: ${emailSent}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          userId: userId,
          message: emailSent 
            ? 'Role assigned to existing user. Setup email sent via Resend.' 
            : 'Role assigned but setup email could not be sent.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new user using admin API (without sending Supabase's default email)
    console.log(`Creating new user: ${email}`);
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
    console.log(`User created with ID: ${userId}`);

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

    // Generate magic link for the new user
    const { data: linkData, error: linkError } = await supabaseClient.auth.admin.generateLink({
      type: 'invite',
      email: email,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (linkError) {
      console.error('Error generating invite link:', linkError);
    }

    // Send custom invitation email via Resend
    const setupLink = linkData?.properties?.action_link || redirectUrl;
    const emailSent = await sendInvitationEmail(email, role, setupLink, true);

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: userId,
        message: emailSent 
          ? 'User invited successfully. Setup email sent via Resend.' 
          : 'User created but invitation email could not be sent.',
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
