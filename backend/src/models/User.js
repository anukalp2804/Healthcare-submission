
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: [
        "platform_admin",
        "clinic_admin",
        "receptionist",
        "doctor",
      ],
      required: true,
    },

    clinic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clinic",
      default: null,
    },

    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Validate account relationships based on the assigned role.
userSchema.pre("validate", function () {
  if (this.role === "platform_admin") {
    if (this.clinic || this.doctor) {
      this.invalidate(
        "clinic",
        "Platform administrators cannot belong to a clinic or doctor profile."
      );
    }
  }

  if (["clinic_admin", "receptionist"].includes(this.role)) {
    if (!this.clinic) {
      this.invalidate(
        "clinic",
        "Clinic users must be associated with a clinic."
      );
    }

    if (this.doctor) {
      this.invalidate(
        "doctor",
        "Clinic administrators and receptionists cannot have a doctor profile."
      );
    }
  }

  if (this.role === "doctor") {
    if (!this.clinic || !this.doctor) {
      this.invalidate(
        "doctor",
        "Doctor accounts require both clinic and doctor references."
      );
    }
  }
});

const User = mongoose.model("User", userSchema);

module.exports = User;
