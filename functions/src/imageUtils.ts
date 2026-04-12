import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getDownloadURL as getAdminDownloadURL } from "firebase-admin/storage";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp"; // UVEZENO: Za obradu slika

if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Definicije za resize
const THUMBNAIL_SIZE = 256;
const THUMBNAIL_PREFIX = `thumb_${THUMBNAIL_SIZE}_`;
const ORIGINAL_PREFIX = "original_";
const ADDITIONAL_PREFIX = "additional_";

// --- TIP DEFINICIJE ZA ROBUSTNOST KODA (Ispravljaju sve prethodne greške) ---

interface UploadSuccess {
  success: true;
  originalUrl: string;
  newUrl: string;
  storagePath: string;
  isThumbnail?: boolean;
  thumbnailUrl?: string;
}

interface UploadFailure {
  success: false;
  originalUrl: string;
  error: any;
}

type UploadResult = UploadSuccess | UploadFailure;

interface DownloadSuccess {
  success: true;
  buffer: Buffer;
  contentType: string;
  url: string;
}
type DownloadResult =
  | DownloadSuccess
  | { success: false; error: string; url: string };

const ensureDownloadToken = async (file: any): Promise<void> => {
  const [metadata] = await file.getMetadata();
  const customMetadata = metadata.metadata || {};

  if (customMetadata.firebaseStorageDownloadTokens) {
    return;
  }

  await file.setMetadata({
    metadata: {
      ...customMetadata,
      firebaseStorageDownloadTokens: uuidv4(),
    },
  });
};

const getStableDownloadUrl = async (file: any): Promise<string> => {
  await ensureDownloadToken(file);
  return getAdminDownloadURL(file);
};

const getR2Config = () => {
  const workerUrl = String(process.env.R2_WORKER_URL || "").replace(/\/$/, "");
  const authToken = String(process.env.R2_AUTH_TOKEN || "").trim();

  if (!workerUrl || !authToken) {
    throw new HttpsError(
      "failed-precondition",
      "R2 konfiguracija nedostaje. Postavite R2_WORKER_URL i R2_AUTH_TOKEN.",
    );
  }

  return { workerUrl, authToken };
};

const assertAdminUser = (request: any) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Morate biti prijavljeni.");
  }

  const token = request.auth.token || {};
  if (token.admin === true) return;

  const allowed = String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

  const email = String(token.email || "").toLowerCase();
  if (email && allowed.includes(email)) return;

  throw new HttpsError("permission-denied", "Nemate admin dozvolu.");
};

const sanitizeSegment = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");

const sanitizeFilename = (value: string, fallback: string) => {
  const normalized = value.trim().toLowerCase();
  const safe = normalized
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");

  if (!safe) return fallback;
  return safe.endsWith(".webp") ? safe : `${safe}.webp`;
};

const uploadToR2 = async (
  buffer: Buffer,
  key: string,
  contentType: string,
): Promise<string> => {
  const { workerUrl, authToken } = getR2Config();
  const response = await fetch(`${workerUrl}/images/${key}`, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "X-Auth-Token": authToken,
    },
    body: new Uint8Array(buffer),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new HttpsError(
      "internal",
      `R2 upload neuspešan (${response.status}): ${message}`,
    );
  }

  return `${workerUrl}/images/${key}`;
};

