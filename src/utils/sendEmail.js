/**
 * @file Email delivery utility using Brevo's transactional email HTTP API.
 * @module utils/sendEmail
 */

const BREVO_SEND_EMAIL_URL = "https://api.brevo.com/v3/smtp/email";

const ensureEmailConfig = () => {
  if (!process.env.BREVO_API_KEY) {
    console.error("[Email Error] BREVO_API_KEY is not defined or cannot be accessed in the .env configuration.");
    throw new Error("BREVO_API_KEY environment variable is not defined.");
  }
  if (!process.env.BREVO_SENDER_EMAIL) {
    console.error("[Email Error] BREVO_SENDER_EMAIL is not defined or cannot be accessed in the .env configuration.");
    throw new Error("BREVO_SENDER_EMAIL environment variable is not defined.");
  }
  if (!process.env.BREVO_SENDER_NAME) {
    console.error("[Email Error] BREVO_SENDER_NAME is not defined or cannot be accessed in the .env configuration.");
    throw new Error("BREVO_SENDER_NAME environment variable is not defined.");
  }
};

const createBaseEmail = (to, subject) => ({
  sender: {
    name: process.env.BREVO_SENDER_NAME,
    email: process.env.BREVO_SENDER_EMAIL,
  },
  to: [{ email: to }],
  subject,
});

const sendEmail = async (to, subject, htmlContent, successLabel) => {
  ensureEmailConfig();

  const response = await fetch(BREVO_SEND_EMAIL_URL, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "api-key": process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      ...createBaseEmail(to, subject),
      htmlContent,
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const apiMessage = result?.message || result?.code || response.statusText;
    const error = new Error(apiMessage || "Failed to send email.");
    console.error(`[Email Failure] Failed to send email to ${to}. Error: ${error.message}`);
    throw error;
  }

  console.log(`[Email Success] ${successLabel} sent to ${to}. Message ID: ${result.messageId ?? "unknown"}`);
  return result;
};

// Sends a verification email containing a registration magic link.
export const sendVerificationEmail = async (to, magicLink) => sendEmail(
  to,
  "Verify your Jobverify account",
  `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #1e293b;">Welcome to Jobverify!</h2>
      <p style="color: #475569; font-size: 16px; line-height: 1.5;">
        Thank you for signing up. Please click the button below to verify your email address and access your account. This link is valid for 30 minutes.
      </p>
      <div style="margin: 30px 0; text-align: center;">
        <a href="${magicLink}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Verify Email Address
        </a>
      </div>
      <p style="color: #64748b; font-size: 14px;">
        If the button above does not work, copy and paste the following link into your web browser:
      </p>
      <p style="color: #3b82f6; font-size: 14px; word-break: break-all;">
        <a href="${magicLink}">${magicLink}</a>
      </p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">
        If you did not request this email, you can safely ignore it.
      </p>
    </div>
  `,
  "Verification email",
);

// Sends a password reset email containing a time-limited reset link.
export const sendPasswordResetEmail = async (to, resetLink) => sendEmail(
  to,
  "Reset your Jobverify password",
  `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #1e293b;">Reset your Jobverify password</h2>
      <p style="color: #475569; font-size: 16px; line-height: 1.5;">
        We received a request to reset your password. Click the button below to choose a new password. This link is valid for 30 minutes.
      </p>
      <div style="margin: 30px 0; text-align: center;">
        <a href="${resetLink}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p style="color: #64748b; font-size: 14px;">
        If the button above does not work, copy and paste the following link into your web browser:
      </p>
      <p style="color: #3b82f6; font-size: 14px; word-break: break-all;">
        <a href="${resetLink}">${resetLink}</a>
      </p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">
        If you did not request a password reset, you can safely ignore this email.
      </p>
    </div>
  `,
  "Password reset email",
);
