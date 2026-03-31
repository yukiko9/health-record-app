const fs = require("fs");
const path = require("path");
const config = require("./config");

const defaultState = {
  users: {},
  records: []
};

function resolveDataFilePath() {
  if (config.dataFilePath) return config.dataFilePath;
  return path.resolve(__dirname, "../data/db.json");
}

const dataFilePath = resolveDataFilePath();
let state = { ...defaultState };

function ensureDataDir() {
  const dir = path.dirname(dataFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadStateFromFile() {
  if (config.isVercel) return;
  ensureDataDir();
  if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify(defaultState, null, 2), "utf-8");
    return;
  }
  try {
    const raw = fs.readFileSync(dataFilePath, "utf-8");
    const parsed = JSON.parse(raw || "{}");
    state = {
      users: parsed.users && typeof parsed.users === "object" ? parsed.users : {},
      records: Array.isArray(parsed.records) ? parsed.records : []
    };
  } catch (err) {
    state = { ...defaultState };
  }
}

function saveStateToFile() {
  if (config.isVercel) return;
  ensureDataDir();
  fs.writeFileSync(dataFilePath, JSON.stringify(state, null, 2), "utf-8");
}

function getState() {
  return state;
}

function setState(next) {
  state = next;
  saveStateToFile();
}

function updateState(updater) {
  const next = updater(state);
  state = next;
  saveStateToFile();
  return state;
}

loadStateFromFile();

module.exports = {
  getState,
  setState,
  updateState
};
