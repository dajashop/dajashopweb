#!/usr/bin/env node

import process from "node:process";
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

const { default: admin } = await import("firebase-admin");

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

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/đ/g, "dj")
    .replace(/ž/g, "z")
    .replace(/č/g, "c")
    .replace(/ć/g, "c")
    .replace(/š/g, "s")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
}

function extractR2Key(url) {
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

function asImageEntries(product) {
  if (Array.isArray(product.images) && product.images.length > 0) {
    return product.images
      .map((entry, index) => {
        if (typeof entry === "string") {
          return {
            source: entry,
            originalUrl: entry,
            thumbUrl: index === 0 ? product.thumbnailUrl || entry : entry,
            index,
          };
        }

        if (
          entry &&
          typeof entry === "object" &&
          typeof entry.url === "string"
        ) {
          return {
            source: entry,
            originalUrl: entry.url,
            thumbUrl:
              entry.thumb ||
              (index === 0 ? product.thumbnailUrl || entry.url : entry.url),
            index,
          };
        }

        return null;
      })
      .filter(Boolean);
  }

  const fallbackOriginal = product.mainImageUrl || product.image || "";
  if (!fallbackOriginal) return [];

  return [
    {
      source: null,
      originalUrl: fallbackOriginal,
      thumbUrl: product.thumbnailUrl || fallbackOriginal,
      index: 0,
    },
  ];
}

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`GET ${res.status} za ${url}`);
  }

  const contentType = res.headers.get("Content-Type") || "image/webp";
  const body = await res.arrayBuffer();
  return { buffer: body, contentType };
}

async function putObject(key, data, contentType) {
  if (dryRun) {
    return `${r2WorkerUrl}/images/${key}`;
  }

  const res = await fetch(`${r2WorkerUrl}/images/${key}`, {
    method: "PUT",
    headers: {
      "Content-Type": contentType || "image/webp",
      "X-Auth-Token": r2AuthToken,
    },
    body: data,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PUT ${res.status} za ${key}: ${body}`);
  }

  return `${r2WorkerUrl}/images/${key}`;
}

async function copyObjectToKey(sourceUrl, targetKey) {
  const { buffer, contentType } = await fetchBuffer(sourceUrl);
  return putObject(targetKey, buffer, contentType);
}

async function deleteObjectByKey(key) {
  if (!key || dryRun) return;

  const res = await fetch(`${r2WorkerUrl}/images/${key}`, {
    method: "DELETE",
    headers: {
      "X-Auth-Token": r2AuthToken,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`DELETE ${res.status} za ${key}: ${body}`);
  }
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

async function migrateProduct(docSnap, position, total) {
  const product = docSnap.data();
  const slug =
    slugify(product.slug || product.name || docSnap.id) || docSnap.id;
  const entries = asImageEntries(product);

  if (entries.length === 0) {
    console.log(`[${position}/${total}] - ${slug} preskocen (nema slika)`);
    return { status: "skipped" };
  }

  const updatedImages = [];
  const keysToDelete = new Set();

  for (const entry of entries) {
    const index = entry.index;
    const originalKey = `${slug}/${slug}-${index + 1}.webp`;
    const thumbKey = `${slug}/${slug}-${index + 1}-thumb.webp`;

    const sourceOriginalUrl = entry.originalUrl;
    const sourceThumbUrl = entry.thumbUrl || entry.originalUrl;

    const oldOriginalKey = extractR2Key(sourceOriginalUrl);
    const oldThumbKey = extractR2Key(sourceThumbUrl);

    const newOriginalUrl = await copyObjectToKey(
      sourceOriginalUrl,
      originalKey,
    );
    const newThumbUrl = await copyObjectToKey(sourceThumbUrl, thumbKey);

    if (oldOriginalKey && oldOriginalKey !== originalKey)
      keysToDelete.add(oldOriginalKey);
    if (oldThumbKey && oldThumbKey !== thumbKey) keysToDelete.add(oldThumbKey);

    const sourceObject =
      entry.source && typeof entry.source === "object" ? entry.source : {};
    updatedImages.push({
      ...sourceObject,
      url: newOriginalUrl,
      thumb: newThumbUrl,
      path: `images/${originalKey}`,
      thumbPath: `images/${thumbKey}`,
    });
  }

  const patch = {
    images: updatedImages,
    mainImageUrl: updatedImages[0]?.url || "",
    thumbnailUrl: updatedImages[0]?.thumb || updatedImages[0]?.url || "",
    image: updatedImages[0]?.url || "",
    migration: {
      ...(product.migration || {}),
      seoRenameAt: new Date().toISOString(),
    },
  };

  if (!dryRun) {
    await docSnap.ref.update(patch);

    for (const key of keysToDelete) {
      await deleteObjectByKey(key);
    }
  }

  console.log(
    `[${position}/${total}] ✓ ${slug} — renamed ${updatedImages.length} images, old keys: ${keysToDelete.size}`,
  );

  return { status: "ok" };
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
  `SEO rename migracija pokrenuta: ${docs.length} proizvoda (dry-run: ${dryRun ? "DA" : "NE"})`,
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
