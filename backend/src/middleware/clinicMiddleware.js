
const mongoose = require("mongoose");
const AppError = require("../utils/AppError");

const requireClinicAccess = (req, res, next) => {
  if (!req.user) {
    return next(new AppError("Authentication required.", 401));
  }

  // Platform administrators can access all clinics.
  if (req.user.role === "platform_admin") {
    return next();
  }

  // Other roles must belong to a valid clinic.
  if (
    !req.user.clinic ||
    !mongoose.isValidObjectId(req.user.clinic)
  ) {
    return next(
      new AppError("Valid clinic access is required.", 403)
    );
  }

  // Store the authenticated clinic ID.
  // Never trust a clinic ID supplied by the frontend.
  req.clinicId = req.user.clinic.toString();

  next();
};

module.exports = { requireClinicAccess };
