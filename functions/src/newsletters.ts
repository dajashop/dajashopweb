// functions/src/newsletters.ts

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import { transporter } from "./transporter";
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin"; // OBAVEZNO: Dodaj ovo

// Inicijalizacija admin-a ako već nije uradjena negde drugde
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const PROMO_KOD = "DOBRODOSLI10";

export const sendWelcomeEmail = onDocumentCreated(
  {
    region: "europe-west3",
    document: "newsletter_subscribers/{docId}",
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const data = snapshot.data();
    const email = data.email;

    // Apple-Style Minimalist Email Template
    const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #111111;">
      <div style="text-align: center; padding: 40px 0;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700; text-transform: uppercase;">Daja Shop</h1>
      </div>
      <div style="padding: 40px; background-color: #fafafa; border-radius: 12px;">
        <h2 style="margin-top: 0; font-size: 22px; font-weight: 600;">Dobrodošli u klub.</h2>
        <p style="font-size: 16px; line-height: 1.6; color: #555;">
          Hvala vam na prijavi. Kao novom članu, poklanjamo vam kod za popust.
        </p>
        <div style="margin: 30px 0; padding: 20px; background-color: #000; color: #fff; text-align: center; border-radius: 8px;">
          <span style="display: block; font-size: 12px; text-transform: uppercase; color: #888; margin-bottom: 5px;">Vaš promo kod</span>
          <span style="display: block; font-size: 28px; font-weight: 700; letter-spacing: 2px;">${PROMO_KOD}</span>
        </div>
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://dajashop.com" style="display: inline-block; padding: 12px 24px; background-color: #111; color: #fff; text-decoration: none; border-radius: 6px;">Iskoristi kod</a>
        </div>
      </div>
    </div>
  `;

    const mailOptions = {
      from: '"Daja Shop" <dajashopnis@gmail.com>',
      to: email,
      subject: "Dobrodošli! Vaš kod za 10% popusta",
      html: htmlContent,
    };

    try {
      await transporter.sendMail(mailOptions);
      return snapshot.ref.update({ emailSent: true, emailSentAt: new Date() });
    } catch (error) {
      logger.error("Error sending email:", error);
      return null;
    }
  },
);

export const sendNewsletterPromo = onRequest(
  {
    region: "europe-west3",
  },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: "Email je obavezan." });
      return;
    }

    try {
      const collectionRef = db.collection("newsletter"); // Proveri kako se zove tvoja kolekcija!

      // 1. KORAK: PROVERA DA LI EMAIL VEĆ POSTOJI
      const snapshot = await collectionRef.where("email", "==", email).get();

      if (!snapshot.empty) {
        // AKO POSTOJI -> Vrati status 409 (Conflict)
        // Ovo je ključni deo koji aktivira tvoj React kod za duplikate!
        res
          .status(409)
          .send({ message: "Hvala na interesovanju ali već ste prijavljeni." });
        return;
      }
      // 1. Upisujemo korisnika u 'newsletter' kolekciju u bazi
      await db.collection("newsletter").doc(email).set({
        email: email,
        subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
        codeSent: true,
        usedCode: false, // Ovo možeš kasnije da koristiš da poništiš kod
      });

      // 2. Šaljemo email (Kao i pre)
      const mailOptions = {
        from: '"Daja Shop" <dajashopnis@gmail.com>',
        to: email,
        subject: "Dobrodošli u Daja Shop! Vaš kod za popust 🎁",
        html: `
        <div style="font-family: sans-serif; text-align: center; padding: 20px;">
          <h1>Dobrodošli!</h1>
          <p>Hvala na prijavi. Vaš kod za 10% popusta na prvu kupovinu je:</p>
          <div style="background: #eee; padding: 20px; font-size: 24px; font-weight: bold; margin: 20px 0;">DOBRODOSLI10</div>
          <p>Kod važi samo ako ste prijavljeni na sajtu sa ovom email adresom (${email}).</p>
        </div>
      `,
      };

      await transporter.sendMail(mailOptions);
      res.status(200).json({ success: true, message: "Prijavljeni ste!" });
    } catch (error) {
      console.error("Greška:", error);
      res.status(500).json({ error: "Greška na serveru." });
    }
  },
);
