const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const syncScript = path.join(__dirname, "sync-portraits.cjs");
const vinextCli = path.join(root, "node_modules", "vinext", "dist", "cli.js");
const watchedDirectories = ["cn", "jp", "kr"].map((name) =>
  path.join(root, "Image_ckj", name)
);

function syncGallery() {
  const result = spawnSync(process.execPath, [syncScript], {
    cwd: root,
    stdio: "inherit"
  });
  if (result.status !== 0) {
    console.error("Gallery sync failed; keeping the last valid manifest.");
  }
}

syncGallery();

let debounceTimer = null;
const watchers = [];
for (const directory of watchedDirectories) {
  fs.mkdirSync(directory, { recursive: true });
  const watcher = fs.watch(directory, () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(syncGallery, 700);
  });
  watchers.push(watcher);
}

const server = spawn(process.execPath, [vinextCli, "dev"], {
  cwd: root,
  stdio: "inherit"
});

function shutdown(signal) {
  for (const watcher of watchers) watcher.close();
  if (!server.killed) server.kill(signal);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
server.on("exit", (code) => {
  for (const watcher of watchers) watcher.close();
  process.exit(code ?? 0);
});
