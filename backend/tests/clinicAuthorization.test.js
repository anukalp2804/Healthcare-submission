
const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const {
  requireClinicAccess,
} = require("../src/middleware/clinicMiddleware");

const validClinicId = new mongoose.Types.ObjectId().toString();

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
  const result = runMiddleware(requireClinicAccess, null);

  assert.equal(result.error.statusCode, 401);
});

test("Allows platform administrators", () => {
  const result = runMiddleware(requireClinicAccess, {
    role: "platform_admin",
  });

  assert.equal(result.error, null);
});

test("Allows clinic administrators with valid clinic IDs", () => {
  const result = runMiddleware(requireClinicAccess, {
    role: "clinic_admin",
    clinic: validClinicId,
  });

  assert.equal(result.error, null);
  assert.equal(result.req.clinicId, validClinicId);
});

test("Allows receptionists with valid clinic IDs", () => {
  const result = runMiddleware(requireClinicAccess, {
    role: "receptionist",
    clinic: validClinicId,
  });

  assert.equal(result.error, null);
  assert.equal(result.req.clinicId, validClinicId);
});

test("Rejects users without clinic IDs", () => {
  const result = runMiddleware(requireClinicAccess, {
    role: "clinic_admin",
  });

  assert.equal(result.error.statusCode, 403);
});

test("Rejects invalid clinic IDs", () => {
  const result = runMiddleware(requireClinicAccess, {
    role: "clinic_admin",
    clinic: "invalid-clinic-id",
  });

  assert.equal(result.error.statusCode, 403);
});
