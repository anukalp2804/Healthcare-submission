const mongoose = require("mongoose");

const expiryService = require("../src/services/appointmentExpiryService");

const test = require("node:test");
const assert = require("node:assert/strict");

const Appointment = require("../src/models/Appointment");


const {
  processExpiredAppointmentHolds,
} = require("../src/services/appointmentExpiryService");

test("should return empty results when no expired appointments exist", async () => {
  const originalFind = Appointment.find;

  let capturedFilter;
  let capturedLimit;

  try {
    Appointment.find = (filter) => {
      capturedFilter = filter;

      return {
        select() {
          return this;
        },
        sort() {
          return this;
        },
        limit(value) {
          capturedLimit = value;
          return this;
        },
        lean: async () => [],
      };
    };

    const result = await processExpiredAppointmentHolds();

    assert.deepEqual(capturedFilter.status, "pending");
    assert.ok(capturedFilter.holdExpiresAt.$lte instanceof Date);

    assert.equal(capturedLimit, 50);
    assert.equal(result.scanned, 0);
    assert.equal(result.expired, 0);
    assert.equal(result.skipped, 0);
    assert.equal(result.failed, 0);
    assert.deepEqual(result.errors, []);
  } finally {
    Appointment.find = originalFind;
  }
});


test("should process multiple expired appointments", async () => {
  const originalFind = Appointment.find;
  const originalExpire = expiryService.expireAppointmentHold;

  const appointmentIds = [
    new mongoose.Types.ObjectId(),
    new mongoose.Types.ObjectId(),
    new mongoose.Types.ObjectId(),
  ];

  const processedIds = [];

  try {
    Appointment.find = () => ({
      select() {
        return this;
      },
      sort() {
        return this;
      },
      limit() {
        return this;
      },
      lean: async () => appointmentIds.map((_id) => ({ _id })),
    });

    expiryService.expireAppointmentHold = async (id) => {
      processedIds.push(id.toString());

      return {
        expired: true,
        appointment: { _id: id, status: "expired" },
        deletedSlots: 2,
      };
    };

    const result = await expiryService.processExpiredAppointmentHolds();

    assert.equal(result.scanned, 3);
    assert.equal(result.expired, 3);
    assert.equal(result.skipped, 0);
    assert.equal(result.failed, 0);

    assert.deepEqual(
      processedIds,
      appointmentIds.map((id) => id.toString())
    );
  } finally {
    Appointment.find = originalFind;
    expiryService.expireAppointmentHold = originalExpire;
  }
});


test("should reject a batch size smaller than 1", async () => {
  await assert.rejects(
    () => processExpiredAppointmentHolds({ batchSize: 0 }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.match(error.message, /Batch size/);
      return true;
    }
  );
});

test("should reject a batch size greater than 500", async () => {
  await assert.rejects(
    () => processExpiredAppointmentHolds({ batchSize: 501 }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.match(error.message, /Batch size/);
      return true;
    }
  );
});


test("should continue processing when one appointment expiry fails", async () => {
  const originalFind = Appointment.find;
  const originalExpire = expiryService.expireAppointmentHold;

  const appointmentIds = [
    new mongoose.Types.ObjectId(),
    new mongoose.Types.ObjectId(),
    new mongoose.Types.ObjectId(),
  ];

  const processedIds = [];

  try {
    Appointment.find = () => ({
      select() {
        return this;
      },
      sort() {
        return this;
      },
      limit() {
        return this;
      },
      lean: async () => appointmentIds.map((_id) => ({ _id })),
    });

    expiryService.expireAppointmentHold = async (id) => {
      processedIds.push(id.toString());

      if (id.equals(appointmentIds[1])) {
        throw new Error("Simulated expiry failure");
      }

      return {
        expired: true,
        deletedSlots: 2,
      };
    };

    const result = await expiryService.processExpiredAppointmentHolds();

    assert.equal(result.scanned, 3);
    assert.equal(result.expired, 2);
    assert.equal(result.skipped, 0);
    assert.equal(result.failed, 1);

    assert.equal(result.errors.length, 1);
    assert.equal(
      result.errors[0].appointmentId,
      appointmentIds[1].toString()
    );
    assert.equal(result.errors[0].message, "Simulated expiry failure");

    assert.equal(processedIds.length, 3);
  } finally {
    Appointment.find = originalFind;
    expiryService.expireAppointmentHold = originalExpire;
  }
});
