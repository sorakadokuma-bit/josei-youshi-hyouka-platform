const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const server = path.join(dist, "server");
const ssr = path.join(server, "ssr");
const hostingSource = path.join(root, ".openai", "hosting.json");
const hostingTargetDir = path.join(dist, ".openai");

const serverJs = path.join(server, "index.js");
const serverMjs = path.join(server, "index.mjs");
const ssrJs = path.join(ssr, "index.js");
const ssrMjs = path.join(ssr, "index.mjs");

if (!fs.existsSync(serverJs) && !fs.existsSync(serverMjs)) {
  throw new Error("vinext build did not produce a server entrypoint");
}

if (!fs.existsSync(serverJs)) {
  fs.copyFileSync(serverMjs, serverJs);
}

if (!fs.existsSync(ssrJs) && fs.existsSync(ssrMjs)) {
  fs.copyFileSync(ssrMjs, ssrJs);
}

fs.mkdirSync(hostingTargetDir, { recursive: true });
fs.copyFileSync(hostingSource, path.join(hostingTargetDir, "hosting.json"));

console.log("Prepared Sites entrypoint and hosting metadata.");
