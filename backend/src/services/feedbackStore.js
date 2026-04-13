const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

function findGitRoot(startFile) {
  let dir = path.dirname(path.resolve(startFile));
  for (let i = 0; i < 12; i += 1) {
    const gitDir = path.join(dir, ".git");
    if (fs.existsSync(gitDir)) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
  return null;
}

function execGit(cwd, args) {
  execFileSync("git", args, {
    cwd,
    stdio: "pipe",
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: "0",
    },
  });
}

function execErrorText(err) {
  if (!err) return "";
  if (err.stderr) {
    return Buffer.isBuffer(err.stderr)
      ? err.stderr.toString("utf8")
      : String(err.stderr);
  }
  return String(err.message || err);
}

/**
 * 将一条反馈追加到 feedback.md；若 FEEDBACK_GIT_PUSH=1 且存在 .git，则尝试 commit + push 写回远程仓库。
 * 云托管镜像若构建时未保留 .git，需自行挂载含仓库的目录或设置 FEEDBACK_GIT_REPO_ROOT。
 */
function appendFeedbackBlock(feedbackMdPath, block) {
  fs.appendFileSync(feedbackMdPath, block, "utf8");
}

function tryCommitPushFeedback(feedbackMdPath) {
  if (process.env.FEEDBACK_GIT_PUSH !== "1") {
    return { skipped: true };
  }
  const explicitRoot = process.env.FEEDBACK_GIT_REPO_ROOT;
  const gitRoot =
    (explicitRoot && explicitRoot.trim() && path.resolve(explicitRoot.trim())) ||
    findGitRoot(feedbackMdPath);
  if (!gitRoot) {
    // eslint-disable-next-line no-console
    console.warn(
      "[feedback] FEEDBACK_GIT_PUSH=1 but .git not found; set FEEDBACK_GIT_REPO_ROOT or ship .git in image",
    );
    return { skipped: false, error: "no_git_root" };
  }

  const rel = path
    .relative(gitRoot, path.resolve(feedbackMdPath))
    .replace(/\\/g, "/");
  if (rel.startsWith("..")) {
    // eslint-disable-next-line no-console
    console.warn(
      "[feedback] feedback.md is outside FEEDBACK_GIT_REPO_ROOT — set root to the repo directory that CONTAINS this file on the same filesystem. feedbackMd=%s gitRoot=%s rel=%s",
      path.resolve(feedbackMdPath),
      gitRoot,
      rel,
    );
    return { skipped: false, error: "path_outside_repo" };
  }

  const authorName =
    process.env.FEEDBACK_GIT_AUTHOR_NAME || "feedback-bot";
  const authorEmail =
    process.env.FEEDBACK_GIT_AUTHOR_EMAIL || "feedback@cloud-run.local";
  const branch = process.env.FEEDBACK_GIT_BRANCH || "main";

  try {
    execGit(gitRoot, ["add", "--", rel]);
    try {
      execGit(gitRoot, [
        "-c",
        `user.name=${authorName}`,
        "-c",
        `user.email=${authorEmail}`,
        "commit",
        "-m",
        `chore(feedback): append ${new Date().toISOString()}`,
        "--",
        rel,
      ]);
    } catch (e) {
      const msg = execErrorText(e);
      if (/nothing to commit|no changes added to commit/i.test(msg)) {
        return { skipped: false, committed: false };
      }
      throw e;
    }
    const remote = process.env.FEEDBACK_GIT_REMOTE || "origin";
    execGit(gitRoot, ["push", remote, `HEAD:${branch}`]);
    return { skipped: false, committed: true, pushed: true };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[feedback] git commit/push failed", err && err.message);
    return { skipped: false, error: err && err.message ? String(err.message) : "git_failed" };
  }
}

module.exports = {
  appendFeedbackBlock,
  tryCommitPushFeedback,
};
