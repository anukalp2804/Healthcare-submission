
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


const BATCH_SIZE = 50;

/**
 * Find and process expired appointment holds in batches.
 */
const processExpiredAppointmentHolds = async ({
  batchSize = BATCH_SIZE,
} = {}) => {
  if (
    !Number.isInteger(batchSize) ||
    batchSize < 1 ||
    batchSize > 500
  ) {
    throw new AppError(
      "Batch size must be an integer between 1 and 500.",
      400
    );
  }

  const now = new Date();

  const expiredAppointments = await Appointment.find({
    status: "pending",
    holdExpiresAt: { $lte: now },
  })
    .select("_id")
    .sort({ holdExpiresAt: 1, _id: 1 })
    .limit(batchSize)
    .lean();

  const results = {
    scanned: expiredAppointments.length,
    expired: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  for (const appointment of expiredAppointments) {
    try {
      const result = await module.exports.expireAppointmentHold(appointment._id);

      if (result.expired) {
        results.expired += 1;
      } else {
        results.skipped += 1;
      }
    } catch (error) {
      results.failed += 1;

      // Do not expose patient information in error records.
      results.errors.push({
        appointmentId: appointment._id.toString(),
        message: error.message,
      });
    }
  }

  return results;
};


module.exports = {
  expireAppointmentHold,
  processExpiredAppointmentHolds,
  BATCH_SIZE,
};
