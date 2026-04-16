// functions/src/adminUtils.ts

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getAdminTransporter } from "./transporter";
import { formatMoney } from "./helpers";
import * as admin from "firebase-admin";
import { defineString } from "firebase-functions/params";

// Inicijalizacija admina je obavezna u svakom fajlu koji koristi admin SDK
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// 2.1 Admin emailovi preko env parametra (comma-separated)
const ADMIN_EMAILS_PARAM = defineString("ADMIN_EMAILS", {
  default: "dajashopnis@gmail.com",
});

// 4. Admin Notifikacija (Nova Funkcija)
export const sendNewOrderToAdmins = onDocumentCreated(
  {
    region: "europe-west3",
    document: "orders/{orderId}",
  },
  async (event: any) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const adminEmails = ADMIN_EMAILS_PARAM.value()
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);

    if (adminEmails.length === 0) {
      console.log("Admin Email: Nema konfigurisanih ADMIN_EMAILS adresa.");
      return;
    }

    const order = snapshot.data();
    const orderId = event.params.orderId;

    if (!order || !order.customer || !order.items) {
      console.log("Admin Email: Nedostaju podaci porudžbine.");
      return;
    }

    // Uzimamo sliku prvog proizvoda za "Hero" prikaz
    // Pretpostavljamo da item ima polje 'image' ili 'img'.
    // Ako nema, stavljamo placeholder.
    const firstProductImage =
      order.items[0].image ||
      order.items[0].img ||
      "https://placehold.co/600x400/png?text=DajaShop";

    // Generisanje HTML tabele (Reuse logike)
    const itemsHtml = order.items
      .map(
        (item: any) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 16px 0; vertical-align: top;">
           <div style="display: flex; align-items: center;">
             ${
               item.image
                 ? `<img src="${item.image}" alt="" style="width: 40px; height: 40px; border-radius: 4px; object-fit: cover; margin-right: 12px;">`
                 : ""
             }
             <div>
                <span style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 600; color: #000000; display: block;">
                  ${item.name}
                </span>
                <span style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; color: #6b7280;">
                  Komada: <strong style="color: #000;">${item.qty}</strong>
                </span>
             </div>
           </div>
        </td>
        <td style="padding: 16px 0; vertical-align: top; text-align: right;">
          <span style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 500; color: #000000;">
            ${formatMoney(item.price * item.qty)}
          </span>
        </td>
      </tr>
    `,
      )
      .join("");

    // Link do admin panela (prilagodi putanju ako je drugačija u tvom routeru)
    // const adminLink = `https://dajashop.pages.dev/admin/orders/${orderId}`;
    const SITE_URL = defineString("SITE_URL", {
      default: "https://dajashop.pages.dev",
    });
    const adminLink = `${SITE_URL.value()}/admin/orders`;

    const mailOptions = {
      from: '"Daja Shop Bot" <admin@dajashop.com>',
      to: adminEmails.join(","), // Šalje svima iz env liste
      subject: `🔥 NOVA PORUDŽBINA: #${orderId} - ${formatMoney(
        order.finalTotal,
      )}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Nova Porudžbina Admin</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #000000; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          
          <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
            
            <div style="position: relative; width: 100%; height: 250px; background-color: #f3f4f6; overflow: hidden;">
               <img src="${firstProductImage}" alt="Product" style="width: 100%; height: 100%; object-fit: cover; object-position: center;">
               <div style="position: absolute; bottom: 0; left: 0; width: 100%; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); padding: 40px 20px 20px;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
                    Nova Porudžbina
                  </h1>
                  <p style="margin: 5px 0 0; color: #e5e5e5; font-size: 14px;">
                    #${orderId} • ${new Date().toLocaleDateString("sr-RS")}
                  </p>
               </div>
            </div>

            <div style="padding: 40px;">
              
              <div style="text-align: center; margin-bottom: 40px;">
                <p style="margin-bottom: 20px; color: #374151; font-size: 16px;">
                  Korisnik <strong>${
                    order.customer.name
                  }</strong> je upravo napravio porudžbinu.
                </p>
                <a href="${adminLink}" style="display: inline-block; background-color: #000000; color: #ffffff; padding: 16px 32px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 6px; text-transform: uppercase; letter-spacing: 1px;">
                  Otvori u Admin Panelu
                </a>
              </div>

              <div style="background-color: #f9fafb; padding: 24px; border-radius: 6px; border: 1px solid #e5e7eb; margin-bottom: 32px;">
                <h3 style="margin: 0 0 16px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #9ca3af; letter-spacing: 1px;">
                  Podaci o kupcu
                </h3>
                <table style="width: 100%; font-size: 14px;">
                  <tr>
                    <td style="padding-bottom: 8px; color: #6b7280; width: 30%;">Ime:</td>
                    <td style="padding-bottom: 8px; color: #111827; font-weight: 600;">${
                      order.customer.name
                    } ${order.customer.surname}</td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 8px; color: #6b7280;">Email:</td>
                    <td style="padding-bottom: 8px; color: #111827;">${
                      order.customer.email
                    }</td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 8px; color: #6b7280;">Telefon:</td>
                    <td style="padding-bottom: 8px; color: #111827;">
                      <a href="tel:${
                        order.customer.phone
                      }" style="color: #2563eb; text-decoration: none;">${
                        order.customer.phone
                      }</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 8px; color: #6b7280;">Adresa:</td>
                    <td style="padding-bottom: 8px; color: #111827;">
                      ${order.customer.address}, ${order.customer.postalCode} ${
                        order.customer.city
                      }
                    </td>
                  </tr>
                </table>
              </div>

              <div style="margin-bottom: 32px;">
                <h3 style="margin: 0 0 16px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #9ca3af; letter-spacing: 1px;">
                  Stavke porudžbine
                </h3>
                <table style="width: 100%; border-collapse: collapse;">
                  ${itemsHtml}
                </table>
              </div>

              <div style="border-top: 2px solid #000000; padding-top: 24px;">
                <table style="width: 100%;">
                   <tr>
                    <td style="padding-bottom: 8px; color: #6b7280; font-size: 14px;">Napomena:</td>
                    <td style="text-align: right; padding-bottom: 8px; color: #000000; font-size: 14px; font-style: italic;">
                      ${order.notes ? order.notes : "Nema napomene"}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top: 16px; color: #000000; font-size: 16px; font-weight: 700; text-transform: uppercase;">Zarada (Ukupno):</td>
                    <td style="text-align: right; padding-top: 16px; color: #000000; font-size: 24px; font-weight: 900;">
                      ${formatMoney(order.finalTotal)}
                    </td>
                  </tr>
                </table>
              </div>

            </div>

            <div style="background-color: #111827; padding: 16px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #6b7280;">
                Ovo je automatska poruka za Administratore Daja Shop-a.
              </p>
            </div>
            
          </div>
        </body>
        </html>
      `,
    };

    try {
      await getAdminTransporter().sendMail(mailOptions);
      console.log("Admin notifikacija poslata.");
    } catch (error) {
      console.error("Greška pri slanju admin maila:", error);
    }
  },
);
