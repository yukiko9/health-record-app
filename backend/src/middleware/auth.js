const { getOrCreateUser } = require("../services/dataService");

function authMiddleware(req, res, next) {
  const userId = req.header("x-user-id") || "1";
  const user = getOrCreateUser(userId);
  req.user = user;
  next();
}

module.exports = authMiddleware;