const deleteR2BySlug = async (slug: string): Promise<void> => {
  const { workerUrl, authToken } = getR2Config();
  const response = await fetch(`${workerUrl}/images/${slug}/*`, {
    method: "DELETE",
    headers: {
      "X-Auth-Token": authToken,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new HttpsError(
      "internal",
      `R2 delete neuspešan (${response.status}): ${message}`,
    );
  }
};

const extractStoragePath = (
  input: unknown,
  bucketName: string,
): string | null => {
  if (typeof input !== "string" || input.trim().length === 0) {
    return null;
  }

  const value = input.trim();

  if (value.startsWith("gs://")) {
    const withoutScheme = value.slice(5);
    const firstSlashIndex = withoutScheme.indexOf("/");

    if (firstSlashIndex === -1) {
      return null;
    }

    const bucket = withoutScheme.slice(0, firstSlashIndex);
    const path = withoutScheme.slice(firstSlashIndex + 1);

    return bucket === bucketName && path ? decodeURIComponent(path) : null;
  }

  try {
    const parsed = new URL(value);
    const normalizedBucket = bucketName.toLowerCase();
    const host = parsed.hostname.toLowerCase();
    const cleanPath = parsed.pathname.replace(/^\/+/, "");

    if (host === normalizedBucket) {
      return cleanPath ? decodeURIComponent(cleanPath) : null;
    }

    if (host === "firebasestorage.googleapis.com") {
      const match = cleanPath.match(/^v\d+\/b\/([^/]+)\/o\/(.+)$/i);

      if (
        match &&
        decodeURIComponent(match[1]).toLowerCase() === normalizedBucket
      ) {
        return decodeURIComponent(match[2]);
      }
    }

    if (
      (host === "storage.googleapis.com" ||
        host === "storage.cloud.google.com") &&
      cleanPath.toLowerCase().startsWith(`${normalizedBucket}/`)
    ) {
      return decodeURIComponent(cleanPath.slice(bucketName.length + 1));
    }
  } catch {
    return null;
  }

  return null;
};

const repairStoredImage = async (
  bucket: any,
  bucketName: string,
  image: Record<string, unknown>,
) => {
  const path =
    (typeof image.path === "string" && image.path.trim()) ||
    extractStoragePath(image.url, bucketName);

  if (!path) {
    return {
      image,
      path: null as string | null,
      changed: false,
    };
  }

  const nextUrl = await getStableDownloadUrl(bucket.file(path));
  const nextImage = {
    ...image,
    path,
    url: nextUrl,
  };

  return {
    image: nextImage,
    path,
    changed: nextImage.url !== image.url || nextImage.path !== image.path,
  };
};

// Pomoćna funkcija za upload bafera i generisanje URL-a
const uploadBuffer = async (
  buffer: Buffer,
  basePath: string,
  bucket: any,
  originalUrl: string,
  contentType: string,
  fileNamePrefix: string = ORIGINAL_PREFIX,
): Promise<UploadSuccess> => {
  const normalizedBasePath = basePath
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");

  let extension = contentType.includes("png") ? "png" : "jpg";

  if (fileNamePrefix.includes(THUMBNAIL_PREFIX)) {
    extension = "webp"; // Koristimo efikasniji format za thumbnail
    contentType = "image/webp";
  } else {
    if (contentType.includes("png")) extension = "png";
    else if (contentType.includes("webp")) extension = "webp";
    else if (contentType.includes("svg")) extension = "svg";
  }

  const generatedFileName = `${fileNamePrefix}${Date.now()}_${uuidv4()}.${extension}`;
  const fileName = normalizedBasePath
    ? `${normalizedBasePath}/${generatedFileName}`
    : generatedFileName;
  const file = bucket.file(fileName);
  const downloadToken = uuidv4();

  await file.save(buffer, {
    metadata: {
      contentType: contentType,
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
  });

  const tokenizedUrl = await getAdminDownloadURL(file);

  return {
    success: true,
    originalUrl: originalUrl,
    newUrl: tokenizedUrl,
    storagePath: fileName,
  };
};

// Pomoćna funkcija za sigurno preuzimanje slike
const downloadSingleImage = async (url: string): Promise<DownloadResult> => {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept:
          "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });
    const buffer = Buffer.from(response.data, "binary");
    const contentType = response.headers["content-type"] || "image/jpeg";
    return { success: true, buffer, contentType, url };
  } catch (error: any) {
    return { success: false, error: error.message, url };
  }
};

// Pomoćna funkcija za OBRADU DODATNIH SLIKA (samo upload)
const processAdditionalImage = async (
  url: string,
  basePath: string,
): Promise<UploadResult> => {
  const downloadResult = await downloadSingleImage(url);

  // Ako preuzimanje nije uspelo, vraćamo neuspeh
  if (!downloadResult.success) {
    return { success: false, originalUrl: url, error: downloadResult.error };
  }

  // Ako je uspelo, obrađujemo bafer
  const { buffer, contentType } = downloadResult;

  try {
    const extension = contentType.includes("png") ? "png" : "jpg";
    const fileName = `${ADDITIONAL_PREFIX}${Date.now()}_${uuidv4()}.${extension}`;
    const key = `${basePath}/${fileName}`;
    const publicUrl = await uploadToR2(buffer, key, contentType);

    return {
      success: true,
      originalUrl: url,
      newUrl: publicUrl,
      storagePath: `images/${key}`,
    };
  } catch (error: any) {
    return {
      success: false,
      originalUrl: url,
      error: error?.message || "R2 upload failed",
    };
  }
};

// Pomoćna funkcija za OBRADU GLAVNE SLIKE (resize + original)
const processMainImageWithResize = async (url: string, basePath: string) => {
  const downloadResult = await downloadSingleImage(url);

  if (!downloadResult.success) {
    return {
      success: false,
      originalUrl: url,
      results: [] as UploadSuccess[],
      mainImageUrl: null,
      thumbnailUrl: null,
    };
  }

  const { buffer } = downloadResult;
  const originalUrl = url;
  const results: UploadSuccess[] = [];

  const originalFileName = `${ORIGINAL_PREFIX}${Date.now()}_${uuidv4()}.webp`;
  const originalKey = `${basePath}/${originalFileName}`;

  const originalWebp = await sharp(buffer).webp({ quality: 85 }).toBuffer();
  const originalR2Url = await uploadToR2(
    originalWebp,
    originalKey,
    "image/webp",
  );

  const originalUploadResult: UploadSuccess = {
    success: true,
    originalUrl,
    newUrl: originalR2Url,
    storagePath: `images/${originalKey}`,
  };
  results.push(originalUploadResult);

  // 2. Resize i upload THUMBNAIL-a (256x256 za Catalog)
  let thumbnailUrl: string | null = null;

  try {
    const resizedBuffer = await sharp(buffer)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: sharp.fit.inside,
        withoutEnlargement: true,
      })
      .webp({ quality: 75 })
      .toBuffer();

    const thumbnailFileName = `${THUMBNAIL_PREFIX}${Date.now()}_${uuidv4()}.webp`;
    const thumbnailKey = `${basePath}/${thumbnailFileName}`;
    const thumbnailR2Url = await uploadToR2(
      resizedBuffer,
      thumbnailKey,
      "image/webp",
    );

    const thumbnailUploadResult: UploadSuccess = {
      success: true,
      originalUrl,
      newUrl: thumbnailR2Url,
      storagePath: `images/${thumbnailKey}`,
      isThumbnail: true,
      thumbnailUrl: thumbnailR2Url,
    };

    thumbnailUrl = thumbnailUploadResult.newUrl;
    results.unshift(thumbnailUploadResult); // Thumbnail je PRVI u nizu
  } catch (resizeError: any) {
    console.error(
      `Failed to resize main image: ${originalUrl}`,
      resizeError.message,
    );
  }

  return {
    success: true,
    originalUrl,
    results: results,
    mainImageUrl: originalUploadResult.newUrl,
    thumbnailUrl: thumbnailUrl || originalUploadResult.newUrl,
  };
};

