
const mongoose = require("mongoose");

const Appointment = require("../models/Appointment");
const AppointmentSlot = require("../models/AppointmentSlot");
const AppError = require("../utils/AppError");

/**
 * Expire one pending appointment whose temporary hold has elapsed.
 * The appointment update and slot deletion are atomic.
 */
const expireAppointmentHold = async (appointmentId) => {
  if (!mongoose.isValidObjectId(appointmentId)) {
    throw new AppError("Invalid appointment ID.", 400);
  }

  const session = await mongoose.startSession();

  try {
    let expiryResult = {
      expired: false,
      appointment: null,
      deletedSlots: 0,
    };

    await session.withTransaction(async () => {
      const now = new Date();

      // Step 1: Claim the expired pending appointment.
      const appointment = await Appointment.findOneAndUpdate(
        {
          _id: appointmentId,
          status: "pending",
          holdExpiresAt: { $lte: now },
        },
        {
          $set: {
            status: "expired",
            holdExpiresAt: null,
          },
        },
        {
          new: true,
          runValidators: true,
          session,
        }
      );

      // It may already be confirmed, cancelled, or expired.
      if (!appointment) {
        return;
      }

      // Step 2: Release every slot belonging to this appointment.
      const deletion = await AppointmentSlot.deleteMany(
        {
          appointment: appointment._id,
          clinic: appointment.clinic,
          doctor: appointment.doctor,
        },
        { session }
      );

      expiryResult = {
        expired: true,
        appointment,
        deletedSlots: deletion.deletedCount,
      };
    });

    return expiryResult;
  } finally {
    await session.endSession();
  }
};

module.exports = {
  expireAppointmentHold,
};
