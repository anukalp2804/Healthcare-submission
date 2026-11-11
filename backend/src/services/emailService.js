
const nodemailer = require("nodemailer");
const { loginOtpTemplate } = require("./emailTemplates");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async ({ to, subject, text, html }) => {
  if (!to || !subject || (!text && !html)) {
    throw new Error("Recipient, subject, and email content are required.");
  }

  const info = await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
    to,
    subject,
    text,
    html,
  });

  return {
    messageId: info.messageId,
    accepted: info.accepted,
  };
};

const sendLoginOtpEmail = async ({ to, name, otp }) => {
  if (!name || !/^\d{6}$/.test(otp)) {
    throw new Error("Valid name and six-digit OTP are required.");
  }

  const email = loginOtpTemplate({ name, otp });

  return sendEmail({
    to,
    ...email,
  });
};

const verifyEmailConnection = async () => {
  return transporter.verify();
};

module.exports = {
  sendEmail,
  sendLoginOtpEmail,
  verifyEmailConnection,
};