export const saveImageFromUrl = onCall(
  {
    region: "europe-west3",
    timeoutSeconds: 300,
    memory: "1GiB",
  },
  async (request) => {
    // --- PARSIRANJE ---
    const requestData = request.data as any;
    let inputUrls = requestData.url;
    let productName = requestData.productName;

    // Fallback za ugnježdene podatke
    if (!inputUrls && requestData.data) {
      inputUrls = requestData.data.url;
      productName = requestData.data.productName;
    }

    console.log("DEBUG: Raw URLs:", inputUrls);

    // Kljucna validacija (rešava 400 grešku ako je klijent poslao prazan string)
    if (
      !inputUrls ||
      typeof inputUrls !== "string" ||
      inputUrls.trim().length === 0
    ) {
      throw new HttpsError(
        "invalid-argument",
        "URL (ili lista URL-ova) je obavezan string.",
      );
    }

    // --- PRIPREMA NIZA LINKOVA ---
    const urlList = inputUrls
      .split(",")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (urlList.length === 0) {
      throw new HttpsError(
        "invalid-argument",
        "Nije pronađen nijedan validan link.",
      );
    }

    // Odvajamo prvu sliku za specijalnu obradu (resize)
    const mainImageUrl = urlList[0];
    const otherImageUrls = urlList.slice(1);

    try {
      // Sanitizacija imena foldera
      let folderName = "uncategorized";
      if (productName) {
        folderName = String(productName)
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9-_]/g, "-")
          .replace(/-+/g, "-");
      }

      const basePath = sanitizeSegment(folderName) || "uncategorized";

      // --- A. OBRADA GLAVNE SLIKE (sa resize-om) ---
      const mainImageProcess = await processMainImageWithResize(
        mainImageUrl,
        basePath,
      );

      if (!mainImageProcess.success && urlList.length === 1) {
        throw new HttpsError(
          "internal",
          `Backend greška prilikom obrade glavne slike: ${mainImageProcess.originalUrl}`,
        );
      }

      let allResults: UploadResult[] = mainImageProcess.results;

      // --- B. BATCH OBRADA OSTALIH SLIKA (Paralelno, bez resize-a) ---
      const otherResults: UploadResult[] = await Promise.all(
        otherImageUrls.map((url) => processAdditionalImage(url, basePath)),
      );

      // Spajamo sve rezultate u jedan niz (uspešne i neuspešne)
      allResults = [...allResults, ...otherResults];

      const successfulUploads = allResults.filter(
        (r): r is UploadSuccess => r.success,
      );

      // --- FINALNI RETURN OBJEKAT ---
      return {
        success: successfulUploads.length > 0,
        // Vraćamo prvi uspešan link KAO THUMBNAIL (url: thumbnailUrl)
        url: mainImageProcess.thumbnailUrl,

        // NOVO: Eksplicitno vraćamo thumbnail URL i URL originala
        thumbnailUrl: mainImageProcess.thumbnailUrl,
        mainImageUrl: mainImageProcess.mainImageUrl,

        // Vraćamo kompletan niz rezultata
        results: allResults,
        totalProcessed: urlList.length,
        successCount: successfulUploads.length,
      };
    } catch (error: any) {
      console.error("Global Upload error:", error.message);
      throw new HttpsError("internal", `Backend greška: ${error.message}`);
    }
  },
);

