const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const publicDirectory = path.join(root, "public", "portraits");
const manifestPath = path.join(root, "public", "portraits.json");
const sourceRoot = path.join(root, "Image_ckj");
const sourceFolders = [
  { country: "CN", directory: path.join(sourceRoot, "cn") },
  { country: "JP", directory: path.join(sourceRoot, "jp") },
  { country: "KR", directory: path.join(sourceRoot, "kr") }
];
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function imageFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => path.join(directory, entry.name))
    .sort((left, right) => left.localeCompare(right, "zh-CN"));
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function loadExistingManifest() {
  if (!fs.existsSync(manifestPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return [];
  }
}

function inferCountry(fileName) {
  const match = fileName.match(/^(?:CKJ_)?(CN|JP|KR)_/i);
  return match ? match[1].toUpperCase() : null;
}

function syncImportedImages() {
  fs.mkdirSync(publicDirectory, { recursive: true });
  const publicHashes = new Map();
  for (const filePath of imageFiles(publicDirectory)) {
    publicHashes.set(sha256(filePath), path.basename(filePath));
  }

  let copied = 0;
  let duplicate = 0;
  for (const source of sourceFolders) {
    for (const sourcePath of imageFiles(source.directory)) {
      const digest = sha256(sourcePath);
      if (publicHashes.has(digest)) {
        duplicate += 1;
        continue;
      }
      const extension = path.extname(sourcePath).toLowerCase();
      const outputName = `CKJ_${source.country}_${digest.slice(0, 16)}${extension}`;
      const outputPath = path.join(publicDirectory, outputName);
      if (!fs.existsSync(outputPath)) {
        fs.copyFileSync(sourcePath, outputPath);
        copied += 1;
      }
      publicHashes.set(digest, outputName);
    }
  }
  return { copied, duplicate };
}

function buildManifest() {
  const oldItems = loadExistingManifest();
  const bySource = new Map(oldItems.map((item) => [item.src, item]));
  const byId = new Map(oldItems.map((item) => [item.id, item]));
  const items = [];

  for (const filePath of imageFiles(publicDirectory)) {
    const fileName = path.basename(filePath);
    const src = `/portraits/${encodeURIComponent(fileName)}`;
    const previous = bySource.get(src) || bySource.get(`/portraits/${fileName}`);
    const baseName = path.parse(fileName).name;
    const country = previous?.country || inferCountry(baseName);
    if (!country) continue;

    let id = previous?.id || baseName;
    if (byId.has(id) && byId.get(id)?.src !== src && byId.get(id)?.src !== `/portraits/${fileName}`) {
      id = `${baseName}_${sha256(filePath).slice(0, 8)}`;
    }

    items.push({
      ...(previous || {}),
      id,
      country,
      src
    });
  }

  const originalOrder = new Map(oldItems.map((item, index) => [item.id, index]));
  items.sort((left, right) => {
    const leftOriginal = originalOrder.has(left.id);
    const rightOriginal = originalOrder.has(right.id);
    if (leftOriginal && rightOriginal) {
      return originalOrder.get(left.id) - originalOrder.get(right.id);
    }
    if (leftOriginal) return -1;
    if (rightOriginal) return 1;
    return left.country.localeCompare(right.country) || left.id.localeCompare(right.id);
  });

  fs.writeFileSync(manifestPath, `${JSON.stringify(items, null, 2)}\n`, "utf8");
  return items;
}

const syncResult = syncImportedImages();
const manifest = buildManifest();
const counts = manifest.reduce(
  (result, item) => {
    result[item.country] = (result[item.country] || 0) + 1;
    return result;
  },
  {}
);

console.log(
  `Gallery synced: ${manifest.length} images ` +
    `(CN ${counts.CN || 0}, JP ${counts.JP || 0}, KR ${counts.KR || 0}); ` +
    `${syncResult.copied} new, ${syncResult.duplicate} duplicate source files skipped.`
);
