
const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const Appointment = require("../src/models/Appointment");
const AppointmentSlot = require("../src/models/AppointmentSlot");

const {
  expireAppointmentHold,
} = require("../src/services/appointmentExpiryService");

const appointmentId = new mongoose.Types.ObjectId();
const clinicId = new mongoose.Types.ObjectId();
const doctorId = new mongoose.Types.ObjectId();

test("should expire a pending appointment and release its slots", async () => {
  const originals = {
    startSession: mongoose.startSession,
    findOneAndUpdate: Appointment.findOneAndUpdate,
    deleteMany: AppointmentSlot.deleteMany,
  };

  const fakeSession = {
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  };

  let deletionFilter;
  let deletionOptions;

  try {
    mongoose.startSession = async () => fakeSession;

    Appointment.findOneAndUpdate = async (filter, update, options) => {
      assert.equal(filter.status, "pending");
      assert.ok(filter.holdExpiresAt.$lte instanceof Date);
      assert.equal(update.$set.status, "expired");
      assert.equal(update.$set.holdExpiresAt, null);
      assert.equal(options.session, fakeSession);

      return {
        _id: appointmentId,
        clinic: clinicId,
        doctor: doctorId,
        status: "expired",
        holdExpiresAt: null,
      };
    };

    AppointmentSlot.deleteMany = async (filter, options) => {
      deletionFilter = filter;
      deletionOptions = options;

      return { deletedCount: 2 };
    };

    const result = await expireAppointmentHold(appointmentId);

    assert.equal(result.expired, true);
    assert.equal(result.deletedSlots, 2);
    assert.equal(result.appointment.status, "expired");

    assert.equal(
      deletionFilter.appointment.toString(),
      appointmentId.toString()
    );

    assert.equal(deletionOptions.session, fakeSession);
  } finally {
    mongoose.startSession = originals.startSession;
    Appointment.findOneAndUpdate = originals.findOneAndUpdate;
    AppointmentSlot.deleteMany = originals.deleteMany;
  }
});

test("should not expire an already confirmed appointment", async () => {
  const originalStartSession = mongoose.startSession;
  const originalFindOneAndUpdate = Appointment.findOneAndUpdate;
  const originalDeleteMany = AppointmentSlot.deleteMany;

  const fakeSession = {
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  };

  try {
    mongoose.startSession = async () => fakeSession;

    Appointment.findOneAndUpdate = async (filter) => {
      assert.equal(filter.status, "pending");

      // Confirmed appointments cannot match this query.
      return null;
    };

    AppointmentSlot.deleteMany = async () => {
      assert.fail("Slots must not be deleted for a confirmed appointment");
    };

    const result = await expireAppointmentHold(appointmentId);

    assert.equal(result.expired, false);
    assert.equal(result.appointment, null);
    assert.equal(result.deletedSlots, 0);
  } finally {
    mongoose.startSession = originalStartSession;
    Appointment.findOneAndUpdate = originalFindOneAndUpdate;
    AppointmentSlot.deleteMany = originalDeleteMany;
  }
});

test("should not expire an appointment whose hold is still active", async () => {
  const originalStartSession = mongoose.startSession;
  const originalFindOneAndUpdate = Appointment.findOneAndUpdate;
  const originalDeleteMany = AppointmentSlot.deleteMany;

  const fakeSession = {
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  };

  try {
    mongoose.startSession = async () => fakeSession;

    Appointment.findOneAndUpdate = async (filter) => {
      assert.equal(filter.status, "pending");
      assert.ok(filter.holdExpiresAt.$lte instanceof Date);

      // The appointment's hold has not expired.
      return null;
    };

    AppointmentSlot.deleteMany = async () => {
      assert.fail("Active appointment slots must not be deleted");
    };

    const result = await expireAppointmentHold(appointmentId);

    assert.equal(result.expired, false);
    assert.equal(result.appointment, null);
    assert.equal(result.deletedSlots, 0);
  } finally {
    mongoose.startSession = originalStartSession;
    Appointment.findOneAndUpdate = originalFindOneAndUpdate;
    AppointmentSlot.deleteMany = originalDeleteMany;
  }
});