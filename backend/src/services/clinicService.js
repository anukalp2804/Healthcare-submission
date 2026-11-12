const mongoose = require("mongoose");

const Clinic = require("../models/Clinic");
const AppError = require("../utils/AppError");
const { isValidTimezone } = require("../utils/timezone");

const createClinic = async (clinicData) => {
  const {
  name,
  slug,
  contactEmail,
  contactPhone,
  whatsappPhoneNumberId,
  address,
  timezone = "Asia/Kathmandu",
} = clinicData;

if (!isValidTimezone(timezone)) {
  throw new AppError("Invalid clinic timezone.", 400);
}

  if (!name || !slug || !contactEmail || !contactPhone) {
    throw new AppError(
      "Name, slug, contact email, and contact phone are required.",
      400
    );
  }

  const normalizedSlug = slug.toLowerCase().trim();

  const existingClinic = await Clinic.findOne({
    slug: normalizedSlug,
  });

  if (existingClinic) {
    throw new AppError("Clinic slug already exists.", 409);
  }

  const clinic = await Clinic.create({
    name,
    slug: normalizedSlug,
    contactEmail,
    contactPhone,
    whatsappPhoneNumberId,
    address,
    timezone,
  });

  return clinic;
};


const getClinicById = async (clinicId, user) => {
  if (!user || !user.role) {
    throw new AppError("Authentication required.", 401);
  }

  if (!mongoose.isValidObjectId(clinicId)) {
    throw new AppError("Invalid clinic ID.", 400);
  }

  let clinic;

  if (user.role === "platform_admin") {
    clinic = await Clinic.findById(clinicId);
  } else {
    if (
      !user.clinic ||
      !mongoose.isValidObjectId(user.clinic) ||
      user.clinic.toString() !== clinicId.toString()
    ) {
      throw new AppError(
        "You cannot access this clinic.",
        403
      );
    }

    clinic = await Clinic.findById(user.clinic);
  }

  if (!clinic) {
    throw new AppError("Clinic not found.", 404);
  }

  return clinic;
};


const listClinics = async (user) => {
  if (!user || user.role !== "platform_admin") {
    throw new AppError(
      "Only platform administrators can list all clinics.",
      403
    );
  }

  return Clinic.find().sort({ createdAt: -1 });
};

module.exports = {
  createClinic,
  getClinicById,
  listClinics,
};
