
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isValidTimezone,
  getLocalDayOfWeek,
  formatClinicDateTime,
} = require("../src/utils/timezone");

test("should recognize valid timezones", () => {
  assert.equal(isValidTimezone("Asia/Kathmandu"), true);
  assert.equal(isValidTimezone("Asia/Kolkata"), true);
  assert.equal(isValidTimezone("Invalid/Timezone"), false);
});

test("should return weekday in clinic timezone", () => {
  const date = new Date("2026-11-12T12:00:00Z");

  assert.equal(getLocalDayOfWeek(date, "Asia/Kathmandu"), 4);
  assert.equal(getLocalDayOfWeek(date, "Asia/Kolkata"), 4);
});

test("should format instant in clinic timezone", () => {
  const date = new Date("2026-11-12T12:00:00Z");

  assert.equal(
    formatClinicDateTime(date, "Asia/Kathmandu"),
    "2026-11-12, 17:45"
  );

  assert.equal(
    formatClinicDateTime(date, "Asia/Kolkata"),
    "2026-11-12, 17:30"
  );
});

test("should reject invalid dates", () => {
  assert.throws(
    () => getLocalDayOfWeek(new Date("invalid"), "Asia/Kathmandu"),
    /valid Date/
  );

  assert.throws(
    () => formatClinicDateTime(new Date("invalid"), "Asia/Kathmandu"),
    /valid Date/
  );
});


const { clinicLocalToUtc } = require("../src/utils/timezone");

test("should convert Kathmandu local time to UTC", () => {
  const result = clinicLocalToUtc(
    "2026-11-12",
    "17:45",
    "Asia/Kathmandu"
  );

  assert.equal(result.toISOString(), "2026-11-12T12:00:00.000Z");
});

test("should convert Kolkata local time to UTC", () => {
  const result = clinicLocalToUtc(
    "2026-11-12",
    "17:30",
    "Asia/Kolkata"
  );

  assert.equal(result.toISOString(), "2026-11-12T12:00:00.000Z");
});

test("should reject invalid local date and time", () => {
  assert.throws(
    () => clinicLocalToUtc(
      "2026-02-30",
      "17:45",
      "Asia/Kathmandu"
    ),
    /Invalid or ambiguous/
  );

  assert.throws(
    () => clinicLocalToUtc(
      "2026-11-12",
      "25:00",
      "Asia/Kathmandu"
    ),
    /Date must be/
  );
});
