
const session = require("express-session");
const MongoStore = require("connect-mongo").default;

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is not configured.");
}

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI is not configured.");
}

const sessionMiddleware = session({
  name: "healthcare.sid",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,

  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: "sessions",
    ttl: 8 * 60 * 60,
  }),

  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 8 * 60 * 60 * 1000,
  },
});

module.exports = sessionMiddleware;
