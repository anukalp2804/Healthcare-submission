
const test = require("node:test");
const assert = require("node:assert/strict");

const Clinic = require("../src/models/Clinic");
const AppError = require("../src/utils/AppError");

const { createClinic } = require("../src/services/clinicService");
const { isValidTimezone } = require("../src/utils/timezone");

const {
  getClinicById,
  listClinics,
} = require("../src/services/clinicService");

const clinicA = "507f1f77bcf86cd799439011";
const clinicB = "507f191e810c19729de860ea";

test("Platform admin can access any clinic", async () => {
  const originalFindById = Clinic.findById;

  try {
    Clinic.findById = async (id) => ({
      _id: id,
      name: "Clinic A",
    });

    const result = await getClinicById(clinicA, {
      role: "platform_admin",
    });

    assert.equal(result.name, "Clinic A");
  } finally {
    Clinic.findById = originalFindById;
  }
});


test("Clinic admin can access their own clinic", async () => {
  const originalFindOne = Clinic.findOne;

  try {
    Clinic.findOne = async (query) => ({
      _id: query._id,
      name: "Clinic A",
    });

    const result = await getClinicById(clinicA, {
      role: "clinic_admin",
      clinic: clinicA,
    });

    assert.equal(result.name, "Clinic A");
  } finally {
    Clinic.findOne = originalFindOne;
  }
});


test("Clinic admin cannot access another clinic", async () => {
  await assert.rejects(
    getClinicById(clinicB, {
      role: "clinic_admin",
      clinic: clinicA,
    }),
    (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 403);
      return true;
    }
  );
});

test("Unauthenticated users cannot access clinics", async () => {
  await assert.rejects(
    getClinicById(clinicA, null),
    (error) => {
      assert.equal(error.statusCode, 401);
      return true;
    }
  );
});

test("Only platform admins can list all clinics", async () => {
  const originalFind = Clinic.find;

  try {
    Clinic.find = () => ({
      sort: async () => [
        { name: "Clinic A" },
        { name: "Clinic B" },
      ],
    });

    const result = await listClinics({
      role: "platform_admin",
    });

    assert.equal(result.length, 2);
  } finally {
    Clinic.find = originalFind;
  }
});

test("Clinic admins cannot list all clinics", async () => {
  await assert.rejects(
    listClinics({
      role: "clinic_admin",
      clinic: clinicA,
    }),
    (error) => {
      assert.equal(error.statusCode, 403);
      return true;
    }
  );
});


test("Accepts Asia/Kathmandu timezone", () => {
  assert.equal(isValidTimezone("Asia/Kathmandu"), true);
});

test("Accepts Asia/Kolkata timezone", () => {
  assert.equal(isValidTimezone("Asia/Kolkata"), true);
});

test("Rejects invalid timezone", () => {
  assert.equal(isValidTimezone("Invalid/Timezone"), false);
});


test("Creates a clinic with Asia/Kathmandu timezone by default", async () => {
  const originalFindOne = Clinic.findOne;
  const originalCreate = Clinic.create;

  try {
    Clinic.findOne = async () => null;
    Clinic.create = async (data) => data;

    const result = await createClinic({
      name: "Nepal Health Clinic",
      slug: "nepal-health-clinic",
      contactEmail: "nepal@example.com",
      contactPhone: "9800000000",
    });

    assert.equal(result.timezone, "Asia/Kathmandu");
  } finally {
    Clinic.findOne = originalFindOne;
    Clinic.create = originalCreate;
  }
});

test("Creates a clinic with Asia/Kolkata timezone", async () => {
  const originalFindOne = Clinic.findOne;
  const originalCreate = Clinic.create;

  try {
    Clinic.findOne = async () => null;
    Clinic.create = async (data) => data;

    const result = await createClinic({
      name: "India Health Clinic",
      slug: "india-health-clinic",
      contactEmail: "india@example.com",
      contactPhone: "9876543210",
      timezone: "Asia/Kolkata",
    });

    assert.equal(result.timezone, "Asia/Kolkata");
  } finally {
    Clinic.findOne = originalFindOne;
    Clinic.create = originalCreate;
  }
});

test("Rejects invalid timezone during clinic creation", async () => {
  await assert.rejects(
    createClinic({
      name: "Invalid Clinic",
      slug: "invalid-clinic",
      contactEmail: "invalid@example.com",
      contactPhone: "9800000000",
      timezone: "Invalid/Timezone",
    }),
    (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 400);
      return true;
    }
  );
});
