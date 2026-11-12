
const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const {
  requireDoctorAccess,
} = require("../src/middleware/doctorMiddleware");

const validClinicId = new mongoose.Types.ObjectId().toString();
const validDoctorId = new mongoose.Types.ObjectId().toString();

const runMiddleware = (middleware, user) => {
  const req = { user };
  let error = null;
  let nextCalled = false;

  middleware(req, {}, (err) => {
    error = err || null;
    nextCalled = true;
  });

  return { req, error, nextCalled };
};

test("Rejects unauthenticated users", () => {
  const result = runMiddleware(requireDoctorAccess, null);

  assert.equal(result.error.statusCode, 401);
  assert.equal(result.nextCalled, true);
});

test("Allows platform administrators", () => {
  const result = runMiddleware(requireDoctorAccess, {
    role: "platform_admin",
  });

  assert.equal(result.error, null);
  assert.equal(result.nextCalled, true);
});

test("Rejects receptionists", () => {
  const result = runMiddleware(requireDoctorAccess, {
    role: "receptionist",
    clinic: validClinicId,
  });

  assert.equal(result.error.statusCode, 403);
});

test("Allows doctors with valid clinic and doctor IDs", () => {
  const result = runMiddleware(requireDoctorAccess, {
    role: "doctor",
    clinic: validClinicId,
    doctor: validDoctorId,
  });

  assert.equal(result.error, null);
  assert.equal(result.req.clinicId, validClinicId);
  assert.equal(result.req.doctorId, validDoctorId);
});

test("Rejects doctors without a clinic ID", () => {
  const result = runMiddleware(requireDoctorAccess, {
    role: "doctor",
    doctor: validDoctorId,
  });

  assert.equal(result.error.statusCode, 403);
});

test("Rejects doctors with an invalid doctor ID", () => {
  const result = runMiddleware(requireDoctorAccess, {
    role: "doctor",
    clinic: validClinicId,
    doctor: "invalid-id",
  });

  assert.equal(result.error.statusCode, 403);
});
