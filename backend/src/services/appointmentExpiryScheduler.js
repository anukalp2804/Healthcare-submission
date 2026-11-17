
const cron = require("node-cron");

const {
  processExpiredAppointmentHolds,
} = require("./appointmentExpiryService");

let expiryTask = null;
let isRunning = false;

/**
 * Run expired appointment cleanup.
 */
const runExpiryCleanup = async () => {
  if (isRunning) {
    console.log(
      "[Appointment Expiry] Previous cleanup is still running. Skipping this cycle."
    );
    return;
  }

  isRunning = true;

  try {
    const result = await processExpiredAppointmentHolds();

    console.log("[Appointment Expiry] Cleanup completed:", {
      scanned: result.scanned,
      expired: result.expired,
      skipped: result.skipped,
      failed: result.failed,
    });

    if (result.failed > 0) {
      console.error(
        "[Appointment Expiry] Some appointments could not be processed:",
        result.errors
      );
    }
  } catch (error) {
    console.error(
      "[Appointment Expiry] Cleanup failed:",
      error.message
    );
  } finally {
    isRunning = false;
  }
};

/**
 * Start the cleanup scheduler.
 */
const startAppointmentExpiryScheduler = () => {
  if (expiryTask) {
    return;
  }

  expiryTask = cron.schedule("* * * * *", runExpiryCleanup);

  console.log(
    "[Appointment Expiry] Scheduler started. Interval: 1 minute."
  );
};

/**
 * Stop the cleanup scheduler.
 */
const stopAppointmentExpiryScheduler = () => {
  if (expiryTask) {
    expiryTask.stop();
    expiryTask = null;
  }
};

module.exports = {
  runExpiryCleanup,
  startAppointmentExpiryScheduler,
  stopAppointmentExpiryScheduler,
};
