const mongoose = require("mongoose");

const fieldSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      match: /^[a-zA-Z][a-zA-Z0-9_]*$/,
    },

    type: {
      type: String,
      enum: ["text", "number", "date", "select", "textarea", "checkbox"],
      required: true,
    },

    required: {
      type: Boolean,
      default: false,
    },

    options: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const registrationFormSchema = new mongoose.Schema(
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

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    fields: {
      type: [fieldSchema],
      validate: {
        validator: (fields) => {
          const names = fields.map((field) => field.name);
          return names.length === new Set(names).size;
        },
        message: "Registration field names must be unique.",
      },
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

const RegistrationForm = mongoose.model(
  "RegistrationForm",
  registrationFormSchema
);

module.exports = RegistrationForm;