
const isValidTimezone = (timezone) => {
  if (typeof timezone !== "string" || !timezone.trim()) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
    });

    return true;
  } catch {
    return false;
  }
};

// Get the weekday in a clinic's local timezone.
// Sunday = 0, Monday = 1, ..., Saturday = 6.
const getLocalDayOfWeek = (date, timezone) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new Error("A valid Date object is required.");
  }

  if (!isValidTimezone(timezone)) {
    throw new Error("Invalid timezone.");
  }

  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).format(date);

  const days = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return days[weekday];
};

// Format an instant as a local date and time.
const formatClinicDateTime = (date, timezone) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new Error("A valid Date object is required.");
  }

  if (!isValidTimezone(timezone)) {
    throw new Error("Invalid timezone.");
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
};


const clinicLocalToUtc = (date, time, timezone) => {
  const { Temporal } = require("@js-temporal/polyfill");

  if (!isValidTimezone(timezone)) {
    throw new Error("Invalid timezone.");
  }

  if (
    typeof date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    typeof time !== "string" ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
  ) {
    throw new Error("Date must be YYYY-MM-DD and time must be HH:mm.");
  }

  try {
    const localDateTime = Temporal.PlainDateTime.from(`${date}T${time}`);

    const zonedDateTime = localDateTime.toZonedDateTime(
      timezone,
      { disambiguation: "reject" }
    );

    return new Date(Number(zonedDateTime.epochMilliseconds));
  } catch (error) {
    throw new Error(
      "Invalid or ambiguous clinic-local date and time."
    );
  }
};


module.exports = {
  isValidTimezone,
  getLocalDayOfWeek,
  formatClinicDateTime,
  clinicLocalToUtc,
};
