
const User = require("../models/User");
const LoginOtp = require("../models/LoginOtp");
const { comparePassword } = require("../utils/password");
const { generateOtp, hashOtp } = require("../utils/otp");
const { sendLoginOtpEmail } = require("./emailService");
const AppError = require("../utils/AppError");

const requestLoginOtp = async ({ email, password }) => {
  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";

  if (!normalizedEmail || typeof password !== "string") {
    throw new AppError("Invalid email or password.", 401);
  }

  const user = await User.findOne({
    email: normalizedEmail,
    isActive: true,
  }).select("+passwordHash");

  if (!user || !(await comparePassword(password, user.passwordHash))) {
    throw new AppError("Invalid email or password.", 401);
  }

  if (!user.emailVerified) {
    throw new AppError("Please verify your email before logging in.", 403);
  }

  const otp = generateOtp();
  const otpHash = hashOtp(otp, user._id.toString());
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  // Invalidate any previous unused OTPs for this user.
  await LoginOtp.updateMany(
    { user: user._id, consumedAt: null },
    { $set: { consumedAt: new Date() } }
  );

  const loginOtp = await LoginOtp.create({
    user: user._id,
    otpHash,
    expiresAt,
    attempts: 0,
  });

  try {
    await sendLoginOtpEmail({
      to: user.email,
      name: user.name,
      otp,
    });
  } catch (error) {
    // Do not leave a usable OTP if email delivery fails.
    await LoginOtp.updateOne(
      { _id: loginOtp._id },
      { $set: { consumedAt: new Date() } }
    );

    throw new AppError("Unable to send the login verification code.", 503);
  }

  //made change in it
//   return {
//     message: "If your account is eligible, a verification code has been sent.",
//   };

return {
  message: "Verification code sent.",
  challengeId: loginOtp._id.toString(),
};
};

// verifyLoginOtp verifies the otp for the given userId and otp. or second half


const verifyLoginOtp = async ({ challengeId, otp }) => {
  if (
    typeof challengeId !== "string" ||
    !/^[a-f\d]{24}$/i.test(challengeId) ||
    typeof otp !== "string" ||
    !/^\d{6}$/.test(otp)
  ) {
    throw new AppError("Invalid or expired verification code.", 401);
  }

  const now = new Date();

  const loginOtp = await LoginOtp.findOneAndUpdate(
    {
      _id: challengeId,
      consumedAt: null,
      expiresAt: { $gt: now },
      attempts: { $lt: 5 },
    },
    {
      $inc: { attempts: 1 },
    },
    { new: true }
  ).select("+otpHash");

  if (!loginOtp) {
    throw new AppError("Invalid or expired verification code.", 401);
  }

  const userId = loginOtp.user.toString();

  const { verifyOtp } = require("../utils/otp");

  const isValid = verifyOtp(
    otp,
    loginOtp.otpHash,
    userId
  );

  if (!isValid) {
    if (loginOtp.attempts >= 5) {
      await LoginOtp.updateOne(
        { _id: loginOtp._id, consumedAt: null },
        { $set: { consumedAt: new Date() } }
      );
    }

    throw new AppError("Invalid or expired verification code.", 401);
  }

  const consumed = await LoginOtp.updateOne(
    {
      _id: loginOtp._id,
      consumedAt: null,
      attempts: loginOtp.attempts,
      expiresAt: { $gt: new Date() },
    },
    {
      $set: { consumedAt: new Date() },
    }
  );

  if (consumed.modifiedCount !== 1) {
    throw new AppError("Invalid or expired verification code.", 401);
  }

  const user = await User.findOne({
    _id: userId,
    isActive: true,
    emailVerified: true,
  }).select("name email role clinic doctor");

  if (!user) {
    throw new AppError("Account is unavailable.", 403);
  }

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      clinic: user.clinic,
      doctor: user.doctor,
    },
  };
};


module.exports = {
  requestLoginOtp,
  verifyLoginOtp,
};
