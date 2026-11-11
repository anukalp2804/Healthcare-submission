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

    appointmentDate: {
      type: Date,
      required: true,
    },

    startTime: {
      type: String,
      required: true,
    },

    endTime: {
      type: String,
      required: true,
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

// Prevent two active appointments for the same doctor and time.
appointmentSchema.index(
  {
    doctor: 1,
    appointmentDate: 1,
    startTime: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["pending", "confirmed"] },
    },
  }
);

appointmentSchema.index({
  clinic: 1,
  appointmentDate: 1,
  status: 1,
});

const Appointment = mongoose.model(
  "Appointment",
  appointmentSchema
);

module.exports = Appointment;