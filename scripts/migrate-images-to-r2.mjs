#!/usr/bin/env node

import process from "node:process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_BATCH_SIZE = 5;

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

loadEnvFileIfPresent(path.join(repoRoot, ".env.local"));

function getArgValue(flag, fallback = "") {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] || fallback;
}

const dryRun = process.argv.includes("--dry-run");
const productId = getArgValue("--product-id", "");
const batchSize = Number(
  getArgValue("--batch-size", String(DEFAULT_BATCH_SIZE)),
);

if (!Number.isFinite(batchSize) || batchSize <= 0) {
  throw new Error("--batch-size mora biti pozitivan broj.");
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
  throw new Error(
    "Postavite R2_AUTH_TOKEN env var za lokalni Node proces (wrangler secret je dostupan samo Worker runtime-u). Primer: R2_AUTH_TOKEN=... npm run migrate:images",
  );
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

function sanitizeSegment(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
}

function asImageArray(product) {
  if (Array.isArray(product.images) && product.images.length > 0) {
    return product.images
      .map((entry) => (typeof entry === "string" ? { url: entry } : entry))
      .filter((entry) => entry?.url);
  }

  if (product.mainImageUrl) return [{ url: product.mainImageUrl }];
  if (product.image) return [{ url: product.image }];
  return [];
}

async function downloadImage(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download failed ${res.status}: ${url}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function uploadToR2(buffer, key, contentType = "image/webp") {
  if (dryRun) {
    return `${r2WorkerUrl}/images/${key}`;
  }

  const res = await fetch(`${r2WorkerUrl}/images/${key}`, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "X-Auth-Token": r2AuthToken,
    },
    body: buffer,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`R2 upload failed ${res.status}: ${body}`);
  }

  return `${r2WorkerUrl}/images/${key}`;
}

async function migrateProduct(docSnap, index, total) {
  const product = docSnap.data();
  const slug =
    sanitizeSegment(product.slug || product.name || docSnap.id) || docSnap.id;
  const sourceImages = asImageArray(product);

  if (sourceImages.length === 0) {
    console.log(`[${index}/${total}] - ${slug} preskocen (nema slika)`);
    return { status: "skipped" };
  }

  const nextImages = [];

  for (let i = 0; i < sourceImages.length; i += 1) {
    const source = sourceImages[i];
    const base = `${Date.now()}-${i + 1}-${crypto.randomUUID().slice(0, 8)}`;

    const originalBuffer = await downloadImage(source.url);
    const originalWebp = await sharp(originalBuffer)
      .webp({ quality: 85 })
      .toBuffer();
    const thumbWebp = await sharp(originalBuffer)
      .resize(256, 256, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();

    const originalKey = `${slug}/${base}-original.webp`;
    const thumbKey = `${slug}/${base}-thumb.webp`;

    const [originalUrl, thumbUrl] = await Promise.all([
      uploadToR2(originalWebp, originalKey),
      uploadToR2(thumbWebp, thumbKey),
    ]);

    nextImages.push({
      url: originalUrl,
      thumb: thumbUrl,
      path: `images/${originalKey}`,
    });
  }

  const patch = {
    images: nextImages,
    mainImageUrl: nextImages[0]?.url || "",
    thumbnailUrl: nextImages[0]?.thumb || nextImages[0]?.url || "",
    image: nextImages[0]?.url || "",
    migration: {
      r2MigratedAt: new Date().toISOString(),
      sourceMainImageUrl: product.mainImageUrl || "",
      sourceThumbnailUrl: product.thumbnailUrl || "",
      sourceImage: product.image || "",
    },
  };

  if (!dryRun) {
    await docSnap.ref.update(patch);
  }

  console.log(
    `[${index}/${total}] ✓ ${slug} — ${nextImages.length} images migrated`,
  );
  return { status: "ok" };
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
  `Migracija pokrenuta: ${docs.length} proizvoda (dry-run: ${dryRun ? "DA" : "NE"})`,
);

const summary = {
  ok: 0,
  skipped: 0,
  failed: 0,
};

await runWithConcurrency(docs, batchSize, async (doc, idx, total) => {
  try {
    const result = await migrateProduct(doc, idx, total);
    summary[result.status] += 1;
  } catch (error) {
    summary.failed += 1;
    console.error(`[${idx}/${total}] x ${doc.id} — ${error.message}`);
  }
});

console.log("---");
console.log(
  `Zavrseno. OK: ${summary.ok}, preskoceno: ${summary.skipped}, greske: ${summary.failed}`,
);
