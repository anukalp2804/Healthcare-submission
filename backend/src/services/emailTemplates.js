
const loginOtpTemplate = ({ name, otp }) => {
  return {
    subject: "Your Healthcare Submission Login Code",
    text: `
Hello ${name},

Your login verification code is: ${otp}

This code expires in 5 minutes.

Do not share this code with anyone. Our team will never ask you to disclose it.

If you did not request this code, please ignore this email.

Healthcare Submission
    `.trim(),

    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 24px; color: #333;">
        <h2 style="color: #2563eb;">Healthcare Submission</h2>

        <p>Hello ${escapeHtml(name)},</p>

        <p>Use the following code to verify your login:</p>

        <div style="background: #f1f5f9; padding: 18px; text-align: center; border-radius: 8px;">
          <h1 style="letter-spacing: 8px; color: #1d4ed8; margin: 0;">
            ${escapeHtml(otp)}
          </h1>
        </div>

        <p>This code expires in <strong>5 minutes</strong>.</p>

        <p>Do not share this code with anyone.</p>

        <p>If you did not request this code, please ignore this email.</p>

        <hr style="border: 0; border-top: 1px solid #ddd;">

        <p style="color: #777; font-size: 12px;">
          Healthcare Submission — Secure Appointment Management
        </p>
      </div>
    `,
  };
};

const escapeHtml = (value) => {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
};

module.exports = { loginOtpTemplate };
