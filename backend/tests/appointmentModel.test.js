
const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const Appointment = require("../src/models/Appointment");

const createAppointment = (overrides = {}) => {
  return new Appointment({
    clinic: new mongoose.Types.ObjectId(),
    doctor: new mongoose.Types.ObjectId(),
    service: new mongoose.Types.ObjectId(),
    patientName: "Test Patient",
    patientPhone: "+9779800000000",
    startsAt: new Date("2026-11-12T12:00:00.000Z"),
    endsAt: new Date("2026-11-12T12:30:00.000Z"),
    bookingSource: "whatsapp",
    ...overrides,
  });
};

test("should accept a valid 30-minute appointment", async () => {
  const appointment = createAppointment();

  await assert.doesNotReject(() => appointment.validate());
});

test("should reject an appointment ending before it starts", async () => {
  const appointment = createAppointment({
    endsAt: new Date("2026-11-12T11:45:00.000Z"),
  });

  await assert.rejects(
    () => appointment.validate(),
    /Appointment end must be after its start/
  );
});

test("should reject a duration not divisible by 15 minutes", async () => {
  const appointment = createAppointment({
    endsAt: new Date("2026-11-12T12:20:00.000Z"),
  });

  await assert.rejects(
    () => appointment.validate(),
    /duration must be a multiple of 15 minutes/
  );
});

test("should accept a valid 45-minute appointment", async () => {
  const appointment = createAppointment({
    endsAt: new Date("2026-11-12T12:45:00.000Z"),
  });

  await assert.doesNotReject(() => appointment.validate());
});

test("should accept expired appointment status", async () => {
  const appointment = new Appointment({
    clinic: new mongoose.Types.ObjectId(),
    doctor: new mongoose.Types.ObjectId(),
    service: new mongoose.Types.ObjectId(),
    patientName: "Test Patient",
    patientPhone: "+9779800000000",
    startsAt: new Date("2027-01-01T12:00:00.000Z"),
    endsAt: new Date("2027-01-01T12:30:00.000Z"),
    status: "expired",
  });

  await assert.doesNotReject(() => appointment.validate());
});
