
const mongoose = require("mongoose");

const appointmentSlotSchema = new mongoose.Schema(
  {
    clinic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clinic",
      required: true,
    },

    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },

    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
    },

    startsAt: {
      type: Date,
      required: true,
    },

    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// One doctor cannot have two reservations
// for the same 15-minute interval.

// A doctor can have only one reservation per 15-minute interval.
appointmentSlotSchema.index(
  {
    doctor: 1,
    startsAt: 1,
  },
  {
    unique: true,
  }
);

// Efficient clinic-specific reservation queries.
appointmentSlotSchema.index({
  clinic: 1,
  doctor: 1,
  startsAt: 1,
});

// Find all reservations belonging to an appointment.
appointmentSlotSchema.index({
  appointment: 1,
});


const AppointmentSlot = mongoose.model(
  "AppointmentSlot",
  appointmentSlotSchema
);

module.exports = AppointmentSlot;
