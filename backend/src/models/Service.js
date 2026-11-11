const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
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

    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    doctors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Doctor",
      },
    ],

    consultationFee: {
      type: Number,
      min: 0,
    },

    durationMinutes: {
      type: Number,
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

serviceSchema.index({ clinic: 1, name: 1 }, { unique: true });

const Service = mongoose.model("Service", serviceSchema);

module.exports = Service;