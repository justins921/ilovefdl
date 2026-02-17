import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface SendMagicLinkOptions {
  to: string;
  token: string;
}

export async function sendMagicLinkEmail({ to, token }: SendMagicLinkOptions): Promise<void> {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const magicLinkUrl = `${appUrl}/auth/verify?token=${token}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || '"I Love FDL" <noreply@ilovefdl.com>',
    to,
    subject: 'Sign in to I Love FDL',
    text: `Click the link below to sign in to I Love FDL:\n\n${magicLinkUrl}\n\nThis link will expire in 15 minutes.\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a;">Sign in to I Love FDL</h2>
        <p style="color: #4a4a4a; line-height: 1.6;">
          Click the button below to sign in to your account.
        </p>
        <a href="${magicLinkUrl}"
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px;
                  border-radius: 6px; text-decoration: none; font-weight: 600; margin: 16px 0;">
          Sign In
        </a>
        <p style="color: #888; font-size: 14px; margin-top: 24px;">
          This link will expire in 15 minutes. If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

export default transporter;
