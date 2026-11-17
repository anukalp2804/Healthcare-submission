const mongoose = require("mongoose");

const doctorAvailabilitySchema = new mongoose.Schema(
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

    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
    },

    startTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },

    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },

    slotDurationMinutes: {
      type: Number,
      required: true,
      min: 5,
      default: 30,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

doctorAvailabilitySchema.index({
  clinic: 1,
  doctor: 1,
  dayOfWeek: 1,
});

doctorAvailabilitySchema.pre("validate", function () {
  const startMinutes =
    Number(this.startTime?.slice(0, 2)) * 60 +
    Number(this.startTime?.slice(3, 5));

  const endMinutes =
    Number(this.endTime?.slice(0, 2)) * 60 +
    Number(this.endTime?.slice(3, 5));

  if (endMinutes <= startMinutes) {
    this.invalidate(
      "endTime",
      "End time must be later than start time."
    );
    return;
  }

  const workingMinutes = endMinutes - startMinutes;

  if (
    workingMinutes % this.slotDurationMinutes !== 0
  ) {
    this.invalidate(
      "slotDurationMinutes",
      "Working hours must be divisible by the slot duration."
    );
  }
});

const DoctorAvailability = mongoose.model(
  "DoctorAvailability",
  doctorAvailabilitySchema
);

module.exports = DoctorAvailability;