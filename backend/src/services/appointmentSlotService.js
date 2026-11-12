
const SLOT_DURATION_MINUTES = 15;
const SLOT_DURATION_MS = SLOT_DURATION_MINUTES * 60 * 1000;

const mongoose = require("mongoose");
const AppointmentSlot = require("../models/AppointmentSlot");
const AppError = require("../utils/AppError");
/**
 * Generate the UTC start times for every 15-minute
 * reservation interval in an appointment.
 */
const generateSlotStartTimes = (startsAt, endsAt) => {
  if (
    !(startsAt instanceof Date) ||
    !(endsAt instanceof Date) ||
    Number.isNaN(startsAt.getTime()) ||
    Number.isNaN(endsAt.getTime())
  ) {
    throw new Error("Valid appointment start and end dates are required.");
  }

  const start = startsAt.getTime();
  const end = endsAt.getTime();
  const duration = end - start;

  if (duration <= 0) {
    throw new Error("Appointment end must be after its start.");
  }

  if (start % SLOT_DURATION_MS !== 0) {
    throw new Error("Appointment must start on a 15-minute boundary.");
  }

  if (duration % SLOT_DURATION_MS !== 0) {
    throw new Error("Appointment duration must be a multiple of 15 minutes.");
  }

  const slots = [];

  for (let current = start; current < end; current += SLOT_DURATION_MS) {
    slots.push(new Date(current));
  }

  return slots;
};


const reserveAppointmentSlots = async ({
  clinicId,
  doctorId,
  appointmentId,
  startsAt,
  endsAt,
  expiresAt = null,
  session,
}) => {
    if (
    !session ||
    typeof session.inTransaction !== "function" ||
    !session.inTransaction()
    ) {
    throw new AppError(
        "An active MongoDB transaction session is required.",
        500
    );
    }

  const ids = [clinicId, doctorId, appointmentId];

  if (!ids.every((id) => mongoose.isValidObjectId(id))) {
    throw new AppError("Invalid reservation reference.", 400);
  }

  if (
    expiresAt !== null &&
    (!(expiresAt instanceof Date) || Number.isNaN(expiresAt.getTime()))
  ) {
    throw new AppError("Invalid reservation expiry date.", 400);
  }

  const slotStartTimes = generateSlotStartTimes(startsAt, endsAt);

  const reservations = slotStartTimes.map((slotStart) => ({
    clinic: clinicId,
    doctor: doctorId,
    appointment: appointmentId,
    startsAt: slotStart,
    expiresAt,
  }));

  try {
    return await AppointmentSlot.insertMany(reservations, {
      session,
      ordered: true,
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError(
        "One or more requested appointment slots are unavailable.",
        409
      );
    }

    throw error;
  }
};

module.exports = {
  SLOT_DURATION_MINUTES,
  generateSlotStartTimes,
  reserveAppointmentSlots,
};
