const express = require("express");
const { updateUserGoal, getOrCreateUser } = require("../services/dataService");

const router = express.Router();

router.post("/goal/save", (req, res) => {
  const rawGoal = req.body && req.body.goal;
  const goal = Number(rawGoal);
  if (!Number.isFinite(goal)) {
    return res.status(400).json({ success: false, message: "goal 必须是数字" });
  }
  updateUserGoal(req.user.id, goal);
  const user = getOrCreateUser(req.user.id);
  return res.json({
    success: true,
    goal: user.goal
  });
});

module.exports = router;
