const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const DoctorAvailability = require("../src/models/DoctorAvailability");

const createAvailability = (overrides = {}) =>
  new DoctorAvailability({
    clinic: new mongoose.Types.ObjectId(),
    doctor: new mongoose.Types.ObjectId(),
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "17:00",
    slotDurationMinutes: 30,
    ...overrides,
  });

test("should accept a valid doctor schedule", async () => {
  const availability = createAvailability();

  try {
    await availability.validate();
    console.log("Valid schedule accepted.");
  } catch (error) {
    console.log("Validation error:", error);
    throw error;
  }
});

test("should reject when end time is earlier than start time", async () => {
  const availability = createAvailability({
    startTime: "17:00",
    endTime: "09:00",
  });

  await assert.rejects(availability.validate());
});

test("should reject when start and end times are equal", async () => {
  const availability = createAvailability({
    startTime: "09:00",
    endTime: "09:00",
  });

  await assert.rejects(availability.validate());
});

test("should reject working hours not divisible by slot duration", async () => {
  const availability = createAvailability({
    startTime: "09:00",
    endTime: "17:10",
    slotDurationMinutes: 30,
  });

  await assert.rejects(availability.validate());
});

test("should accept working hours divisible by slot duration", async () => {
  const availability = createAvailability({
    startTime: "09:00",
    endTime: "17:15",
    slotDurationMinutes: 15,
  });

  await assert.doesNotReject(availability.validate());
});