const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema(
  {
    clinic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clinic",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    specialization: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    qualification: {
      type: String,
      trim: true,
      maxlength: 200,
    },

    consultationFee: {
      type: Number,
      required: true,
      min: 0,
    },

    consultationDuration: {
      type: Number,
      required: true,
      min: 5,
      default: 30,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

doctorSchema.index({ clinic: 1, email: 1 }, { unique: true });

const Doctor = mongoose.model("Doctor", doctorSchema);

module.exports = Doctor;