export const uploadProductImagesToR2 = onCall(
  {
    region: "europe-west3",
    timeoutSeconds: 300,
    memory: "1GiB",
  },
  async (request) => {
    assertAdminUser(request);

    const data = (request.data || {}) as {
      slug?: string;
      index?: number;
      thumbBase64?: string;
      originalBase64?: string;
      thumbFilename?: string;
      originalFilename?: string;
    };

    const slug = sanitizeSegment(String(data.slug || ""));
    if (!slug) {
      throw new HttpsError("invalid-argument", "slug je obavezan.");
    }

    if (!data.thumbBase64 || !data.originalBase64) {
      throw new HttpsError(
        "invalid-argument",
        "thumbBase64 i originalBase64 su obavezni.",
      );
    }

    const thumbBuffer = Buffer.from(data.thumbBase64, "base64");
    const originalBuffer = Buffer.from(data.originalBase64, "base64");

    const thumbFileName = sanitizeFilename(
      data.thumbFilename || `${slug}-${Number(data.index || 0) + 1}-thumb.webp`,
      `${slug}-${Number(data.index || 0) + 1}-thumb.webp`,
    );
    const originalFileName = sanitizeFilename(
      data.originalFilename || `${slug}-${Number(data.index || 0) + 1}.webp`,
      `${slug}-${Number(data.index || 0) + 1}.webp`,
    );

    const thumbKey = `${slug}/${thumbFileName}`;
    const originalKey = `${slug}/${originalFileName}`;

    const thumb = await uploadToR2(thumbBuffer, thumbKey, "image/webp");
    const original = await uploadToR2(
      originalBuffer,
      originalKey,
      "image/webp",
    );

    return {
      success: true,
      thumb,
      original,
      path: `images/${originalKey}`,
      thumbPath: `images/${thumbKey}`,
    };
  },
);

export const deleteProductImagesFromR2 = onCall(
  {
    region: "europe-west3",
    timeoutSeconds: 180,
    memory: "256MiB",
  },
  async (request) => {
    assertAdminUser(request);

    const data = (request.data || {}) as { slug?: string };
    const slug = sanitizeSegment(String(data.slug || ""));

    if (!slug) {
      throw new HttpsError("invalid-argument", "slug je obavezan.");
    }

    await deleteR2BySlug(slug);
    return { success: true };
  },
);

