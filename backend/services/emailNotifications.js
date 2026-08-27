const nodemailer = require('nodemailer');

let transporter = null;

const appName = process.env.APP_NAME || 'Kiwi Predict';
const frontendUrl = process.env.FRONTEND_URL || 'https://kiwipredict.com';

const isEmailConfigured = () => Boolean(
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
);

const getTransporter = () => {
  if (!isEmailConfigured()) return null;

  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      requireTLS: !secure,
      connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 30000),
      greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS || 30000),
      socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 60000),
      pool: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  return transporter;
};

const getFromAddress = () => process.env.EMAIL_FROM || `${appName} <${process.env.SMTP_USER}>`;

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const baseTemplate = ({ title, preview, body, ctaText, ctaUrl }) => `
  <div style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preview || title)}</div>
    <div style="max-width:640px;margin:0 auto;padding:28px 16px;">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:22px;overflow:hidden;box-shadow:0 18px 44px rgba(15,23,42,0.08);">
        <div style="padding:26px 28px;background:linear-gradient(135deg,#d4af37 0%,#f6d365 48%,#b8860b 100%);">
          <div style="font-size:13px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#1f2937;">${appName}</div>
          <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;color:#1f2937;">${escapeHtml(title)}</h1>
        </div>
        <div style="padding:28px;line-height:1.65;font-size:16px;">
          ${body}
          ${ctaText && ctaUrl ? `
            <div style="margin-top:26px;">
              <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:800;padding:13px 18px;border-radius:12px;">${escapeHtml(ctaText)}</a>
            </div>
          ` : ''}
        </div>
        <div style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e5e7eb;color:#64748b;font-size:12px;line-height:1.5;">
          You are receiving this email because you have a ${appName} account.
        </div>
      </div>
    </div>
  </div>
`;

const sendMail = async ({ to, bcc, subject, html, text }) => {
  const mailer = getTransporter();

  if (!mailer) {
    console.log(`[Email] SMTP not configured. Skipped email: ${subject}`);
    return { skipped: true };
  }

  try {
    const result = await mailer.sendMail({
      from: getFromAddress(),
      to,
      bcc,
      subject,
      html,
      text
    });

    console.log(`[Email] Sent: ${subject}`);
    return result;
  } catch (error) {
    console.error(`[Email] Failed to send: ${subject}`, {
      message: error.message,
      code: error.code,
      command: error.command,
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE
    });
    throw error;
  }
};

const sendWelcomeEmail = async (user) => {
  if (!user?.email) return;

  const username = escapeHtml(user.username || 'there');
  const html = baseTemplate({
    title: 'Welcome to Kiwi Predict',
    preview: 'Your Kiwi Predict account is ready.',
    body: `
      <p style="margin:0 0 16px;">Hi <strong>${username}</strong>,</p>
      <p style="margin:0 0 16px;">Thanks for joining ${appName}. Your account is ready, and you can now follow daily football predictions, outcomes, VIP selections, and tools from your dashboard.</p>
      <p style="margin:0;">We’ll let you know when new predictions are available.</p>
    `,
    ctaText: 'Open Predictions',
    ctaUrl: `${frontendUrl}/predictions`
  });

  return sendMail({
    to: user.email,
    subject: `Welcome to ${appName}`,
    html,
    text: `Hi ${user.username || 'there'}, welcome to ${appName}. Your account is ready. Visit ${frontendUrl}/predictions`
  });
};

const getPredictionTypeLabel = (type) => ({
  win: 'Match Winner',
  over15: 'Over/Under 1.5',
  over25: 'Over/Under 2.5',
  over35: 'Over/Under 3.5',
  corners: 'Corners',
  ggng: 'GG/NG',
  others: 'Others',
  player: 'Player Prediction'
}[type] || 'Prediction');

const sendPredictionNotificationEmail = async ({ users = [], match, predictions = [] }) => {
  const recipients = [...new Set(users.map(user => user.email).filter(Boolean))];
  if (recipients.length === 0 || !match || predictions.length === 0) return;

  const matchTitle = `${match.homeTeam} vs ${match.awayTeam}`;
  const predictionRows = predictions.map(pred => `
    <li style="margin-bottom:10px;">
      <strong>${escapeHtml(getPredictionTypeLabel(pred.type))}:</strong>
      ${escapeHtml(pred.prediction)}
      ${typeof pred.confidence === 'number' ? `<span style="color:#64748b;">(${pred.confidence}% confidence)</span>` : ''}
    </li>
  `).join('');

  const html = baseTemplate({
    title: 'New predictions are available',
    preview: `New predictions for ${matchTitle}`,
    body: `
      <p style="margin:0 0 16px;">New predictions have just been added for:</p>
      <div style="padding:14px 16px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:14px;margin-bottom:18px;">
        <strong style="font-size:18px;color:#0f172a;">${escapeHtml(matchTitle)}</strong><br>
        <span style="color:#64748b;">${escapeHtml(match.league || 'Football')} • ${new Date(match.date).toLocaleString()}</span>
      </div>
      <ul style="padding-left:20px;margin:0;">${predictionRows}</ul>
    `,
    ctaText: 'View Predictions',
    ctaUrl: `${frontendUrl}/predictions`
  });

  const subject = `${appName}: New predictions for ${matchTitle}`;
  const batchSize = Number(process.env.EMAIL_BATCH_SIZE || 50);

  for (let index = 0; index < recipients.length; index += batchSize) {
    const batch = recipients.slice(index, index + batchSize);
    await sendMail({
      to: process.env.EMAIL_TO_PLACEHOLDER || process.env.SMTP_USER,
      bcc: batch,
      subject,
      html,
      text: `New predictions are available for ${matchTitle}. Visit ${frontendUrl}/predictions`
    });
  }
};

const sendBroadcastEmail = async ({ users = [], subject, message }) => {
  const recipients = [...new Set(users.map(user => user.email).filter(Boolean))];
  if (recipients.length === 0 || !subject || !message) return { sent: 0, failed: 0, skipped: false };

  const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');
  const html = baseTemplate({
    title: subject,
    preview: subject,
    body: `<p style="margin:0;">${safeMessage}</p>`,
    ctaText: 'Open Kiwi Predict',
    ctaUrl: frontendUrl
  });

  const batchSize = Number(process.env.EMAIL_BATCH_SIZE || 50);
  let sent = 0;
  let failed = 0;
  let skipped = false;

  for (let index = 0; index < recipients.length; index += batchSize) {
    const batch = recipients.slice(index, index + batchSize);
    try {
      const result = await sendMail({
        to: process.env.EMAIL_TO_PLACEHOLDER || process.env.SMTP_USER,
        bcc: batch,
        subject,
        html,
        text: message
      });

      if (result?.skipped) {
        skipped = true;
        failed += batch.length;
      } else {
        sent += batch.length;
      }
    } catch (error) {
      failed += batch.length;
    }
  }

  return { sent, failed, skipped, total: recipients.length };
};

module.exports = {
  sendWelcomeEmail,
  sendPredictionNotificationEmail,
  sendBroadcastEmail,
  isEmailConfigured
};