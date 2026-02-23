import nodemailer from 'nodemailer';

// ---------------------------------------------------------------------------
// Transporter setup
// ---------------------------------------------------------------------------

const isSmtpConfigured =
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

const transporter = isSmtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

const FROM_ADDRESS =
  process.env.SMTP_FROM || '"I Love FDL" <noreply@ilovefdl.com>';

// ---------------------------------------------------------------------------
// HTML template helpers
// ---------------------------------------------------------------------------

const BRAND_COLOR = '#1a2332';
const BRAND_ACCENT = '#2563eb';

function wrapHtml(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:${BRAND_COLOR};padding:24px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:0.5px;">I Love FDL</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${bodyContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5;">
                &copy; ${new Date().getFullYear()} I Love FDL. All rights reserved.
              </p>
              <p style="margin:4px 0 0;color:#9ca3af;font-size:12px;">
                Fond du Lac, Wisconsin
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buttonHtml(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background-color:${BRAND_ACCENT};color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;margin:16px 0;">${label}</a>`;
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Internal send helper
// ---------------------------------------------------------------------------

async function send(
  to: string,
  subject: string,
  html: string,
  text?: string,
): Promise<void> {
  if (!transporter) {
    console.log('--- EMAIL (dev fallback – SMTP not configured) ---');
    console.log(`  To:      ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body:    (HTML email – ${html.length} chars)`);
    if (text) console.log(`  Text:    ${text}`);
    console.log('---------------------------------------------------');
    return;
  }

  try {
    await transporter.sendMail({ from: FROM_ADDRESS, to, subject, html, text });
  } catch (err) {
    console.error(`Failed to send email to ${to} [${subject}]:`, err);
  }
}

// ---------------------------------------------------------------------------
// Existing auth emails (preserved for backwards compatibility)
// ---------------------------------------------------------------------------

interface SendMagicLinkOptions {
  to: string;
  token: string;
}

export async function sendMagicLinkEmail({
  to,
  token,
}: SendMagicLinkOptions): Promise<void> {
  const appUrl = process.env.APP_URL || process.env.BASE_URL || 'http://localhost:3000';
  const magicLinkUrl = `${appUrl}/auth/verify?token=${token}`;

  const body = `
    <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:22px;">Sign in to I Love FDL</h2>
    <p style="color:#4b5563;line-height:1.6;font-size:15px;">
      Click the button below to sign in to your account.
    </p>
    ${buttonHtml(magicLinkUrl, 'Sign In')}
    <p style="color:#9ca3af;font-size:13px;margin-top:24px;">
      This link will expire in 15 minutes. If you didn&rsquo;t request this, you can safely ignore this email.
    </p>`;

  const text = `Sign in to I Love FDL\n\nClick the link below to sign in:\n${magicLinkUrl}\n\nThis link will expire in 15 minutes.`;

  await send(to, 'Sign in to I Love FDL', wrapHtml('Sign In', body), text);
}

interface SendPasswordResetOptions {
  to: string;
  token: string;
}

export async function sendPasswordResetEmail({
  to,
  token,
}: SendPasswordResetOptions): Promise<void> {
  const appUrl = process.env.APP_URL || process.env.BASE_URL || 'http://localhost:3000';
  const resetUrl = `${appUrl}/auth/reset-password?token=${token}`;

  const body = `
    <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:22px;">Reset Your Password</h2>
    <p style="color:#4b5563;line-height:1.6;font-size:15px;">
      You requested a password reset for your I Love FDL account. Click the button below to choose a new password.
    </p>
    ${buttonHtml(resetUrl, 'Reset Password')}
    <p style="color:#9ca3af;font-size:13px;margin-top:24px;">
      This link will expire in 1 hour. If you didn&rsquo;t request this, you can safely ignore this email.
    </p>`;

  const text = `Reset Your Password\n\nClick the link below to reset your password:\n${resetUrl}\n\nThis link will expire in 1 hour.`;

  await send(to, 'Reset Your Password', wrapHtml('Reset Password', body), text);
}

// ---------------------------------------------------------------------------
// Order confirmation
// ---------------------------------------------------------------------------

interface OrderConfirmationOrder {
  id: string;
  total: number;
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
}

export async function sendOrderConfirmation(
  to: string,
  order: OrderConfirmationOrder,
): Promise<void> {
  const itemRows = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:14px;">${item.name}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:14px;text-align:center;">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:14px;text-align:right;">${formatCurrency(item.unitPrice)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:14px;text-align:right;">${formatCurrency(item.unitPrice * item.quantity)}</td>
      </tr>`,
    )
    .join('');

  const body = `
    <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:22px;">Order Confirmation</h2>
    <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">Order #${order.id}</p>
    <p style="color:#4b5563;line-height:1.6;font-size:15px;">
      Thank you for your order! Here&rsquo;s a summary of what you purchased:
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid #e5e7eb;border-radius:6px;border-collapse:collapse;">
      <thead>
        <tr style="background-color:#f9fafb;">
          <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb;">Item</th>
          <th style="padding:10px 12px;text-align:center;font-size:13px;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb;">Qty</th>
          <th style="padding:10px 12px;text-align:right;font-size:13px;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb;">Price</th>
          <th style="padding:10px 12px;text-align:right;font-size:13px;color:#6b7280;font-weight:600;border-bottom:2px solid #e5e7eb;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding:12px;text-align:right;font-weight:700;font-size:15px;color:#1a1a1a;">Total</td>
          <td style="padding:12px;text-align:right;font-weight:700;font-size:15px;color:#1a1a1a;">${formatCurrency(order.total)}</td>
        </tr>
      </tfoot>
    </table>
    <p style="color:#4b5563;line-height:1.6;font-size:15px;">
      We&rsquo;ll send you another email when your order ships. If you have any questions, feel free to reply to this email.
    </p>`;

  const itemLines = order.items
    .map((i) => `  - ${i.name} x${i.quantity} @ ${formatCurrency(i.unitPrice)}`)
    .join('\n');
  const text = `Order Confirmation - #${order.id}\n\nThank you for your order!\n\nItems:\n${itemLines}\n\nTotal: ${formatCurrency(order.total)}`;

  await send(
    to,
    `Order Confirmation - #${order.id}`,
    wrapHtml('Order Confirmation', body),
    text,
  );
}

// ---------------------------------------------------------------------------
// Shipping update
// ---------------------------------------------------------------------------

interface ShippingUpdateOrder {
  id: string;
  trackingNumber: string;
  trackingCarrier: string;
}

export async function sendShippingUpdate(
  to: string,
  order: ShippingUpdateOrder,
): Promise<void> {
  const body = `
    <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:22px;">Your Order Has Shipped!</h2>
    <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">Order #${order.id}</p>
    <p style="color:#4b5563;line-height:1.6;font-size:15px;">
      Great news &mdash; your order is on its way! Here are the tracking details:
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background-color:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 8px;color:#6b7280;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Carrier</p>
          <p style="margin:0;color:#1a1a1a;font-size:16px;font-weight:600;">${order.trackingCarrier}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:0 20px 16px;">
          <p style="margin:0 0 8px;color:#6b7280;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Tracking Number</p>
          <p style="margin:0;color:#1a1a1a;font-size:16px;font-weight:600;font-family:monospace;">${order.trackingNumber}</p>
        </td>
      </tr>
    </table>
    <p style="color:#4b5563;line-height:1.6;font-size:15px;">
      You can track your package using the carrier&rsquo;s website with the tracking number above.
    </p>`;

  const text = `Your order has shipped!\n\nOrder #${order.id}\nCarrier: ${order.trackingCarrier}\nTracking Number: ${order.trackingNumber}`;

  await send(
    to,
    'Your order has shipped!',
    wrapHtml('Shipping Update', body),
    text,
  );
}

// ---------------------------------------------------------------------------
// Welcome email
// ---------------------------------------------------------------------------

export async function sendWelcomeEmail(
  to: string,
  name: string,
): Promise<void> {
  const appUrl = process.env.APP_URL || process.env.BASE_URL || 'http://localhost:3000';

  const body = `
    <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:22px;">Welcome to I Love FDL!</h2>
    <p style="color:#4b5563;line-height:1.6;font-size:15px;">
      Hi ${name},
    </p>
    <p style="color:#4b5563;line-height:1.6;font-size:15px;">
      Thanks for joining I Love FDL! We&rsquo;re thrilled to have you as part of our community supporting local businesses in Fond du Lac.
    </p>
    <p style="color:#4b5563;line-height:1.6;font-size:15px;">
      Here are a few things you can do to get started:
    </p>
    <ul style="color:#4b5563;line-height:1.8;font-size:15px;padding-left:20px;">
      <li>Browse products from local vendors</li>
      <li>Save your favorite items</li>
      <li>Support small businesses in your community</li>
    </ul>
    ${buttonHtml(appUrl, 'Start Shopping')}
    <p style="color:#4b5563;line-height:1.6;font-size:15px;margin-top:16px;">
      If you have any questions, don&rsquo;t hesitate to reach out. We&rsquo;re here to help!
    </p>`;

  const text = `Welcome to I Love FDL!\n\nHi ${name},\n\nThanks for joining I Love FDL! We're thrilled to have you as part of our community.\n\nVisit us at ${appUrl} to start shopping.`;

  await send(
    to,
    'Welcome to I Love FDL!',
    wrapHtml('Welcome', body),
    text,
  );
}

// ---------------------------------------------------------------------------
// Refund notification
// ---------------------------------------------------------------------------

interface RefundNotification {
  orderId: string;
  amount: number;
  status: string;
}

export async function sendRefundNotification(
  to: string,
  refund: RefundNotification,
): Promise<void> {
  const statusColor =
    refund.status.toLowerCase() === 'completed' ? '#059669' : '#d97706';
  const statusLabel = refund.status.charAt(0).toUpperCase() + refund.status.slice(1);

  const body = `
    <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:22px;">Refund Update</h2>
    <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">Order #${refund.orderId}</p>
    <p style="color:#4b5563;line-height:1.6;font-size:15px;">
      We have an update on the refund for your order:
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background-color:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 8px;color:#6b7280;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Refund Amount</p>
          <p style="margin:0;color:#1a1a1a;font-size:20px;font-weight:700;">${formatCurrency(refund.amount)}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:0 20px 16px;">
          <p style="margin:0 0 8px;color:#6b7280;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Status</p>
          <span style="display:inline-block;padding:4px 12px;border-radius:9999px;background-color:${statusColor};color:#ffffff;font-size:13px;font-weight:600;">${statusLabel}</span>
        </td>
      </tr>
    </table>
    <p style="color:#4b5563;line-height:1.6;font-size:15px;">
      ${refund.status.toLowerCase() === 'completed'
        ? 'The refund has been processed and should appear in your account within 5&ndash;10 business days, depending on your payment provider.'
        : 'Your refund is being processed. We&rsquo;ll notify you once it&rsquo;s completed.'}
    </p>
    <p style="color:#9ca3af;font-size:13px;margin-top:24px;">
      If you have any questions about this refund, please reply to this email.
    </p>`;

  const text = `Refund Update\n\nOrder #${refund.orderId}\nRefund Amount: ${formatCurrency(refund.amount)}\nStatus: ${statusLabel}`;

  await send(
    to,
    'Refund Update',
    wrapHtml('Refund Update', body),
    text,
  );
}

// ---------------------------------------------------------------------------
// Vendor approval
// ---------------------------------------------------------------------------

export async function sendVendorApproval(
  to: string,
  vendorName: string,
): Promise<void> {
  const appUrl = process.env.APP_URL || process.env.BASE_URL || 'http://localhost:3000';

  const body = `
    <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:22px;">Congratulations!</h2>
    <p style="color:#4b5563;line-height:1.6;font-size:15px;">
      Great news &mdash; your vendor application for <strong>${vendorName}</strong> has been approved!
    </p>
    <p style="color:#4b5563;line-height:1.6;font-size:15px;">
      You can now start listing your products on I Love FDL. Here&rsquo;s what to do next:
    </p>
    <ol style="color:#4b5563;line-height:1.8;font-size:15px;padding-left:20px;">
      <li>Log in to your vendor dashboard</li>
      <li>Add your products with photos and descriptions</li>
      <li>Set your pricing and inventory</li>
      <li>Start receiving orders from the community</li>
    </ol>
    ${buttonHtml(`${appUrl}/vendor/dashboard`, 'Go to Vendor Dashboard')}
    <p style="color:#4b5563;line-height:1.6;font-size:15px;margin-top:16px;">
      We&rsquo;re excited to have ${vendorName} as part of the I Love FDL marketplace. Welcome aboard!
    </p>`;

  const text = `Your vendor application has been approved!\n\nCongratulations! Your vendor application for ${vendorName} has been approved.\n\nYou can now log in to your vendor dashboard to start listing products.\n\nVisit ${appUrl}/vendor/dashboard to get started.`;

  await send(
    to,
    'Your vendor application has been approved!',
    wrapHtml('Vendor Approved', body),
    text,
  );
}

// ---------------------------------------------------------------------------
// Default export (backwards compatibility)
// ---------------------------------------------------------------------------

export default transporter;
