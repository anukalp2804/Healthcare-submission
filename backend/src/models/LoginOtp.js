
const mongoose = require("mongoose");

const loginOtpSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    otpHash: {
      type: String,
      required: true,
      select: false,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    consumedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// MongoDB automatically removes expired OTP records.
// Expiration must also be checked explicitly during verification.
loginOtpSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

const LoginOtp = mongoose.model("LoginOtp", loginOtpSchema);

module.exports = LoginOtp;
