// functions/src/orderUtils.ts
import {
  onDocumentCreated,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { getTransporter } from "./transporter";
import { formatMoney } from "./helpers";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Konstante za Daja Shop
const SHOP_DETAILS = {
  name: "Daja Shop",
  address: "Obrenovićeva bb, Podzemni prolaz", // Prilagodi tačnu adresu
  city: "18000 Niš",
  email: "dajashopnis@gmail.com",
  phone: "+381 64 126 24 25", // Ubaci pravi telefon
  website: "https://dajashop.rs",
};

const THEME = {
  bg: "#F5F5F7",
  surface: "#FFFFFF",
  text: "#111111",
  muted: "#86868b",
  border: "#d2d2d7",
  success: "#10B981",
  primary: "#111111",
};

/**
 * Generiše HTML red za proizvod SA SLIKOM
 */
const generateItemRow = (item: any) => {
  // Provera da li slika postoji, ako ne, koristi placeholder ili prazno
  const imageHtml = item.image
    ? `<img src="${item.image}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; display: block;">`
    : `<div style="width: 60px; height: 60px; background-color: #eee; border-radius: 6px;"></div>`;

  return `
  <tr style="border-bottom: 1px solid ${THEME.border};">
    <td style="padding: 16px 0; vertical-align: top; width: 70px;">
      ${imageHtml}
    </td>
    <td style="padding: 16px 0; vertical-align: top;">
      <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 600; color: ${
        THEME.text
      }; display: block; margin-bottom: 4px; line-height: 1.4;">
        ${item.name}
      </span>
      <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; color: ${
        THEME.muted
      };">
        Količina: ${item.qty}
      </span>
    </td>
    <td style="padding: 16px 0; vertical-align: top; text-align: right;">
      <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 500; color: ${
        THEME.text
      }; white-space: nowrap;">
        ${formatMoney(item.price * item.qty)}
      </span>
    </td>
  </tr>
`;
};

/**
 * Pomoćna funkcija za blok adrese
 * Sada striktno gleda shippingMethod. Default je uvek isporuka na adresu.
 */
const getDeliveryBlock = (order: any) => {
  // Samo ako je EKSPLICITNO 'pickup', prikazujemo adresu radnje
  const isPickup = order.shippingMethod === "pickup";

  if (isPickup) {
    return `
      <h3 style="margin: 0 0 12px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; color: ${THEME.muted}; letter-spacing: 0.5px;">
        📍 Lično preuzimanje
      </h3>
      <p style="margin: 0; font-size: 15px; line-height: 24px; color: ${THEME.text};">
        <strong>${SHOP_DETAILS.name}</strong><br>
        ${SHOP_DETAILS.address}<br>
        ${SHOP_DETAILS.city}<br>
        <span style="font-size: 13px; color: ${THEME.muted};">Ponesite broj porudžbine sa sobom.</span>
      </p>
    `;
  }

  // U SVIM OSTALIM SLUČAJEVIMA (Courier, default, greška, autofill) -> Adresa kupca
  return `
    <h3 style="margin: 0 0 12px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; color: ${THEME.muted}; letter-spacing: 0.5px;">
      📦 Adresa za isporuku
    </h3>
    <p style="margin: 0; font-size: 15px; line-height: 24px; color: ${THEME.text};">
      <strong>${order.customer.name} ${order.customer.surname}</strong><br>
      ${order.customer.address}<br>
      ${order.customer.postalCode} ${order.customer.city}<br>
      ${order.customer.phone}
    </p>
  `;
};

// ------------------------------------------------------------------
// 1. SEND ORDER CONFIRMATION
// ------------------------------------------------------------------
export const sendOrderConfirmation = onDocumentCreated(
  {
    region: "europe-west3",
    document: "orders/{orderId}",
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;
    const order = snapshot.data();
    const docId = event.params.orderId;

    // Čitanje polja 'id' iz dokumenta
    const customOrderId = order["id"];
    const displayId = customOrderId || docId;

    // --- DEBAGIRANJE ---
    console.log(
      `ORDER ID DEBUG: Custom ID: ${customOrderId}, Document ID: ${docId}, Final Display ID: ${displayId}`,
    );
    // -------------------
    if (!order || !order.customer || !order.items) {
      console.error("Nedostaju podaci porudžbine.");
      return;
    }

    const itemsHtml = order.items.map(generateItemRow).join("");
    const deliveryBlock = getDeliveryBlock(order);

    const mailOptions = {
      from: `"${SHOP_DETAILS.name}" <${SHOP_DETAILS.email}>`,
      to: order.customer.email,
      subject: `Potvrda prijema porudžbine #${displayId} | ${SHOP_DETAILS.name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Potvrda porudžbine</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: ${
          THEME.bg
        }; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          
          <div style="max-width: 600px; margin: 40px auto; background-color: ${
            THEME.surface
          }; border-radius: 12px; border: 1px solid ${
            THEME.border
          }; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            
            <div style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid ${
              THEME.bg
            };">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: ${
                THEME.text
              }; letter-spacing: -0.5px; text-transform: uppercase;">
                DAJASHOP
              </h1>
            </div>

            <div style="padding: 40px;">
              <div style="text-align: center; margin-bottom: 40px;">
                <div style="display: inline-block; padding: 6px 14px; background-color: ${
                  THEME.bg
                }; color: ${
                  THEME.muted
                }; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 16px; letter-spacing: 0.5px;">
                  ⏳ Status: Evidentirano
                </div>
                <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: ${
                  THEME.text
                };">
                  Hvala na porudžbini, ${order.customer.name}.
                </h2>
                <p style="margin: 0 0 8px 0; font-size: 16px; line-height: 24px; color: ${
                  THEME.text
                };">
                  Broj porudžbine: <strong>#${displayId}</strong>
                </p>
                <p style="margin: 0; font-size: 14px; line-height: 22px; color: ${
                  THEME.muted
                };">
                  Naš tim će uskoro obraditi Vaš zahtev.
                </p>
              </div>

              <div style="background-color: ${
                THEME.bg
              }; padding: 24px; border-radius: 8px; margin-bottom: 32px;">
                ${deliveryBlock}
              </div>

              <div style="margin-bottom: 32px;">
                <table style="width: 100%; border-collapse: collapse;">
                  ${itemsHtml}
                </table>
              </div>

              <div style="border-top: 2px solid ${
                THEME.text
              }; padding-top: 24px;">
                <table style="width: 100%;">
                  <tr>
                    <td style="padding-bottom: 8px; color: ${
                      THEME.muted
                    }; font-size: 14px;">Isporuka:</td>
                    <td style="text-align: right; padding-bottom: 8px; color: ${
                      THEME.text
                    }; font-size: 14px; font-weight: 500;">
                      ${
                        order.shippingCost
                          ? formatMoney(order.shippingCost)
                          : "Besplatna"
                      }
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top: 8px; color: ${
                      THEME.text
                    }; font-size: 16px; font-weight: 700; text-transform: uppercase;">Ukupno za uplatu:</td>
                    <td style="text-align: right; padding-top: 8px; color: ${
                      THEME.text
                    }; font-size: 22px; font-weight: 800;">
                      ${formatMoney(order.finalTotal)}
                    </td>
                  </tr>
                </table>
              </div>

            </div>

            <div style="background-color: ${
              THEME.primary
            }; padding: 32px 24px; text-align: center;">
              <p style="margin: 0 0 12px 0; font-size: 14px; color: #FFFFFF; font-weight: 500;">
                Imate pitanja?
              </p>
              <p style="margin: 0 0 24px 0; font-size: 13px; color: #9ca3af;">
                Pozovite nas na ${
                  SHOP_DETAILS.phone
                } ili odgovorite na ovaj email.
              </p>
              <p style="margin: 0; font-size: 11px; color: #525252; text-transform: uppercase; letter-spacing: 1px;">
                © ${new Date().getFullYear()} ${SHOP_DETAILS.name}.
              </p>
            </div>
            
          </div>
        </body>
        </html>
      `,
    };

    try {
      await getTransporter().sendMail(mailOptions);
      console.log(`[Confirmation] Email poslat: ${order.customer.email}`);
    } catch (error) {
      console.error("[Confirmation] Greška pri slanju:", error);
    }
  },
);

// ------------------------------------------------------------------
// 2. SEND ORDER STATUS UPDATE
// ------------------------------------------------------------------
export const sendOrderStatusUpdate = onDocumentUpdated(
  {
    region: "europe-west3",
    document: "orders/{orderId}",
  },
  async (event: any) => {
    const change = event.data;
    if (!change) return;

    const newData = change.after.data();
    const oldData = change.before.data();
    const docId = event.params.orderId;

    // KORISTIMO ORDER ID (DAJA-xxxx) AKO POSTOJI
    const displayId = newData.id || docId;

    if (newData.status === oldData.status) return;

    let statusConfig = {
      icon: "📋",
      headline: "Status je ažuriran",
      message: "Došlo je do promene statusa Vaše porudžbine.",
      color: THEME.text,
    };

    switch (newData.status) {
      case "U obradi":
        statusConfig = {
          icon: "⚙️",
          headline: "Porudžbina je u obradi",
          message:
            "Vašu porudžbinu smo uspešno evidentirali i trenutno je pripremamo.",
          color: "#3B82F6",
        };
        break;
      case "Poslato":
        statusConfig = {
          icon: "🚚",
          headline: "Pošiljka je na putu",
          message:
            "Dobre vesti! Vaš paket je predat kurirskoj službi. Očekujte isporuku uskoro.",
          color: "#F59E0B",
        };
        break;
      case "Spremno za preuzimanje":
        statusConfig = {
          icon: "🛍️",
          headline: "Spremno za preuzimanje",
          message: `Vaša porudžbina je spremna i čeka Vas u našoj radnji (${SHOP_DETAILS.address}).`,
          color: "#10B981",
        };
        break;
      case "Isporučeno":
        statusConfig = {
          icon: "✅",
          headline: "Uspešna isporuka",
          message:
            "Hvala Vam što ste kupovali u Daja Shop-u! Nadamo se da ste zadovoljni.",
          color: "#10B981",
        };
        break;
      case "Otkazano":
        statusConfig = {
          icon: "❌",
          headline: "Porudžbina je otkazana",
          message: "Vaša porudžbina je otkazana.",
          color: "#EF4444",
        };
        break;
    }

    const itemsHtml = newData.items.map(generateItemRow).join("");
    const deliveryBlock = getDeliveryBlock(newData);

    const mailOptions = {
      from: `"${SHOP_DETAILS.name}" <${SHOP_DETAILS.email}>`,
      to: newData.customer.email,
      subject: `Promena statusa porudžbine #${displayId} - ${newData.status}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Status porudžbine</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: ${
          THEME.bg
        }; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          
          <div style="max-width: 600px; margin: 40px auto; background-color: ${
            THEME.surface
          }; border-radius: 12px; border: 1px solid ${
            THEME.border
          }; overflow: hidden;">
            
            <div style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid ${
              THEME.bg
            };">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: ${
                THEME.text
              }; letter-spacing: -0.5px; text-transform: uppercase;">
                DAJASHOP
              </h1>
            </div>

            <div style="padding: 40px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <div style="font-size: 48px; margin-bottom: 16px;">
                  ${statusConfig.icon}
                </div>
                <h2 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: ${
                  THEME.text
                };">
                  ${statusConfig.headline}
                </h2>
                <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: ${
                  THEME.muted
                };">
                  Porudžbina <strong>#${displayId}</strong>
                </p>
                <div style="background-color: ${
                  THEME.bg
                }; padding: 16px; border-radius: 8px; border-left: 4px solid ${
                  statusConfig.color
                };">
                  <p style="margin: 0; font-size: 15px; line-height: 22px; color: ${
                    THEME.text
                  }; text-align: left;">
                    ${statusConfig.message}
                  </p>
                </div>
              </div>

              <div style="background-color: ${
                THEME.bg
              }; padding: 24px; margin-bottom: 32px; border-radius: 8px;">
                ${deliveryBlock}
              </div>

              <div style="margin-bottom: 32px;">
                <table style="width: 100%; border-collapse: collapse;">
                  ${itemsHtml}
                </table>
              </div>

              <div style="border-top: 2px solid ${
                THEME.text
              }; padding-top: 24px;">
                <table style="width: 100%;">
                  <tr>
                    <td style="padding-top: 8px; color: ${
                      THEME.text
                    }; font-size: 16px; font-weight: 700; text-transform: uppercase;">Ukupno:</td>
                    <td style="text-align: right; padding-top: 8px; color: ${
                      THEME.text
                    }; font-size: 20px; font-weight: 800;">
                      ${formatMoney(newData.finalTotal)}
                    </td>
                  </tr>
                </table>
              </div>

            </div>

            <div style="background-color: ${
              THEME.primary
            }; padding: 24px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} ${SHOP_DETAILS.name}.
              </p>
            </div>
            
          </div>
        </body>
        </html>
      `,
    };

    try {
      await getTransporter().sendMail(mailOptions);
      console.log(`[Status Update] Poslato na: ${newData.customer.email}`);
    } catch (error) {
      console.error("[Status Update] Greška:", error);
    }
  },
);
