
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { rateLimit } = require("express-rate-limit");
const sessionMiddleware = require("./config/session");// session management

const healthRoutes = require("./routes/healthRoutes");
const authRoutes = require("./routes/authRoutes");

const {
  notFoundHandler,
  errorHandler
} = require("./middleware/errorHandler");

const app = express();

// Security headers
app.use(helmet());

// Server-side session management
app.use(sessionMiddleware);

// Restrict frontend access
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// Request logging
app.use(morgan("dev"));

// Limit incoming JSON payload size
app.use(express.json({ limit: "10kb" }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later."
  }
});

app.use("/api", apiLimiter);

// Health endpoint
app.use("/api/health", healthRoutes);

// Authentication endpoints
app.use("/api/auth", authRoutes);

// Unknown routes
app.use(notFoundHandler);

// Central error handler
app.use(errorHandler);

module.exports = app;
