const nodemailer = require('nodemailer');

let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
} else {
  console.warn('⚠️  SMTP not configured — order confirmation emails will be skipped. Set SMTP_HOST/SMTP_USER/SMTP_PASS in .env to enable.');
}

const PAYMENT_METHOD_LABELS = {
  cod: 'Cash on Delivery',
  card: 'Credit / Debit Card',
  upi: 'UPI',
  netbanking: 'Net Banking',
};

function buildOrderConfirmationEmail(order, items) {
  const itemRows = items.map((item) => `
    <tr>
      <td style="padding:8px 0; border-bottom:1px solid #eee;">${item.name} &times; ${item.quantity}</td>
      <td style="padding:8px 0; border-bottom:1px solid #eee; text-align:right;">₹${(item.price * item.quantity).toFixed(2)}</td>
    </tr>`).join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #222;">
      <h2 style="color:#1a7f37; margin-bottom:0.2em;">Thanks for your order!</h2>
      <p>Your FreshCart order <strong>#${order.id}</strong> has been placed successfully.</p>
      <table style="width:100%; border-collapse:collapse; margin:16px 0;">${itemRows}</table>
      ${order.discount_amount ? `<p style="margin:4px 0;">Discount: −₹${Number(order.discount_amount).toFixed(2)}</p>` : ''}
      <p style="font-size:1.1em; margin:12px 0;"><strong>Total: ₹${Number(order.total_amount).toFixed(2)}</strong></p>
      <p style="margin:4px 0; color:#555;">Payment method: ${PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method || 'N/A'}</p>
      ${order.delivery_slot ? `<p style="margin:4px 0; color:#555;">Delivery slot: ${order.delivery_slot}</p>` : ''}
      <p style="margin-top:1.5em; color:#555;">We'll notify you when your order ships. Thanks for shopping with FreshCart!</p>
    </div>`;

  return { subject: `Order Confirmed — #${order.id}`, html };
}

// Fire-and-forget: a failed email must never fail the order that already succeeded.
async function sendOrderConfirmationEmail(order, items, toEmail) {
  if (!transporter || !toEmail) return;
  const { subject, html } = buildOrderConfirmationEmail(order, items);
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'FreshCart <no-reply@freshcart.example.com>',
      to: toEmail,
      subject,
      html,
    });
  } catch (err) {
    console.error('Failed to send order confirmation email:', err.message);
  }
}

module.exports = { sendOrderConfirmationEmail };
