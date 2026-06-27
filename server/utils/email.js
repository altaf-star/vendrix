import nodemailer from 'nodemailer';
import { logger } from './logger.js';

const createTransporter = () =>
  nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

export const sendVerificationEmail = async ({ to, name, verifyUrl }) => {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"Vendrix" <${process.env.EMAIL_FROM}>`,
    to,
    subject: 'Verify your Vendrix email',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff">
        <img src="${process.env.CLIENT_URL}/vendrix-logo.jpg" alt="Vendrix" style="height:48px;margin-bottom:24px;border-radius:8px"/>
        <h2 style="color:#1e293b;margin:0 0 8px">Welcome to Vendrix, ${name}!</h2>
        <p style="color:#64748b;margin:0 0 24px">You're almost ready. Click the button below to verify your email address and activate your account.</p>
        <a href="${verifyUrl}" style="display:inline-block;background:#a821d4;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px">
          Verify Email Address
        </a>
        <p style="color:#94a3b8;font-size:13px;margin:24px 0 0">
          This link expires in 24 hours.<br/>
          If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    `,
  });
  logger.info(`Verification email sent to ${to}`);
};

export const sendVendorApprovedEmail = async ({ to, name, shopName }) => {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"Vendrix" <${process.env.EMAIL_FROM}>`,
    to,
    subject: `Your shop "${shopName}" is approved!`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff">
        <img src="${process.env.CLIENT_URL}/vendrix-logo.jpg" alt="Vendrix" style="height:48px;margin-bottom:24px;border-radius:8px"/>
        <h2 style="color:#1e293b;margin:0 0 8px">Congratulations, ${name}!</h2>
        <p style="color:#64748b;margin:0 0 8px">Your vendor application for <strong>${shopName}</strong> has been approved.</p>
        <p style="color:#64748b;margin:0 0 24px">You can now log in and start adding products to your shop.</p>
        <a href="${process.env.CLIENT_URL}/vendor/dashboard" style="display:inline-block;background:#a821d4;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px">
          Go to Vendor Dashboard
        </a>
      </div>
    `,
  });
  logger.info(`Vendor approved email sent to ${to}`);
};

export const sendVendorRejectedEmail = async ({ to, name, shopName, note }) => {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"Vendrix" <${process.env.EMAIL_FROM}>`,
    to,
    subject: `Update on your vendor application — ${shopName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff">
        <img src="${process.env.CLIENT_URL}/vendrix-logo.jpg" alt="Vendrix" style="height:48px;margin-bottom:24px;border-radius:8px"/>
        <h2 style="color:#1e293b;margin:0 0 8px">Hi ${name},</h2>
        <p style="color:#64748b;margin:0 0 8px">Unfortunately, your vendor application for <strong>${shopName}</strong> was not approved at this time.</p>
        ${note ? `<p style="color:#64748b;margin:0 0 24px">Reason: <em>${note}</em></p>` : ''}
        <p style="color:#64748b;margin:0 0 24px">You're welcome to re-apply after addressing the feedback. Contact us if you have questions.</p>
        <a href="${process.env.CLIENT_URL}/contact" style="display:inline-block;background:#64748b;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px">
          Contact Support
        </a>
      </div>
    `,
  });
  logger.info(`Vendor rejected email sent to ${to}`);
};

export const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"Vendrix" <${process.env.EMAIL_FROM || 'noreply@vendrix.store'}>`,
    to,
    subject: 'Reset your Vendrix password',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff">
        <img src="${process.env.CLIENT_URL}/vendrix-logo.jpg" alt="Vendrix" style="height:48px;margin-bottom:24px;border-radius:8px"/>
        <h2 style="color:#1e293b;margin:0 0 8px">Password reset request</h2>
        <p style="color:#64748b;margin:0 0 24px">Hi ${name}, click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#a821d4;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px">
          Reset Password
        </a>
        <p style="color:#94a3b8;font-size:13px;margin:24px 0 0">
          If you didn't request this, you can safely ignore this email.<br/>
          Or copy this link: <a href="${resetUrl}" style="color:#a821d4">${resetUrl}</a>
        </p>
      </div>
    `,
  });

  logger.info(`Password reset email sent to ${to}`);
};

export const sendOrderConfirmationEmail = async ({ to, name, orderNumber, total, items }) => {
  const transporter = createTransporter();

  const itemRows = items.map(
    (i) => `<tr>
      <td style="padding:8px 0;color:#374151">${i.name}</td>
      <td style="padding:8px 0;color:#374151;text-align:center">${i.quantity}</td>
      <td style="padding:8px 0;color:#374151;text-align:right">Rs ${i.price.toLocaleString()}</td>
    </tr>`
  ).join('');

  await transporter.sendMail({
    from: `"Vendrix" <${process.env.EMAIL_FROM || 'noreply@vendrix.store'}>`,
    to,
    subject: `Order confirmed — ${orderNumber}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff">
        <img src="${process.env.CLIENT_URL}/vendrix-logo.jpg" alt="Vendrix" style="height:48px;margin-bottom:24px;border-radius:8px"/>
        <h2 style="color:#1e293b;margin:0 0 8px">Your order is confirmed!</h2>
        <p style="color:#64748b;margin:0 0 4px">Hi ${name}, we've received your order.</p>
        <p style="color:#64748b;margin:0 0 24px">Order number: <strong>${orderNumber}</strong></p>

        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
          <thead>
            <tr style="border-bottom:1px solid #e5e7eb">
              <th style="text-align:left;padding:8px 0;color:#6b7280;font-size:13px">Item</th>
              <th style="text-align:center;padding:8px 0;color:#6b7280;font-size:13px">Qty</th>
              <th style="text-align:right;padding:8px 0;color:#6b7280;font-size:13px">Price</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
          <tfoot>
            <tr style="border-top:1px solid #e5e7eb">
              <td colspan="2" style="padding:8px 0;font-weight:700;color:#1e293b">Total</td>
              <td style="padding:8px 0;font-weight:700;color:#1e293b;text-align:right">Rs ${total.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>

        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin-bottom:24px">
          <p style="margin:0;color:#92400e;font-size:14px">💰 <strong>Cash on Delivery</strong> — pay when your order arrives.</p>
        </div>

        <a href="${process.env.CLIENT_URL}/orders"
           style="display:inline-block;background:#a821d4;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px">
          Track My Order
        </a>
      </div>
    `,
  });

  logger.info(`Order confirmation email sent to ${to} for ${orderNumber}`);
};
