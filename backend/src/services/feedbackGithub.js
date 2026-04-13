const axios = require("axios");
const fs = require("fs");
const path = require("path");

const DEFAULT_OWNER = "yukiko9";
const DEFAULT_REPO = "health-record-app";
const DEFAULT_FILE_PATH = "backend/feedback.md";

function readGithubConfig() {
  const token =
    process.env.GITHUB_FEEDBACK_TOKEN || process.env.GITHUB_TOKEN || "";
  return {
    token: String(token).trim(),
    owner: process.env.GITHUB_FEEDBACK_OWNER || DEFAULT_OWNER,
    repo: process.env.GITHUB_FEEDBACK_REPO || DEFAULT_REPO,
    filePath: process.env.GITHUB_FEEDBACK_PATH || DEFAULT_FILE_PATH,
    timeout: Math.min(
      Math.max(Number(process.env.GITHUB_FEEDBACK_TIMEOUT_MS) || 20000, 5000),
      120000,
    ),
  };
}

function githubHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "health-app-feedback",
  };
}

function decodeGithubFileContent(contentB64) {
  if (!contentB64 || typeof contentB64 !== "string") return "";
  const clean = contentB64.replace(/\n/g, "");
  return Buffer.from(clean, "base64").toString("utf8");
}

/** GitHub REST：路径含 / 时需编码为 %2F，否则 contents 易返回 404 Not Found */
function githubContentsPathEncoded(filePath) {
  return encodeURIComponent(String(filePath || "").replace(/^\/+/, ""));
}

function contentsApiUrl(cfg) {
  const enc = githubContentsPathEncoded(cfg.filePath);
  return `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${enc}`;
}

/**
 * GET 当前文件内容与 sha；不存在时返回 { text: '', sha: null }
 */
async function fetchRemoteFile(cfg) {
  const url = contentsApiUrl(cfg);
  try {
    const res = await axios.get(url, {
      headers: githubHeaders(cfg.token),
      timeout: cfg.timeout,
      validateStatus: (s) => s === 200 || s === 404,
    });
    if (res.status === 404) {
      return { text: "", sha: null };
    }
    if (Array.isArray(res.data)) {
      throw new Error("GITHUB_PATH_IS_DIRECTORY");
    }
    return {
      text: decodeGithubFileContent(res.data.content),
      sha: res.data.sha || null,
    };
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return { text: "", sha: null };
    }
    throw err;
  }
}

async function putRemoteFile(cfg, fullText, sha, message) {
  const url = contentsApiUrl(cfg);
  const body = {
    message: message || `chore(feedback): append ${new Date().toISOString()}`,
    content: Buffer.from(fullText, "utf8").toString("base64"),
  };
  if (sha) {
    body.sha = sha;
  }
  const res = await axios.put(url, body, {
    headers: githubHeaders(cfg.token),
    timeout: cfg.timeout,
    validateStatus: () => true,
  });
  if (res.status >= 200 && res.status < 300) {
    return;
  }
  const ghMsg = res.data && res.data.message ? String(res.data.message) : "";
  let msg =
    ghMsg || `GitHub API ${res.status}`;
  if (res.status === 404 || /not\s*found/i.test(ghMsg)) {
    msg = `${ghMsg || "Not Found"}：请确认仓库 ${cfg.owner}/${cfg.repo}、文件路径 ${cfg.filePath}，且 Token 对该仓库有 contents 读写权限`;
  }
  const e = new Error(msg);
  e.status = res.status;
  throw e;
}

/**
 * 将一条反馈块追加到 GitHub 上 backend/feedback.md；409 时重试以合并并发写入。
 */
async function appendFeedbackBlockToGithub(block) {
  const cfg = readGithubConfig();
  if (!cfg.token) {
    throw new Error("MISSING_GITHUB_FEEDBACK_TOKEN");
  }
  const maxAttempts = 4;
  let lastErr;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const { text, sha } = await fetchRemoteFile(cfg);
      const next = `${text}${block}`;
      await putRemoteFile(
        cfg,
        next,
        sha,
        `feedback: ${new Date().toISOString()}`,
      );
      return { mode: "github" };
    } catch (err) {
      lastErr = err;
      const st = err.status || (err.response && err.response.status);
      if (st === 409 && attempt < maxAttempts - 1) {
        continue;
      }
      throw err;
    }
  }
  throw lastErr || new Error("GITHUB_APPEND_FAILED");
}

function appendFeedbackBlockLocal(block) {
  const localPath = path.join(__dirname, "..", "..", "feedback.md");
  fs.appendFileSync(localPath, block, "utf8");
  return { mode: "local" };
}

/**
 * 生产环境必须有 GITHUB_FEEDBACK_TOKEN（或 GITHUB_TOKEN）；本地未配置时写入 backend/feedback.md。
 */
async function persistFeedbackBlock(block) {
  const cfg = readGithubConfig();
  const isProd = String(process.env.NODE_ENV || "").toLowerCase() === "production";
  if (cfg.token) {
    return appendFeedbackBlockToGithub(block);
  }
  if (isProd) {
    throw new Error("MISSING_GITHUB_FEEDBACK_TOKEN");
  }
  return appendFeedbackBlockLocal(block);
}

module.exports = {
  appendFeedbackBlockToGithub,
  persistFeedbackBlock,
  readGithubConfig,
};
