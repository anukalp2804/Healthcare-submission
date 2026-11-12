
const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    clinic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clinic",
      required: true,
      index: true,
    },

    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },

    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },

    patientName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    patientPhone: {
      type: String,
      required: true,
      trim: true,
    },

    patientEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },

    // Actual appointment start, stored as a UTC instant.
    startsAt: {
      type: Date,
      required: true,
    },

    // Actual appointment end, stored as a UTC instant.
    endsAt: {
      type: Date,
      required: true,
    },

    // Used for temporary booking holds.
    // Null means the appointment has no active hold expiry.
    holdExpiresAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "cancelled",
        "completed",
        "no_show",
      ],
      default: "pending",
    },

    bookingSource: {
      type: String,
      enum: ["whatsapp", "admin", "clinic_dashboard"],
      default: "whatsapp",
    },
  },
  {
    timestamps: true,
  }
);

// Validate appointment duration and timestamps.
appointmentSchema.pre("validate", function () {
  if (
    this.startsAt instanceof Date &&
    this.endsAt instanceof Date &&
    !Number.isNaN(this.startsAt.getTime()) &&
    !Number.isNaN(this.endsAt.getTime())
  ) {
    const duration =
      this.endsAt.getTime() - this.startsAt.getTime();

    if (duration <= 0) {
      this.invalidate(
        "endsAt",
        "Appointment end must be after its start."
      );
    } else if (duration % (15 * 60 * 1000) !== 0) {
      this.invalidate(
        "endsAt",
        "Appointment duration must be a multiple of 15 minutes."
      );
    }
  }
});

// Efficient clinic and doctor appointment queries.
appointmentSchema.index({
  clinic: 1,
  doctor: 1,
  startsAt: 1,
});

appointmentSchema.index({
  clinic: 1,
  startsAt: 1,
  status: 1,
});

const Appointment = mongoose.model(
  "Appointment",
  appointmentSchema
);

module.exports = Appointment;
