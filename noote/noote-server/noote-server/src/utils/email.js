const nodemailer = require("nodemailer");

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

// Sends a real email if SMTP_* env vars are set. Otherwise, logs the content
// to the server console — handy for local testing without a mail provider,
// but do configure SMTP before letting real users request password resets.
async function sendEmail({ to, subject, text }) {
  const t = getTransporter();
  if (!t) {
    console.log(`\n[email not configured — would have sent]\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
    return { delivered: false };
  }
  await t.sendMail({ from: process.env.SMTP_FROM || `Noote <no-reply@noote.app>`, to, subject, text });
  return { delivered: true };
}

module.exports = { sendEmail };
