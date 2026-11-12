
const test = require("node:test");
const assert = require("node:assert/strict");

const Doctor = require("../src/models/Doctor");
const Clinic = require("../src/models/Clinic");
const AppError = require("../src/utils/AppError");

const {
  getDoctorById,
  listDoctorsByClinic,
} = require("../src/services/doctorService");

const clinicA = "507f1f77bcf86cd799439011";
const clinicB = "507f191e810c19729de860ea";
const doctorA = "507f1f77bcf86cd799439012";
const doctorB = "507f191e810c19729de860eb";

test("Platform admin can access a doctor in any clinic", async () => {
  const originalFindOne = Doctor.findOne;

  try {
    Doctor.findOne = async (query) => ({
      _id: query._id,
      clinic: clinicB,
      name: "Doctor B",
    });

    const result = await getDoctorById(doctorB, {
      role: "platform_admin",
    });

    assert.equal(result.name, "Doctor B");
  } finally {
    Doctor.findOne = originalFindOne;
  }
});

test("Clinic admin can access a doctor in their own clinic", async () => {
  const originalFindOne = Doctor.findOne;

  try {
    Doctor.findOne = async (query) => ({
      _id: query._id,
      clinic: query.clinic,
      name: "Doctor A",
    });

    const result = await getDoctorById(doctorA, {
      role: "clinic_admin",
      clinic: clinicA,
    });

    assert.equal(result.name, "Doctor A");
  } finally {
    Doctor.findOne = originalFindOne;
  }
});

test("Clinic admin cannot access another clinic's doctor", async () => {
  const originalFindOne = Doctor.findOne;

  try {
    Doctor.findOne = async () => null;

    await assert.rejects(
      getDoctorById(doctorB, {
        role: "clinic_admin",
        clinic: clinicA,
      }),
      (error) => {
        assert.equal(error.statusCode, 404);
        return true;
      }
    );
  } finally {
    Doctor.findOne = originalFindOne;
  }
});

test("Doctor can access only their own record", async () => {
  const originalFindOne = Doctor.findOne;

  try {
    Doctor.findOne = async (query) => {
      assert.equal(query._id, doctorA);
      assert.equal(query.clinic, clinicA);

      return {
        _id: doctorA,
        clinic: clinicA,
        name: "Doctor A",
      };
    };

    const result = await getDoctorById(doctorB, {
      role: "doctor",
      clinic: clinicA,
      doctor: doctorA,
    });

    assert.equal(result.name, "Doctor A");
  } finally {
    Doctor.findOne = originalFindOne;
  }
});

test("Clinic admin can list only their own clinic's doctors", async () => {
  const originalFind = Doctor.find;

  try {
    Doctor.find = (query) => {
      assert.equal(query.clinic, clinicA);

      return {
        sort: async () => [
          { name: "Doctor A" },
        ],
      };
    };

    const result = await listDoctorsByClinic(clinicA, {
      role: "clinic_admin",
      clinic: clinicA,
    });

    assert.equal(result.length, 1);
  } finally {
    Doctor.find = originalFind;
  }
});

test("Clinic admin cannot list another clinic's doctors", async () => {
  await assert.rejects(
    listDoctorsByClinic(clinicB, {
      role: "clinic_admin",
      clinic: clinicA,
    }),
    (error) => {
      assert.equal(error.statusCode, 403);
      return true;
    }
  );
});

test("Only platform admins can register doctors", async () => {
  const originalFindById = Clinic.findById;

  try {
    await assert.rejects(
      require("../src/services/doctorService").createDoctor(
        { clinicId: clinicA },
        { role: "clinic_admin", clinic: clinicA }
      ),
      (error) => {
        assert.equal(error.statusCode, 403);
        return true;
      }
    );
  } finally {
    Clinic.findById = originalFindById;
  }
});

test("Unauthenticated users cannot access doctors", async () => {
  await assert.rejects(
    getDoctorById(doctorA, null),
    (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 401);
      return true;
    }
  );
});
