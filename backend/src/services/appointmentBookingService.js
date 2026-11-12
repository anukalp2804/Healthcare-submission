
const mongoose = require("mongoose");

const Clinic = require("../models/Clinic");
const Doctor = require("../models/Doctor");
const Service = require("../models/Service");

const AppError = require("../utils/AppError");


const Appointment = require("../models/Appointment");

const {
  reserveAppointmentSlots,
} = require("./appointmentSlotService");

/**
 * Validate that the clinic, doctor and service
 * belong together and are active.
 */
const validateBookingEntities = async ({
  clinicId,
  doctorId,
  serviceId,
  session,
}) => {
  const ids = [clinicId, doctorId, serviceId];

  if (!ids.every((id) => mongoose.isValidObjectId(id))) {
    throw new AppError("Invalid clinic, doctor or service ID.", 400);
  }

  const clinic = await Clinic.findOne({
    _id: clinicId,
    status: "active",
  }).session(session);

  if (!clinic) {
    throw new AppError("Clinic not found or inactive.", 404);
  }

  const doctor = await Doctor.findOne({
    _id: doctorId,
    clinic: clinicId,
    status: "active",
  }).session(session);

  if (!doctor) {
    throw new AppError(
      "Doctor does not belong to this clinic or is inactive.",
      404
    );
  }

  const service = await Service.findOne({
    _id: serviceId,
    clinic: clinicId,
    doctors: doctorId,
    status: "active",
  }).session(session);

  if (!service) {
    throw new AppError(
      "Service is unavailable for the selected doctor.",
      404
    );
  }

  return { clinic, doctor, service };
};

const DoctorAvailability = require("../models/DoctorAvailability");

const {
  getLocalDayOfWeek,
  formatClinicDateTime,
} = require("../utils/timezone");

const {
  generateSlotStartTimes,
} = require("./appointmentSlotService");



const validateAppointmentTime = async ({
  clinic,
  doctor,
  service,
  startsAt,
  endsAt,
  session,
}) => {
  if (
    !(startsAt instanceof Date) ||
    !(endsAt instanceof Date) ||
    Number.isNaN(startsAt.getTime()) ||
    Number.isNaN(endsAt.getTime())
  ) {
    throw new AppError("Valid appointment timestamps are required.", 400);
  }

  if (startsAt.getTime() <= Date.now()) {
  throw new AppError(
    "Appointments must be scheduled in the future.",
    400
  );
}

  const durationMinutes =
    (endsAt.getTime() - startsAt.getTime()) / (60 * 1000);

  if (durationMinutes !== service.durationMinutes) {
    throw new AppError(
      "Appointment duration does not match the selected service.",
      400
    );
  }

  try {
    generateSlotStartTimes(startsAt, endsAt);
  } catch (error) {
    throw new AppError(error.message, 400);
  }

  const timezone = clinic.timezone;

  const localStart = formatClinicDateTime(startsAt, timezone);
  const localEnd = formatClinicDateTime(endsAt, timezone);

  const [startDate, startTime] = localStart.split(", ");
  const [endDate, endTime] = localEnd.split(", ");

  // Overnight availability is not supported in this MVP.
  if (startDate !== endDate) {
    throw new AppError(
      "Appointments cannot cross clinic-local midnight.",
      400
    );
  }

  const dayOfWeek = getLocalDayOfWeek(startsAt, timezone);

  const availability = await DoctorAvailability.findOne({
    clinic: clinic._id,
    doctor: doctor._id,
    dayOfWeek,
    startTime: { $lte: startTime },
    endTime: { $gte: endTime },
    isActive: true,
  }).session(session);

  if (!availability) {
    throw new AppError(
      "The doctor is not available during the selected time.",
      409
    );
  }

  return true;
};


const createAppointmentBooking = async ({
  clinicId,
  doctorId,
  serviceId,
  patientName,
  patientPhone,
  patientEmail,
  startsAt,
  endsAt,
  bookingSource = "whatsapp",
}) => {
  const session = await mongoose.startSession();

  try {
    let createdAppointment;

    await session.withTransaction(async () => {
      // 1. Validate clinic, doctor and service.
      const { clinic, doctor, service } =
        await validateBookingEntities({
          clinicId,
          doctorId,
          serviceId,
          session,
        });

      // 2. Validate the selected appointment time.
      await validateAppointmentTime({
        clinic,
        doctor,
        service,
        startsAt,
        endsAt,
        session,
      });

      // 3. Create a temporary booking hold.
      const holdExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

      const [appointment] = await Appointment.create(
        [
          {
            clinic: clinic._id,
            doctor: doctor._id,
            service: service._id,
            patientName,
            patientPhone,
            patientEmail,
            startsAt,
            endsAt,
            holdExpiresAt,
            status: "pending",
            bookingSource,
          },
        ],
        { session }
      );

      // 4. Reserve every required 15-minute interval.
      await reserveAppointmentSlots({
        clinicId: clinic._id,
        doctorId: doctor._id,
        appointmentId: appointment._id,
        startsAt,
        endsAt,
        expiresAt: holdExpiresAt,
        session,
      });

      createdAppointment = appointment;
    });

    return createdAppointment;
  } finally {
    await session.endSession();
  }
};


module.exports = {
  validateBookingEntities,
  validateAppointmentTime,
  createAppointmentBooking,
};
