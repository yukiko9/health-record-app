const express = require("express");
const cors = require("cors");
const authMiddleware = require("./middleware/auth");
const dashboardRouter = require("./routes/dashboard");
const recordsRouter = require("./routes/records");
const goalRouter = require("./routes/goal");
const aiRouter = require("./routes/ai");

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api", dashboardRouter);
app.use("/api", recordsRouter);
app.use("/api", goalRouter);
app.use("/api", aiRouter);

app.use((req, res) => {
  res.status(404).json({ message: "Not Found" });
});

app.use((err, req, res, next) => {
  const message = err && err.message ? err.message : "Internal Server Error";
  res.status(500).json({ message });
});

module.exports = app;
