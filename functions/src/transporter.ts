import * as nodemailer from "nodemailer";
import { defineString } from "firebase-functions/params";
// 1. Konfiguracija Transportera
// UVEK koristi App Password, ne običnu šifru!

const USER_EMAIL = defineString("USER_EMAIL", {
  default: "prodaja@dajashop.com",
});
const USER_PASSWORD = defineString("USER_PASSWORD", {
  default: "nekasifra123", // Postavi u .env fajlu
});

export const getTransporter = () =>
  nodemailer.createTransport({
    service: "gmail",
    // auth: {
    //   user: "dajashopnis@gmail.com", // ZAMENI
    //   pass: "kgegneigjhgsrfnk", // ZAMENI (16 slova)
    // },
    auth: {
      user: USER_EMAIL.value(),
      pass: USER_PASSWORD.value(),
    },
  });
