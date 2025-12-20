import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

function getReminderEmailTemplate(role: string, setupLink: string) {
  const subject = "Reminder: Complete Your VOICE AI SmartFlow Setup";
  
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
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #1a1a2e; border-radius: 16px; box-shadow: 0 8px 32px rgba(245, 158, 11, 0.2); overflow: hidden;">
          <!-- Header with gradient (amber/orange for reminder) -->
          <tr>
            <td style="padding: 48px 40px 32px; text-align: center; background: linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #06B6D4 100%);">
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
                Don't Miss Out! ⏰
              </h2>
              
              <p style="margin: 0 0 24px; color: #a1a1aa; font-size: 16px; line-height: 1.7; text-align: center;">
                This is a friendly reminder to complete your account setup. Your invitation to join our intelligent voice automation platform is still waiting for you!
              </p>
              
              <!-- Role Badge -->
              <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.2) 100%); border-left: 4px solid #F59E0B; padding: 20px 24px; margin: 32px 0; border-radius: 0 12px 12px 0;">
                <p style="margin: 0; color: #fcd34d; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Your Role</p>
                <p style="margin: 8px 0 0; color: #ffffff; font-size: 20px; font-weight: 700; text-transform: capitalize;">${role}</p>
              </div>
              
              <p style="margin: 0 0 32px; color: #a1a1aa; font-size: 16px; line-height: 1.6; text-align: center;">
                Click the button below to set up your password and access your account:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${setupLink}" style="display: inline-block; padding: 18px 48px; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 700; border-radius: 12px; box-shadow: 0 8px 24px rgba(245, 158, 11, 0.5); letter-spacing: 0.5px;">
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
    const { subject, html } = getReminderEmailTemplate(userRole, magicLink);

    // Send email via Resend
    const { error: emailError } = await resend.emails.send({
      from: "VOICE AI SmartFlow Automation <notifications@mail.smartflowautomation.io>",
      to: [email],
      subject: subject,
      html: html,
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
