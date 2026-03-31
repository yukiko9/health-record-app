require("dotenv").config();

function readEnv(name, fallback = "") {
  const v = process.env[name];
  if (v == null || v === "") return fallback;
  return String(v);
}

function readIntEnv(name, fallback) {
  const raw = process.env[name];
  const n = Number(raw);
  if (Number.isFinite(n)) return Math.trunc(n);
  return fallback;
}

const config = {
  port: readIntEnv("PORT", 3000),
  deepseekApiKey: readEnv("DEEPSEEK_API_KEY", ""),
  deepseekBaseUrl: readEnv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
  deepseekModel: readEnv("DEEPSEEK_MODEL", "deepseek-chat"),
  isVercel: String(process.env.VERCEL || "") === "1",
  dataFilePath: readEnv("DATA_FILE_PATH", "")
};

module.exports = config;
