
const mongoose = require("mongoose");
const Doctor = require("../models/Doctor");
const Clinic = require("../models/Clinic");
const AppError = require("../utils/AppError");

const createDoctor = async (doctorData, user) => {
  if (!user || user.role !== "platform_admin") {
    throw new AppError(
      "Only platform administrators can register doctors.",
      403
    );
  }

  const {
    clinicId,
    name,
    email,
    phone,
    specialization,
    qualification,
    consultationFee,
    consultationDuration,
  } = doctorData;

  if (
    !clinicId ||
    !mongoose.isValidObjectId(clinicId) ||
    !name ||
    !email ||
    !phone ||
    !specialization ||
    consultationFee === undefined
  ) {
    throw new AppError("Invalid or incomplete doctor details.", 400);
  }

  const clinic = await Clinic.findById(clinicId);

  if (!clinic || clinic.status !== "active") {
    throw new AppError("Active clinic not found.", 404);
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existingDoctor = await Doctor.findOne({
    clinic: clinicId,
    email: normalizedEmail,
  });

  if (existingDoctor) {
    throw new AppError(
      "Doctor email already exists in this clinic.",
      409
    );
  }

  const doctor = await Doctor.create({
    clinic: clinicId,
    name,
    email: normalizedEmail,
    phone,
    specialization,
    qualification,
    consultationFee,
    consultationDuration,
  });

  return doctor;
};

const getDoctorById = async (doctorId, user) => {
  if (!user || !user.role) {
    throw new AppError("Authentication required.", 401);
  }

  if (!mongoose.isValidObjectId(doctorId)) {
    throw new AppError("Invalid doctor ID.", 400);
  }

  const query = { _id: doctorId };

  if (user.role !== "platform_admin") {
    if (!user.clinic || !mongoose.isValidObjectId(user.clinic)) {
      throw new AppError("Valid clinic access is required.", 403);
    }

    query.clinic = user.clinic;
  }

  if (user.role === "doctor") {
    if (!user.doctor || !mongoose.isValidObjectId(user.doctor)) {
      throw new AppError("Doctor access is required.", 403);
    }

    query._id = user.doctor;
  }

  const doctor = await Doctor.findOne(query);

  if (!doctor) {
    throw new AppError("Doctor not found.", 404);
  }

  return doctor;
};

const listDoctorsByClinic = async (clinicId, user) => {
  if (!user || !user.role) {
    throw new AppError("Authentication required.", 401);
  }

  if (!mongoose.isValidObjectId(clinicId)) {
    throw new AppError("Invalid clinic ID.", 400);
  }

  if (user.role !== "platform_admin") {
    if (
      !user.clinic ||
      !mongoose.isValidObjectId(user.clinic) ||
      user.clinic.toString() !== clinicId
    ) {
      throw new AppError("You cannot access this clinic.", 403);
    }
  }

  return Doctor.find({ clinic: clinicId }).sort({ createdAt: -1 });
};

module.exports = {
  createDoctor,
  getDoctorById,
  listDoctorsByClinic,
};
