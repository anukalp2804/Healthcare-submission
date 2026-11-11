
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 12;

// Hash a plain-text password before storing it.
const hashPassword = async (password) => {
  if (!password || typeof password !== "string") {
    throw new Error("A valid password is required.");
  }

  return bcrypt.hash(password, SALT_ROUNDS);
};

// Compare a login password with the stored hash.
const comparePassword = async (password, passwordHash) => {
  if (
    typeof password !== "string" ||
    typeof passwordHash !== "string"
  ) {
    return false;
  }

  return bcrypt.compare(password, passwordHash);
};

module.exports = {
  hashPassword,
  comparePassword,
};
