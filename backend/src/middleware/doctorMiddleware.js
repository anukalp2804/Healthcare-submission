
const mongoose = require("mongoose");
const AppError = require("../utils/AppError");

const requireDoctorAccess = (req, res, next) => {
  if (!req.user) {
    return next(
      new AppError("Authentication required.", 401)
    );
  }

  if (req.user.role === "platform_admin") {
    return next();
  }

  if (req.user.role !== "doctor") {
    return next(
      new AppError("Doctor role is required.", 403)
    );
  }

  if (
    !req.user.clinic ||
    !mongoose.isValidObjectId(req.user.clinic)
  ) {
    return next(
      new AppError("Valid clinic access is required.", 403)
    );
  }

  if (
    !req.user.doctor ||
    !mongoose.isValidObjectId(req.user.doctor)
  ) {
    return next(
      new AppError("Doctor access is required.", 403)
    );
  }

  req.clinicId = req.user.clinic.toString();
  req.doctorId = req.user.doctor.toString();

  next();
};

module.exports = { requireDoctorAccess };
