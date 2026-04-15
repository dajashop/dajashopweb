import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const DIST_ASSETS_DIR = join(process.cwd(), "dist", "assets");

// Budgets in KiB (binary, 1024 bytes)
const CHUNK_BUDGETS_KIB = {
  index: 120,
  "vendor-react": 300,
  "vendor-firebase-core": 140,
  "vendor-firebase-auth": 180,
  "vendor-firebase-firestore": 260,
  "vendor-firebase-functions": 120,
  "vendor-firebase-storage": 120,
  "vendor-firebase-analytics": 90,
  "vendor-firebase-app-check": 100,
  "vendor-motion": 180,
  "vendor-three": 1100,
  "vendor-exceljs": 1100,
  "vendor-icons": 140,
};

const DEFAULT_BUDGET_KIB = 200;
const BUDGET_KEYS_DESC = Object.keys(CHUNK_BUDGETS_KIB).sort(
  (a, b) => b.length - a.length,
);

function toKiB(bytes) {
  return bytes / 1024;
}

function normalizeChunkName(fileName) {
  // Matches names like "index-abc123.js" or "exceljs.min-abc123.js"
  const match = fileName.match(/^(.*)-[A-Za-z0-9_-]+\.js$/);
  return match ? match[1] : fileName.replace(/\.js$/, "");
}

function getBudgetForChunk(file, chunkName) {
  const matchedKey = BUDGET_KEYS_DESC.find(
    (key) => file.startsWith(`${key}-`) || chunkName === key,
  );
  if (!matchedKey)
    return { budgetKiB: DEFAULT_BUDGET_KIB, budgetKey: "default" };
  return {
    budgetKiB: CHUNK_BUDGETS_KIB[matchedKey],
    budgetKey: matchedKey,
  };
}

function collectJsChunks() {
  const files = readdirSync(DIST_ASSETS_DIR);
  return files
    .filter((name) => name.endsWith(".js"))
    .map((name) => {
      const fullPath = join(DIST_ASSETS_DIR, name);
      const sizeBytes = statSync(fullPath).size;
      return {
        file: name,
        chunkName: normalizeChunkName(name),
        sizeBytes,
        sizeKiB: toKiB(sizeBytes),
      };
    })
    .sort((a, b) => b.sizeBytes - a.sizeBytes);
}

function run() {
  let chunks;
  try {
    chunks = collectJsChunks();
  } catch (error) {
    console.error(
      "[chunk-budgets] Unable to read dist assets. Run build first.",
    );
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  const failures = [];

  for (const chunk of chunks) {
    const { budgetKiB, budgetKey } = getBudgetForChunk(
      chunk.file,
      chunk.chunkName,
    );
    if (chunk.sizeKiB > budgetKiB) {
      failures.push({
        ...chunk,
        budgetKiB,
        budgetKey,
      });
    }
  }

  console.log("[chunk-budgets] Checked JS chunks in dist/assets");
  for (const chunk of chunks.slice(0, 12)) {
    const { budgetKiB, budgetKey } = getBudgetForChunk(
      chunk.file,
      chunk.chunkName,
    );
    console.log(
      ` - ${chunk.file}: ${chunk.sizeKiB.toFixed(2)} KiB (budget ${budgetKiB} KiB, key ${budgetKey})`,
    );
  }

  if (failures.length > 0) {
    console.error(
      "\n[chunk-budgets] Budget exceeded for the following chunks:",
    );
    for (const fail of failures) {
      console.error(
        ` - ${fail.file}: ${fail.sizeKiB.toFixed(2)} KiB > ${fail.budgetKiB} KiB`,
      );
    }
    process.exit(1);
  }

  console.log("\n[chunk-budgets] All chunk budgets are within limits.");
}

run();
