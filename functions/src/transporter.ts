import * as nodemailer from "nodemailer";
import { defineString } from "firebase-functions/params";

const SMTP_HOST = "mail.dajashop.com";
const SMTP_PORT = 587;
const TLS_OPTIONS = { rejectUnauthorized: false };

// --- Newsletter ---
const NEWSLETTER_USER = defineString("SMTP_NEWSLETTER_USER", {
  default: "newsletter@dajashop.com",
});
const NEWSLETTER_PASS = defineString("SMTP_NEWSLETTER_PASS", {
  default: "",
});

// --- Porudžbine (potvrde kupcima) ---
const ORDERS_USER = defineString("SMTP_ORDERS_USER", {
  default: "porudzbine@dajashop.com",
});
const ORDERS_PASS = defineString("SMTP_ORDERS_PASS", {
  default: "",
});

// --- Admin notifikacije ---
const ADMIN_USER = defineString("SMTP_ADMIN_USER", {
  default: "admin@dajashop.com",
});
const ADMIN_PASS = defineString("SMTP_ADMIN_PASS", {
  default: "",
});

const makeTransporter = (user: string, pass: string) =>
  nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    auth: { user, pass },
    tls: TLS_OPTIONS,
  });

export const getNewsletterTransporter = () =>
  makeTransporter(NEWSLETTER_USER.value(), NEWSLETTER_PASS.value());

export const getOrdersTransporter = () =>
  makeTransporter(ORDERS_USER.value(), ORDERS_PASS.value());

export const getAdminTransporter = () =>
  makeTransporter(ADMIN_USER.value(), ADMIN_PASS.value());
