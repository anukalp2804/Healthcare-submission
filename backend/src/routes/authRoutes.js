
const express = require("express");

const {
  loginRequestLimiter,
  otpVerificationLimiter,
} = require("../middleware/authRateLimiter");

const {
  requestLoginOtp,
  verifyLoginOtp,
} = require("../services/authService");

const router = express.Router();

// Request login OTP
router.post("/request-otp", loginRequestLimiter, async (req, res, next) => {
  try {
    const result = await requestLoginOtp({
      email: req.body.email,
      password: req.body.password,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return next(error);
  }
});

// Verify login OTP

router.post("/verify-otp", otpVerificationLimiter, async (req, res, next) => {
  try {
    const result = await verifyLoginOtp({
      challengeId: req.body.challengeId,
      otp: req.body.otp,
    });

    // Regenerate the session to prevent session fixation.
    req.session.regenerate((error) => {
      if (error) {
        return next(error);
      }

      req.session.user = {
        id: result.user.id,
        role: result.user.role,
        clinic: result.user.clinic,
        doctor: result.user.doctor,
      };

      // Save the new session before responding.
      req.session.save((saveError) => {
        if (saveError) {
          return next(saveError);
        }

        return res.status(200).json({
          success: true,
          message: "Login successful.",
          data: {
            user: result.user,
          },
        });
      });
    });
  } catch (error) {
    return next(error);
  }
});


// Logout
router.post("/logout", (req, res, next) => {
  if (!req.session) {
    return res.status(200).json({
      success: true,
      message: "Already logged out.",
    });
  }

  req.session.destroy((error) => {
    if (error) {
      return next(error);
    }

    res.clearCookie("healthcare.sid", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  });
});


module.exports = router;
