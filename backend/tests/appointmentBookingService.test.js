
const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const Clinic = require("../src/models/Clinic");
const Doctor = require("../src/models/Doctor");
const Service = require("../src/models/Service");

const {
  validateBookingEntities,
} = require("../src/services/appointmentBookingService");

const session = { testSession: true };

const clinicId = new mongoose.Types.ObjectId();
const doctorId = new mongoose.Types.ObjectId();
const serviceId = new mongoose.Types.ObjectId();

const clinic = {
  _id: clinicId,
  status: "active",
  timezone: "Asia/Kathmandu",
};

const doctor = {
  _id: doctorId,
  clinic: clinicId,
  status: "active",
};

const service = {
  _id: serviceId,
  clinic: clinicId,
  doctors: [doctorId],
  status: "active",
  durationMinutes: 30,
};

const DoctorAvailability = require("../src/models/DoctorAvailability");

const {
  validateAppointmentTime,
} = require("../src/services/appointmentBookingService");

test("should reject invalid booking IDs", async () => {
  await assert.rejects(
    () =>
      validateBookingEntities({
        clinicId: "invalid",
        doctorId,
        serviceId,
        session,
      }),
    (error) => error.statusCode === 400
  );
});

test("should validate an active clinic, doctor and service", async () => {
  const originalClinicFindOne = Clinic.findOne;
  const originalDoctorFindOne = Doctor.findOne;
  const originalServiceFindOne = Service.findOne;

  try {
    Clinic.findOne = () => ({
      session: async () => clinic,
    });

    Doctor.findOne = () => ({
      session: async () => doctor,
    });

    Service.findOne = () => ({
      session: async () => service,
    });

    const result = await validateBookingEntities({
      clinicId,
      doctorId,
      serviceId,
      session,
    });

    assert.equal(result.clinic, clinic);
    assert.equal(result.doctor, doctor);
    assert.equal(result.service, service);
  } finally {
    Clinic.findOne = originalClinicFindOne;
    Doctor.findOne = originalDoctorFindOne;
    Service.findOne = originalServiceFindOne;
  }
});

test("should reject an inactive or missing clinic", async () => {
  const originalClinicFindOne = Clinic.findOne;

  try {
    Clinic.findOne = () => ({
      session: async () => null,
    });

    await assert.rejects(
      () =>
        validateBookingEntities({
          clinicId,
          doctorId,
          serviceId,
          session,
        }),
      (error) => error.statusCode === 404
    );
  } finally {
    Clinic.findOne = originalClinicFindOne;
  }
});


test("should reject a doctor who does not belong to the clinic", async () => {
  const originalClinicFindOne = Clinic.findOne;
  const originalDoctorFindOne = Doctor.findOne;

  try {
    Clinic.findOne = () => ({
      session: async () => clinic,
    });

    Doctor.findOne = () => ({
      session: async () => null,
    });

    await assert.rejects(
      () =>
        validateBookingEntities({
          clinicId,
          doctorId,
          serviceId,
          session,
        }),
      (error) => error.statusCode === 404
    );
  } finally {
    Clinic.findOne = originalClinicFindOne;
    Doctor.findOne = originalDoctorFindOne;
  }
});

test("should reject a service not provided by the selected doctor", async () => {
  const originalClinicFindOne = Clinic.findOne;
  const originalDoctorFindOne = Doctor.findOne;
  const originalServiceFindOne = Service.findOne;

  try {
    Clinic.findOne = () => ({
      session: async () => clinic,
    });

    Doctor.findOne = () => ({
      session: async () => doctor,
    });

    Service.findOne = () => ({
      session: async () => null,
    });

    await assert.rejects(
      () =>
        validateBookingEntities({
          clinicId,
          doctorId,
          serviceId,
          session,
        }),
      (error) => error.statusCode === 404
    );
  } finally {
    Clinic.findOne = originalClinicFindOne;
    Doctor.findOne = originalDoctorFindOne;
    Service.findOne = originalServiceFindOne;
  }
});



const validAvailability = {
  clinic: clinicId,
  doctor: doctorId,
  dayOfWeek: 5,
  startTime: "09:00",
  endTime: "20:00",
  isActive: true,
};

test("should accept an appointment within doctor availability", async () => {
  const originalFindOne = DoctorAvailability.findOne;

  try {
    DoctorAvailability.findOne = () => ({
      session: async () => validAvailability,
    });

    const result = await validateAppointmentTime({
      clinic,
      doctor,
      service,
      startsAt: new Date("2027-01-01T12:00:00.000Z"),
      endsAt: new Date("2027-01-01T12:30:00.000Z"),
      session,
    });

    assert.equal(result, true);
  } finally {
    DoctorAvailability.findOne = originalFindOne;
  }
});

test("should reject appointment duration different from service duration", async () => {
  await assert.rejects(
    () =>
      validateAppointmentTime({
        clinic,
        doctor,
        service,
        startsAt: new Date("2026-11-12T12:00:00.000Z"),
        endsAt: new Date("2026-11-12T12:45:00.000Z"),
        session,
      }),
    (error) => error.statusCode === 400
  );
});


test("should reject appointment outside doctor availability", async () => {
  const originalFindOne = DoctorAvailability.findOne;

  try {
    DoctorAvailability.findOne = () => ({
      session: async () => null,
    });

    await assert.rejects(
      () =>
        validateAppointmentTime({
          clinic,
          doctor,
          service,
          startsAt: new Date("2027-01-01T12:00:00.000Z"),
          endsAt: new Date("2027-01-01T12:30:00.000Z"),
          session,
        }),
      (error) => {
        assert.equal(error.statusCode, 409);
        assert.match(error.message, /not available/);
        return true;
      }
    );
  } finally {
    DoctorAvailability.findOne = originalFindOne;
  }
});


test("should reject appointment outside 15-minute boundaries", async () => {
  await assert.rejects(
    () =>
      validateAppointmentTime({
        clinic,
        doctor,
        service,
        startsAt: new Date("2026-11-12T12:05:00.000Z"),
        endsAt: new Date("2026-11-12T12:35:00.000Z"),
        session,
      }),
    (error) => error.statusCode === 400
  );
});


test("should reject appointments scheduled in the past", async () => {
  await assert.rejects(
    () =>
      validateAppointmentTime({
        clinic,
        doctor,
        service,
        startsAt: new Date("2020-01-01T10:00:00.000Z"),
        endsAt: new Date("2020-01-01T10:30:00.000Z"),
        session,
      }),
    (error) => error.statusCode === 400
  );
});
