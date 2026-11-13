
const mongoose = require("mongoose");

const Appointment = require("../models/Appointment");
const AppointmentSlot = require("../models/AppointmentSlot");
const AppError = require("../utils/AppError");

const SLOT_DURATION_MINUTES = 15;

const confirmAppointment = async (appointmentId) => {
  if (!mongoose.isValidObjectId(appointmentId)) {
    throw new AppError("Invalid appointment ID.", 400);
  }

  const session = await mongoose.startSession();

  try {
    let confirmedAppointment;

    await session.withTransaction(async () => {
      const now = new Date();

      // Step 1: Atomically claim the pending appointment.
      const appointment = await Appointment.findOneAndUpdate(
        {
          _id: appointmentId,
          status: "pending",
          holdExpiresAt: { $gt: now },
        },
        {
          $set: {
            status: "confirmed",
            holdExpiresAt: null,
          },
        },
        {
          new: true,
          runValidators: true,
          session,
        }
      );

      if (!appointment) {
        throw new AppError(
          "Appointment not found, already processed, or hold expired.",
          409
        );
      }

      // Step 2: Calculate the number of required slots.
      const durationMinutes =
        (appointment.endsAt.getTime() -
          appointment.startsAt.getTime()) /
        (60 * 1000);

      if (
        !Number.isInteger(durationMinutes) ||
        durationMinutes <= 0 ||
        durationMinutes % SLOT_DURATION_MINUTES !== 0
      ) {
        throw new AppError(
          "Appointment has an invalid duration.",
          409
        );
      }

      const expectedSlotCount =
        durationMinutes / SLOT_DURATION_MINUTES;

      // Step 3: Verify every temporary slot exists.
      const slots = await AppointmentSlot.find({
        appointment: appointment._id,
        clinic: appointment.clinic,
        doctor: appointment.doctor,
        expiresAt: { $gt: now },
      }).session(session);

      if (slots.length !== expectedSlotCount) {
        throw new AppError(
          "Appointment slot reservation is incomplete or expired.",
          409
        );
      }

      // Step 4: Convert temporary reservations into permanent ones.
      const slotUpdate = await AppointmentSlot.updateMany(
        {
          appointment: appointment._id,
          clinic: appointment.clinic,
          doctor: appointment.doctor,
          expiresAt: { $gt: now },
        },
        {
          $set: { expiresAt: null },
        },
        { session }
      );

      if (slotUpdate.modifiedCount !== expectedSlotCount) {
        throw new AppError(
          "Unable to confirm all reserved appointment slots.",
          409
        );
      }

      confirmedAppointment = appointment;
    });

    if (!confirmedAppointment) {
      throw new AppError(
        "Appointment confirmation failed.",
        409
      );
    }

    return confirmedAppointment;
  } finally {
    await session.endSession();
  }
};

module.exports = { confirmAppointment };
