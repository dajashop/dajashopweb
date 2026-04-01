import { onRequest } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { Request, Response } from "express";
import { QueryDocumentSnapshot } from "firebase-admin/firestore";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const SITE_URL = defineString("SITE_URL", {
  default: "https://dajashop.pages.dev",
});

const STATIC_PAGES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/catalog", changefreq: "daily", priority: "0.8" },
  { path: "/daljinski", changefreq: "weekly", priority: "0.8" },
  { path: "/baterije", changefreq: "weekly", priority: "0.8" },
  { path: "/naocare", changefreq: "weekly", priority: "0.8" },
  { path: "/about", changefreq: "monthly", priority: "0.8" },
  { path: "/faq", changefreq: "monthly", priority: "0.8" },
  { path: "/contact", changefreq: "monthly", priority: "0.8" },
  { path: "/usluge", changefreq: "monthly", priority: "0.8" },
];

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildUrlNode({
  loc,
  changefreq,
  priority,
  lastmod,
  images = [],
}: {
  loc: string;
  changefreq: string;
  priority: string;
  lastmod?: string;
  images?: Array<{ loc: string; title?: string; caption?: string }>;
}): string {
  const imageNodes = images
    .filter((img) => img?.loc)
    .map((img) => {
      return [
        "    <image:image>",
        `      <image:loc>${escapeXml(img.loc)}</image:loc>`,
        img.title
          ? `      <image:title>${escapeXml(img.title)}</image:title>`
          : "",
        img.caption
          ? `      <image:caption>${escapeXml(img.caption)}</image:caption>`
          : "",
        "    </image:image>",
      ]
        .filter(Boolean)
        .join("\n");
    });

  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : "",
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    ...imageNodes,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

function collectProductImageUrls(product: any): string[] {
  const urls = new Set<string>();

  if (typeof product.mainImageUrl === "string" && product.mainImageUrl.trim()) {
    urls.add(product.mainImageUrl.trim());
  }

  if (Array.isArray(product.images)) {
    product.images.forEach((img: any) => {
      if (typeof img === "string" && img.trim()) urls.add(img.trim());
      if (
        img &&
        typeof img === "object" &&
        typeof img.url === "string" &&
        img.url.trim()
      ) {
        urls.add(img.url.trim());
      }
    });
  }

  if (typeof product.image === "string" && product.image.trim()) {
    urls.add(product.image.trim());
  }

  return Array.from(urls).slice(0, 5);
}

export const generateSitemap = onRequest(
  { region: "europe-west1" },
  async (_req: Request, res: Response) => {
    try {
      const baseUrl = SITE_URL.value().replace(/\/$/, "");
      const db = admin.firestore();

      const productSnapshot = await db.collection("products").get();

      const staticNodes = STATIC_PAGES.map((page) =>
        buildUrlNode({
          loc: `${baseUrl}${page.path}`,
          changefreq: page.changefreq,
          priority: page.priority,
        }),
      );

      const productNodes = productSnapshot.docs
        .map((doc: QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() }))
        .filter(
          (product: any) =>
            product.isVisible !== false &&
            typeof product.slug === "string" &&
            product.slug.trim(),
        )
        .map((product: any) => {
          const updatedAt = product.updatedAt?.toDate?.();
          const lastmod = updatedAt
            ? updatedAt.toISOString().split("T")[0]
            : undefined;

          const imageTitle =
            product.seo?.imageAltText ||
            `${product.brand || ""} ${product.name || ""}`.trim() ||
            product.name ||
            "Proizvod";
          const imageCaption =
            product.seo?.metaDescription || product.description || imageTitle;
          const images = collectProductImageUrls(product).map((url) => ({
            loc: url,
            title: imageTitle,
            caption: imageCaption,
          }));

          return buildUrlNode({
            loc: `${baseUrl}/product/${product.slug}`,
            lastmod,
            changefreq: "weekly",
            priority: "0.9",
            images,
          });
        });

      const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
        ...staticNodes,
        ...productNodes,
        "</urlset>",
      ].join("\n");

      res.set("Content-Type", "application/xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=3600");
      res.status(200).send(xml);
    } catch (error) {
      console.error("Sitemap generation error:", error);
      res.status(500).send("Failed to generate sitemap");
    }
  },
);
