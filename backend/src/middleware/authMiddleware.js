
const AppError = require("../utils/AppError");

const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return next(
      new AppError("Authentication required.", 401)
    );
  }

  req.user = req.session.user;

  next();
};

module.exports = { requireAuth };
