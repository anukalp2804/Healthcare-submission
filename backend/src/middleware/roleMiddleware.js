
const AppError = require("../utils/AppError");

const allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new AppError("Authentication required.", 401)
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to access this resource.", 403)
      );
    }

    next();
  };
};

module.exports = { allowRoles };
