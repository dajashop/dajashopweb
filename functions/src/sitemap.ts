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
}: {
  loc: string;
  changefreq: string;
  priority: string;
  lastmod?: string;
}): string {
  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : "",
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

export const generateSitemap = onRequest(
  { region: "europe-west1" },
  async (_req: Request, res: Response) => {
    try {
      const baseUrl = SITE_URL.value().replace(/\/$/, "");
      const db = admin.firestore();

      const productSnapshot = await db
        .collection("products")
        .where("isVisible", "==", true)
        .get();

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
            typeof product.slug === "string" && product.slug.trim(),
        )
        .map((product: any) => {
          const updatedAt = product.updatedAt?.toDate?.();
          const lastmod = updatedAt
            ? updatedAt.toISOString().split("T")[0]
            : undefined;

          return buildUrlNode({
            loc: `${baseUrl}/product/${product.slug}`,
            lastmod,
            changefreq: "weekly",
            priority: "0.9",
          });
        });

      const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
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
