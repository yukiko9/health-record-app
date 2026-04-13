const express = require("express");
const cors = require("cors");
const authMiddleware = require("./middleware/auth");
const dashboardRouter = require("./routes/dashboard");
const recordsRouter = require("./routes/records");
const goalRouter = require("./routes/goal");
const aiRouter = require("./routes/ai");
const feedbackRouter = require("./routes/feedback");

const app = express();

/** CORS：便于 Vercel 经网关（如 AnyService）转发时预检与跨域头一致；可用环境变量 CORS_ORIGIN 逗号分隔白名单，未设则按请求 Origin 回显 */
const corsOriginsEnv = process.env.CORS_ORIGIN;
const corsOptions = {
  origin:
    corsOriginsEnv && corsOriginsEnv.trim()
      ? corsOriginsEnv.split(",").map((s) => s.trim()).filter(Boolean)
      : true,
  methods: ["GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-User-Id",
    "X-WX-SERVICE",
    "X-AnyService-Name",
  ],
  maxAge: 86400,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.use(authMiddleware);

app.use("/api", dashboardRouter);
app.use("/api", recordsRouter);
app.use("/api", goalRouter);
app.use("/api", aiRouter);
app.use("/api", feedbackRouter);

app.use((req, res) => {
  res.status(404).json({ message: "Not Found" });
});

app.use((err, req, res, next) => {
  const message = err && err.message ? err.message : "Internal Server Error";
  res.status(500).json({ message });
});

module.exports = app;
