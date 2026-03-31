const express = require("express");
const { getOrCreateUser, getWinStreak } = require("../services/dataService");

const router = express.Router();

router.get("/dashboard", (req, res) => {
  const user = getOrCreateUser(req.user.id);
  const duration = getWinStreak(user.id, user.goal);
  res.json({
    username: user.username,
    goal: user.goal,
    duration
  });
});

module.exports = router;