export const generateThumbnailFromStorage = onCall(
  {
    region: "europe-west3",
    timeoutSeconds: 120,
    memory: "1GiB",
  },
  async (request) => {
    const requestData = request.data as any;
    let storagePath = requestData.storagePath;

    if (!storagePath && requestData.data) {
      storagePath = requestData.data.storagePath;
    }

    if (typeof storagePath !== "string" || storagePath.trim().length === 0) {
      throw new HttpsError(
        "invalid-argument",
        "storagePath je obavezan i mora biti validan string.",
      );
    }

    const normalizedStoragePath = storagePath.trim().replace(/^\/+/, "");
    const bucket = admin.storage().bucket();
    const originalFile = bucket.file(normalizedStoragePath);

    try {
      const [exists] = await originalFile.exists();

      if (!exists) {
        throw new HttpsError(
          "not-found",
          "Originalna slika nije pronađena u Storage-u.",
        );
      }

      const [originalBuffer] = await originalFile.download();

      const resizedBuffer = await sharp(originalBuffer)
        .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
          fit: sharp.fit.inside,
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer();

      const lastSlashIndex = normalizedStoragePath.lastIndexOf("/");
      const basePath =
        lastSlashIndex === -1
          ? ""
          : normalizedStoragePath.slice(0, lastSlashIndex);

      const thumbnailUploadResult = await uploadBuffer(
        resizedBuffer,
        basePath,
        bucket,
        normalizedStoragePath,
        "image/webp",
        THUMBNAIL_PREFIX,
      );

      const mainImageUrl = await getStableDownloadUrl(originalFile);

      return {
        success: true,
        thumbnailUrl: thumbnailUploadResult.newUrl,
        mainImageUrl,
        thumbnailPath: thumbnailUploadResult.storagePath,
      };
    } catch (error: any) {
      if (error instanceof HttpsError) {
        throw error;
      }

      console.error(
        `Greška pri generisanju thumbnail-a za path: ${normalizedStoragePath}`,
        error?.message || error,
      );

      throw new HttpsError(
        "internal",
        "Došlo je do greške pri generisanju thumbnail-a.",
      );
    }
  },
);

export const repairProductImageUrls = onCall(
  {
    region: "europe-west3",
    timeoutSeconds: 540,
    memory: "1GiB",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Morate biti prijavljeni da biste pokrenuli popravku slika.",
      );
    }

    const requestData = (request.data || {}) as {
      productId?: string;
    };
    const productId = requestData.productId?.trim() || "";

    const db = admin.firestore();
    const bucket = admin.storage().bucket();
    const bucketName = bucket.name;

    const docs = productId
      ? [await db.collection("products").doc(productId).get()]
      : (await db.collection("products").get()).docs;

    if (productId && (!docs[0] || !docs[0].exists)) {
      throw new HttpsError("not-found", "Proizvod nije pronađen.");
    }

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const productDoc of docs) {
      const productData = productDoc.data();

      if (!productData) {
        skippedCount += 1;
        continue;
      }

      try {
        const currentImages = Array.isArray(productData.images)
          ? productData.images.filter(
              (image): image is Record<string, unknown> =>
                !!image && typeof image === "object",
            )
          : [];

        const repairedImageResults = await Promise.all(
          currentImages.map((image) =>
            repairStoredImage(bucket, bucketName, image),
          ),
        );

        const repairedImages = repairedImageResults.map((entry) => entry.image);
        const primaryPath =
          repairedImageResults[0]?.path ||
          extractStoragePath(productData.mainImageUrl, bucketName) ||
          extractStoragePath(productData.image, bucketName);
        const thumbnailPath =
          extractStoragePath(productData.thumbnailUrl, bucketName) || null;

        const mainImageUrl = primaryPath
          ? await getStableDownloadUrl(bucket.file(primaryPath))
          : repairedImages[0]?.url || "";
        const thumbnailUrl = thumbnailPath
          ? await getStableDownloadUrl(bucket.file(thumbnailPath))
          : mainImageUrl;
        const image = mainImageUrl || repairedImages[0]?.url || "";

        const patch: Record<string, unknown> = {};

        if (JSON.stringify(repairedImages) !== JSON.stringify(currentImages)) {
          patch.images = repairedImages;
        }

        if (image && image !== (productData.image || "")) {
          patch.image = image;
        }

        if (mainImageUrl && mainImageUrl !== (productData.mainImageUrl || "")) {
          patch.mainImageUrl = mainImageUrl;
        }

        if (thumbnailUrl && thumbnailUrl !== (productData.thumbnailUrl || "")) {
          patch.thumbnailUrl = thumbnailUrl;
        }

        if (primaryPath && primaryPath !== (productData.mainImagePath || "")) {
          patch.mainImagePath = primaryPath;
        }

        if (
          thumbnailPath &&
          thumbnailPath !== (productData.thumbnailPath || "")
        ) {
          patch.thumbnailPath = thumbnailPath;
        }

        if (Object.keys(patch).length === 0) {
          skippedCount += 1;
          continue;
        }

        await productDoc.ref.update(patch);
        updatedCount += 1;
      } catch (error: any) {
        errorCount += 1;
        errors.push({
          id: productDoc.id,
          error: error?.message || "Nepoznata greška",
        });
      }
    }

    return {
      success: errorCount === 0,
      scannedCount: docs.length,
      updatedCount,
      skippedCount,
      errorCount,
      errors: errors.slice(0, 20),
    };
  },
);
