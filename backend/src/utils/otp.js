
const crypto = require("crypto");

const generateOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

const hashOtp = (otp, userId) => {
  if (!process.env.LOGIN_OTP_SECRET) {
    throw new Error("LOGIN_OTP_SECRET is not configured.");
  }

  return crypto
    .createHmac("sha256", process.env.LOGIN_OTP_SECRET)
    .update(`${userId}:${otp}`)
    .digest("hex");
};

const verifyOtp = (otp, storedHash, userId) => {
  if (
    typeof otp !== "string" ||
    typeof storedHash !== "string" ||
    !/^\d{6}$/.test(otp) ||
    !/^[a-f0-9]{64}$/i.test(storedHash)
  ) {
    return false;
  }

  const submittedHash = hashOtp(otp, userId);

  return crypto.timingSafeEqual(
    Buffer.from(submittedHash, "hex"),
    Buffer.from(storedHash, "hex")
  );
};

module.exports = {
  generateOtp,
  hashOtp,
  verifyOtp,
};
