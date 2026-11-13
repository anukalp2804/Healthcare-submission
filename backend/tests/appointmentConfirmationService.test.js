const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const Appointment = require("../src/models/Appointment");
const AppointmentSlot = require("../src/models/AppointmentSlot");

const {
  confirmAppointment,
} = require("../src/services/appointmentConfirmationService");

const appointmentId = new mongoose.Types.ObjectId();
const clinicId = new mongoose.Types.ObjectId();
const doctorId = new mongoose.Types.ObjectId();

const appointment = {
  _id: appointmentId,
  clinic: clinicId,
  doctor: doctorId,
  startsAt: new Date("2027-01-01T12:00:00.000Z"),
  endsAt: new Date("2027-01-01T12:30:00.000Z"),
};

test("should reject confirmation when the appointment hold has expired", async () => {
  const originalStartSession = mongoose.startSession;
  const originalFindOneAndUpdate = Appointment.findOneAndUpdate;

  const fakeSession = {
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  };

  try {
    mongoose.startSession = async () => fakeSession;

    Appointment.findOneAndUpdate = (filter) => {
      assert.equal(filter.status, "pending");
      assert.ok(filter.holdExpiresAt.$gt instanceof Date);

      // Simulate an expired hold: no pending appointment matches.
      return Promise.resolve(null);
    };

    await assert.rejects(
      () => confirmAppointment(appointmentId),
      (error) => {
        assert.equal(error.statusCode, 409);
        assert.match(error.message, /hold expired/);
        return true;
      }
    );
  } finally {
    mongoose.startSession = originalStartSession;
    Appointment.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test("should reject confirmation when appointment slots are incomplete", async () => {
  const originals = {
    startSession: mongoose.startSession,
    findOneAndUpdate: Appointment.findOneAndUpdate,
    find: AppointmentSlot.find,
  };

  const fakeSession = {
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  };

  try {
    mongoose.startSession = async () => fakeSession;

    Appointment.findOneAndUpdate = async () => ({
  ...appointment,
  status: "confirmed",
  holdExpiresAt: null,
});

    AppointmentSlot.find = () => ({
      session: async () => [
        { startsAt: appointment.startsAt },
      ],
    });

    await assert.rejects(
      () => confirmAppointment(appointmentId),
      (error) => {
        assert.equal(error.statusCode, 409);
        assert.match(error.message, /incomplete or expired/);
        return true;
      }
    );
  } finally {
    mongoose.startSession = originals.startSession;
    Appointment.findOneAndUpdate = originals.findOneAndUpdate;
    AppointmentSlot.find = originals.find;
  }
});

test("should reject confirmation when not all slots are updated", async () => {
  const originals = {
    startSession: mongoose.startSession,
    findOneAndUpdate: Appointment.findOneAndUpdate,
    find: AppointmentSlot.find,
    updateMany: AppointmentSlot.updateMany,
  };

  const fakeSession = {
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  };

  try {
    mongoose.startSession = async () => fakeSession;

    Appointment.findOneAndUpdate = async () => ({
      ...appointment,
      status: "confirmed",
      holdExpiresAt: null,
    });

    AppointmentSlot.find = () => ({
      session: async () => [
        { startsAt: appointment.startsAt },
        { startsAt: new Date("2027-01-01T12:15:00.000Z") },
      ],
    });

    AppointmentSlot.updateMany = async () => ({
      modifiedCount: 1,
    });

    await assert.rejects(
      () => confirmAppointment(appointmentId),
      (error) => {
        assert.equal(error.statusCode, 409);
        assert.match(error.message, /Unable to confirm all/);
        return true;
      }
    );
  } finally {
    mongoose.startSession = originals.startSession;
    Appointment.findOneAndUpdate = originals.findOneAndUpdate;
    AppointmentSlot.find = originals.find;
    AppointmentSlot.updateMany = originals.updateMany;
  }
});

test("should reject an appointment that has already been confirmed", async () => {
  const originalStartSession = mongoose.startSession;
  const originalFindOneAndUpdate = Appointment.findOneAndUpdate;

  const fakeSession = {
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  };

  try {
    mongoose.startSession = async () => fakeSession;

    Appointment.findOneAndUpdate = async (filter) => {
      assert.equal(filter.status, "pending");

      // Already confirmed: no pending appointment matches.
      return null;
    };

    await assert.rejects(
      () => confirmAppointment(appointmentId),
      (error) => {
        assert.equal(error.statusCode, 409);
        assert.match(error.message, /already processed/);
        return true;
      }
    );
  } finally {
    mongoose.startSession = originalStartSession;
    Appointment.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test("should reject invalid appointment IDs", async () => {
  const originalStartSession = mongoose.startSession;

  try {
    mongoose.startSession = async () => {
      assert.fail("Database session should not start for an invalid ID");
    };

    await assert.rejects(
      () => confirmAppointment("invalid-appointment-id"),
      (error) => {
        assert.equal(error.statusCode, 400);
        assert.match(error.message, /Invalid appointment ID/);
        return true;
      }
    );
  } finally {
    mongoose.startSession = originalStartSession;
  }
});