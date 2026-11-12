
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  SLOT_DURATION_MINUTES,
  generateSlotStartTimes,
} = require("../src/services/appointmentSlotService");

test("should use 15-minute reservation intervals", () => {
  assert.equal(SLOT_DURATION_MINUTES, 15);
});

test("should generate two slots for a 30-minute appointment", () => {
  const slots = generateSlotStartTimes(
    new Date("2026-11-12T12:00:00.000Z"),
    new Date("2026-11-12T12:30:00.000Z")
  );

  assert.deepEqual(
    slots.map((slot) => slot.toISOString()),
    [
      "2026-11-12T12:00:00.000Z",
      "2026-11-12T12:15:00.000Z",
    ]
  );
});

test("should generate three slots for a 45-minute appointment", () => {
  const slots = generateSlotStartTimes(
    new Date("2026-11-12T12:00:00.000Z"),
    new Date("2026-11-12T12:45:00.000Z")
  );

  assert.equal(slots.length, 3);
});

test("should reject appointments not starting on a 15-minute boundary", () => {
  assert.throws(
    () =>
      generateSlotStartTimes(
        new Date("2026-11-12T12:05:00.000Z"),
        new Date("2026-11-12T12:35:00.000Z")
      ),
    /15-minute boundary/
  );
});

test("should reject invalid appointment durations", () => {
  assert.throws(
    () =>
      generateSlotStartTimes(
        new Date("2026-11-12T12:00:00.000Z"),
        new Date("2026-11-12T12:20:00.000Z")
      ),
    /multiple of 15 minutes/
  );
});

test("should reject an end time before the start time", () => {
  assert.throws(
    () =>
      generateSlotStartTimes(
        new Date("2026-11-12T12:30:00.000Z"),
        new Date("2026-11-12T12:00:00.000Z")
      ),
    /end must be after/
  );
});


const mongoose = require("mongoose");
const AppointmentSlot = require("../src/models/AppointmentSlot");
const {
  reserveAppointmentSlots,
} = require("../src/services/appointmentSlotService");

const clinicId = new mongoose.Types.ObjectId();
const doctorId = new mongoose.Types.ObjectId();
const appointmentId = new mongoose.Types.ObjectId();

const activeSession = {
  inTransaction: () => true,
};

test("should reserve all required appointment slots", async () => {
  const originalInsertMany = AppointmentSlot.insertMany;

  try {
    let savedReservations = [];
    let savedOptions;

    AppointmentSlot.insertMany = async (documents, options) => {
      savedReservations = documents;
      savedOptions = options;
      return documents;
    };

    const result = await reserveAppointmentSlots({
      clinicId,
      doctorId,
      appointmentId,
      startsAt: new Date("2026-11-12T12:00:00.000Z"),
      endsAt: new Date("2026-11-12T12:30:00.000Z"),
      session: activeSession,
    });

    assert.equal(result.length, 2);
    assert.equal(savedReservations.length, 2);
    assert.equal(savedOptions.session, activeSession);

    assert.equal(
      savedReservations[0].startsAt.toISOString(),
      "2026-11-12T12:00:00.000Z"
    );

    assert.equal(
      savedReservations[1].startsAt.toISOString(),
      "2026-11-12T12:15:00.000Z"
    );
  } finally {
    AppointmentSlot.insertMany = originalInsertMany;
  }
});

test("should reject reservation without an active transaction", async () => {
  await assert.rejects(
    () =>
      reserveAppointmentSlots({
        clinicId,
        doctorId,
        appointmentId,
        startsAt: new Date("2026-11-12T12:00:00.000Z"),
        endsAt: new Date("2026-11-12T12:30:00.000Z"),
        session: { inTransaction: () => false },
      }),
    (error) => error.statusCode === 500
  );
});

test("should reject invalid reservation IDs", async () => {
  await assert.rejects(
    () =>
      reserveAppointmentSlots({
        clinicId: "invalid-id",
        doctorId,
        appointmentId,
        startsAt: new Date("2026-11-12T12:00:00.000Z"),
        endsAt: new Date("2026-11-12T12:30:00.000Z"),
        session: activeSession,
      }),
    (error) => error.statusCode === 400
  );
});

test("should convert duplicate slot errors into conflict errors", async () => {
  const originalInsertMany = AppointmentSlot.insertMany;

  try {
    AppointmentSlot.insertMany = async () => {
      const error = new Error("Duplicate key");
      error.code = 11000;
      throw error;
    };

    await assert.rejects(
      () =>
        reserveAppointmentSlots({
          clinicId,
          doctorId,
          appointmentId,
          startsAt: new Date("2026-11-12T12:00:00.000Z"),
          endsAt: new Date("2026-11-12T12:30:00.000Z"),
          session: activeSession,
        }),
      (error) => error.statusCode === 409
    );
  } finally {
    AppointmentSlot.insertMany = originalInsertMany;
  }
});
