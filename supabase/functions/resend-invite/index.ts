import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify the requesting user is authenticated and has permission
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if requesting user is owner
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .single();

    if (roleError || roleData?.role !== "owner") {
      return new Response(
        JSON.stringify({ error: "Only owners can resend invitations" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email } = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Resending invitation to: ${email}`);

    // Get user's role
    const { data: existingUsers } = await supabaseClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    let userRole = "staff";
    if (existingUser) {
      const { data: userRoleData } = await supabaseClient
        .from("user_roles")
        .select("role")
        .eq("user_id", existingUser.id)
        .single();
      
      if (userRoleData) {
        userRole = userRoleData.role;
      }
    }

    // Generate recovery link
    const appUrl = req.headers.get("origin") || "https://undppzthskqsikywqvwn.lovable.app";
    const setupUrl = `${appUrl}/auth?mode=setup`;

    const { data: linkData, error: linkError } = await supabaseClient.auth.admin.generateLink({
      type: "recovery",
      email: email,
      options: {
        redirectTo: setupUrl,
      },
    });

    if (linkError) {
      console.error("Error generating recovery link:", linkError);
      return new Response(
        JSON.stringify({ error: linkError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const magicLink = linkData?.properties?.action_link || setupUrl;

    // Send email via Resend
    const { error: emailError } = await resend.emails.send({
      from: "Team Invitation <onboarding@resend.dev>",
      to: [email],
      subject: "Complete Your Account Setup - Reminder",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete Your Account Setup</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Reminder: Complete Your Setup</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                This is a friendly reminder to complete your account setup. Your invitation is still waiting for you!
              </p>
              
              <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>Your Role:</strong> <span style="text-transform: capitalize;">${userRole}</span>
                </p>
              </div>
              
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                Click the button below to set up your password and access your account:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${magicLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);">
                      Complete Account Setup
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 32px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 8px 0 0; word-break: break-all;">
                <a href="${magicLink}" style="color: #f59e0b; font-size: 14px;">${magicLink}</a>
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
              
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                This invitation link will expire in 24 hours. If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (emailError) {
      console.error("Error sending email via Resend:", emailError);
      return new Response(
        JSON.stringify({ error: "Failed to send email: " + JSON.stringify(emailError) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Invitation resent successfully to: ${email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Setup email resent successfully via Resend" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in resend-invite function:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
