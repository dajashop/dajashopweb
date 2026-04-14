#!/usr/bin/env node

import process from "node:process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_BATCH_SIZE = 5;
const TARGET_SIZE = 512;
const TARGET_QUALITY = 75;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

function parseJsonObject(input, sourceLabel) {
  const normalized = String(input || "")
    .replace(/^\uFEFF/, "")
    .trim();
  const start = normalized.indexOf("{");
  const end = normalized.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Neispravan JSON u ${sourceLabel}.`);
  }

  const candidate = normalized.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch (error) {
    throw new Error(
      `Ne mogu da parsiram JSON iz ${sourceLabel}: ${error.message}`,
    );
  }
}

function loadEnvFileIfPresent(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalIdx = line.indexOf("=");
    if (equalIdx <= 0) continue;

    const key = line.slice(0, equalIdx).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = line.slice(equalIdx + 1).trim();
    const hasQuotes =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (hasQuotes) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function getArgValue(flag, fallback = "") {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] || fallback;
}

loadEnvFileIfPresent(path.join(repoRoot, ".env.local"));

const dryRun = process.argv.includes("--dry-run");
const confirmed = process.argv.includes("--confirm");
const productId = getArgValue("--product-id", "");
const batchSize = Number(
  getArgValue("--batch-size", String(DEFAULT_BATCH_SIZE)),
);

if (!Number.isFinite(batchSize) || batchSize <= 0) {
  throw new Error("--batch-size mora biti pozitivan broj.");
}

if (!dryRun && !confirmed) {
  throw new Error(
    "Produkcijska migracija zahteva --confirm. Preporuka: prvo pokreni sa --dry-run.",
  );
}

const projectId =
  process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "";
const serviceAccountJson =
  process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || "";
const serviceAccountPath = path.join(repoRoot, "serviceAccount.json");
const hasServiceAccountFile = fs.existsSync(serviceAccountPath);
const r2WorkerUrl = String(
  process.env.R2_WORKER_URL || process.env.VITE_R2_WORKER_URL || "",
).replace(/\/$/, "");
const r2AuthToken =
  process.env.R2_AUTH_TOKEN || process.env.VITE_R2_AUTH_TOKEN || "";

if (!projectId) {
  throw new Error("Postavite FIREBASE_PROJECT_ID env var.");
}

if (
  !serviceAccountJson &&
  !process.env.GOOGLE_APPLICATION_CREDENTIALS &&
  !hasServiceAccountFile
) {
  throw new Error(
    "Postavite GOOGLE_APPLICATION_CREDENTIALS ili GOOGLE_APPLICATION_CREDENTIALS_JSON, ili dodajte serviceAccount.json u root.",
  );
}

if (!r2WorkerUrl) {
  throw new Error("Postavite R2_WORKER_URL env var.");
}

if (!dryRun && !r2AuthToken) {
  throw new Error("Postavite R2_AUTH_TOKEN env var za migraciju.");
}

const [{ default: admin }, { default: sharp }] = await Promise.all([
  import("firebase-admin"),
  import("sharp"),
]);

if (!admin.apps.length) {
  if (serviceAccountJson) {
    admin.initializeApp({
      credential: admin.credential.cert(
        parseJsonObject(
          serviceAccountJson,
          "GOOGLE_APPLICATION_CREDENTIALS_JSON",
        ),
      ),
    });
  } else if (
    !process.env.GOOGLE_APPLICATION_CREDENTIALS &&
    hasServiceAccountFile
  ) {
    admin.initializeApp({
      credential: admin.credential.cert(
        parseJsonObject(
          fs.readFileSync(serviceAccountPath, "utf8"),
          "serviceAccount.json",
        ),
      ),
    });
  } else {
    admin.initializeApp();
  }
}

const db = admin.firestore();

function asImageEntries(product) {
  if (!Array.isArray(product.images) || product.images.length === 0) {
    return [];
  }

  return product.images
    .map((entry, index) => {
      if (typeof entry === "string") {
        return {
          index,
          originalUrl: entry,
          thumbUrl: index === 0 ? product.thumbnailUrl || "" : "",
        };
      }

      if (entry && typeof entry === "object" && typeof entry.url === "string") {
        return {
          index,
          originalUrl: entry.url,
          thumbUrl:
            typeof entry.thumb === "string"
              ? entry.thumb
              : index === 0
                ? product.thumbnailUrl || ""
                : "",
        };
      }

      return null;
    })
    .filter(Boolean);
}

function extractR2KeyFromThumbUrl(url) {
  if (!url || typeof url !== "string") return "";

  try {
    const parsed = new URL(url);
    const marker = "/images/";
    const idx = parsed.pathname.indexOf(marker);
    if (idx === -1) return "";
    return decodeURIComponent(parsed.pathname.slice(idx + marker.length));
  } catch {
    return "";
  }
}

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`GET ${res.status} za ${url}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function uploadToR2(buffer, key) {
  if (dryRun) {
    return `${r2WorkerUrl}/images/${key}`;
  }

  const res = await fetch(`${r2WorkerUrl}/images/${key}`, {
    method: "PUT",
    headers: {
      "Content-Type": "image/webp",
      "X-Auth-Token": r2AuthToken,
    },
    body: new Uint8Array(buffer),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PUT ${res.status} za ${key}: ${body}`);
  }

  return `${r2WorkerUrl}/images/${key}`;
}

async function readDimensions(buffer) {
  const metadata = await sharp(buffer).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
  };
}

async function runWithConcurrency(items, concurrency, worker) {
  const results = [];
  let cursor = 0;

  async function next() {
    if (cursor >= items.length) return;
    const item = items[cursor];
    cursor += 1;
    const result = await worker(item, cursor, items.length);
    results.push(result);
    await next();
  }

  const starters = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => next(),
  );
  await Promise.all(starters);
  return results;
}

const summary = {
  productsTotal: 0,
  productsWithImages: 0,
  productsSkipped: 0,
  thumbsTotal: 0,
  thumbsProcessed: 0,
  thumbsFailed: 0,
};

async function migrateProduct(docSnap, position, total) {
  const product = docSnap.data();
  const productLabel = product.slug || product.name || docSnap.id;
  const entries = asImageEntries(product);
  summary.productsTotal += 1;

  if (entries.length === 0) {
    summary.productsSkipped += 1;
    console.log(
      `[${position}/${total}] - ${docSnap.id} (${productLabel}) preskocen (nema images[])`,
    );
    return;
  }

  summary.productsWithImages += 1;

  let productProcessed = 0;
  let productFailed = 0;

  for (const entry of entries) {
    const imageIndex = entry.index + 1;
    const originalUrl = entry.originalUrl;
    const thumbUrl = entry.thumbUrl;

    if (!originalUrl || !thumbUrl) {
      productFailed += 1;
      summary.thumbsFailed += 1;
      console.log(
        `  x [${docSnap.id} #${imageIndex}] preskocen: nedostaje original ili thumb URL`,
      );
      continue;
    }

    const thumbKey = extractR2KeyFromThumbUrl(thumbUrl);
    if (!thumbKey) {
      productFailed += 1;
      summary.thumbsFailed += 1;
      console.log(
        `  x [${docSnap.id} #${imageIndex}] preskocen: nije moguce parsirati R2 key iz thumb URL-a`,
      );
      continue;
    }

    summary.thumbsTotal += 1;

    try {
      const [originalBuffer, oldThumbBuffer] = await Promise.all([
        fetchBuffer(originalUrl),
        fetchBuffer(thumbUrl),
      ]);

      const oldSize = await readDimensions(oldThumbBuffer);
      const newThumbBuffer = await sharp(originalBuffer)
        .resize(TARGET_SIZE, TARGET_SIZE, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: TARGET_QUALITY })
        .toBuffer();
      const newSize = await readDimensions(newThumbBuffer);

      if (!dryRun) {
        await uploadToR2(newThumbBuffer, thumbKey);
      }

      summary.thumbsProcessed += 1;
      productProcessed += 1;

      console.log(
        `  ✓ [${docSnap.id} #${imageIndex}] ${thumbKey} | ${oldSize.width}x${oldSize.height} -> ${newSize.width}x${newSize.height}`,
      );
    } catch (error) {
      productFailed += 1;
      summary.thumbsFailed += 1;
      console.log(
        `  x [${docSnap.id} #${imageIndex}] greska: ${error.message}`,
      );
    }
  }

  console.log(
    `[${position}/${total}] ${docSnap.id} (${productLabel}) zavrsen — uspesno: ${productProcessed}, greske: ${productFailed}`,
  );
}

const query = productId
  ? db
      .collection("products")
      .where(admin.firestore.FieldPath.documentId(), "==", productId)
  : db.collection("products");

const snapshot = await query.get();
const docs = snapshot.docs;

if (docs.length === 0) {
  console.log("Nema proizvoda za migraciju.");
  process.exit(0);
}

console.log(
  `Migracija thumbova 512 pokrenuta: ${docs.length} proizvoda (dry-run: ${dryRun ? "DA" : "NE"}, batch-size: ${batchSize})`,
);

await runWithConcurrency(docs, batchSize, migrateProduct);

console.log("---");
console.log(`Proizvoda ukupno: ${summary.productsTotal}`);
console.log(`Proizvoda sa images[]: ${summary.productsWithImages}`);
console.log(`Proizvoda preskoceno: ${summary.productsSkipped}`);
console.log(`Thumbova ukupno: ${summary.thumbsTotal}`);
console.log(`Thumbova uspesno: ${summary.thumbsProcessed}`);
console.log(`Thumbova neuspesno: ${summary.thumbsFailed}`);
