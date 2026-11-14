
require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/database");

const {
  startAppointmentExpiryScheduler,
  stopAppointmentExpiryScheduler,
} = require("./services/appointmentExpiryScheduler");

const mongoose = require("mongoose");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB before starting the server.
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`Healthcare Submission API running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);

      // Start expiry cleanup after the database is connected.
      startAppointmentExpiryScheduler();
    });

    let isShuttingDown = false;

    const shutdown = (signal) => {
      if (isShuttingDown) return;

      isShuttingDown = true;

      console.log(`${signal} received. Closing server...`);

      // Stop scheduled jobs before shutting down the server.
      stopAppointmentExpiryScheduler();

      server.close(async () => {
        try {
          await mongoose.connection.close();

          console.log("Server and database connections closed.");
          process.exit(0);
        } catch (error) {
          console.error("Shutdown error:", error.message);
          process.exit(1);
        }
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("Application startup failed.", error);
    process.exit(1);
  }
};

startServer();
