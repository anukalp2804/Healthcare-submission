const mongoose = require("mongoose");

const patientConversationSchema = new mongoose.Schema(
  {
    clinic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clinic",
      required: true,
      index: true,
    },

    patientPhone: {
      type: String,
      required: true,
      trim: true,
    },

    preferredLanguage: {
      type: String,
      enum: ["en", "ne", "hi", "bho"],
      default: null,
    },

    conversationState: {
      type: String,
      enum: [
        "SELECT_LANGUAGE",
        "SELECT_SERVICE",
        "SELECT_DOCTOR",
        "SELECT_DATE",
        "SELECT_TIME",
        "COLLECT_REGISTRATION",
        "REVIEW_BOOKING",
        "COMPLETED",
      ],
      default: "SELECT_LANGUAGE",
    },

    selectedService: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      default: null,
    },

    selectedDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      default: null,
    },

    selectedDate: {
      type: Date,
      default: null,
    },

    selectedStartTime: {
      type: String,
      default: null,
    },

    lastInteractionAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// A patient's conversation is unique within each clinic.
patientConversationSchema.index(
  { clinic: 1, patientPhone: 1 },
  { unique: true }
);

const PatientConversation = mongoose.model(
  "PatientConversation",
  patientConversationSchema
);

module.exports = PatientConversation;