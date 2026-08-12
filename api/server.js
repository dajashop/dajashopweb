import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const { Pool } = pg;
const app = express();
const port = Number(process.env.API_PORT || 8787);
const apiPrefix = '/api/v1';
const jwtSecret = process.env.JWT_SECRET || 'dev-change-me';
const refreshSecret = process.env.JWT_REFRESH_SECRET || `${jwtSecret}-refresh`;
const organizationId =
  process.env.DAJA_ORGANIZATION_ID || '00000000-0000-4000-8000-000000000101';
const webauthnRpID = process.env.WEBAUTHN_RP_ID || 'localhost';
const webauthnRpName = process.env.WEBAUTHN_RP_NAME || 'DajaShop';
const webauthnOrigin = process.env.WEBAUTHN_ORIGIN || process.env.VITE_APP_URL || 'http://localhost:5173';
const passkeyChallenges = new Map();
const adminEmails = (process.env.ADMIN_EMAILS || process.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const databaseUrl = process.env.DATABASE_URL || '';
const hasDatabasePlaceholder =
  !databaseUrl || databaseUrl.includes('USER:PASSWORD@HOST.neon.tech');

const pool = new Pool({
  connectionString: databaseUrl,
  ssl:
    process.env.DATABASE_SSL === 'false'
      ? false
      : { rejectUnauthorized: false },
});

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '25mb' }));
app.use('/uploads', express.static('public/uploads'));

function cents(value) {
  const number = Number(value || 0);
  return Math.round(number > 999 ? number : number * 100);
}

function dinars(value) {
  return Math.round(Number(value || 0)) / 100;
}

function rowsPayload(rows) {
  return { items: rows };
}

function signCustomer(customer) {
  const payload = {
    sub: customer.id,
    email: customer.email,
    name: customer.name,
  };
  return {
    accessToken: jwt.sign(payload, jwtSecret, { expiresIn: '30m' }),
    refreshToken: jwt.sign(payload, refreshSecret, { expiresIn: '30d' }),
    user: mapCustomer(customer),
  };
}

function mapCustomer(row) {
  if (!row) return null;
  const displayName = row.display_name || row.name || '';
  return {
    id: row.id,
    uid: row.id,
    email: row.email,
    username: row.username || row.normalized_email || row.email,
    displayName,
    name: displayName,
    phoneNumber: row.phone || row.normalized_phone || '',
    phone: row.phone || '',
    photoURL: row.photo_url || '',
    emailVerified: row.email_verified,
    phoneVerified: row.phone_verified,
    providerData: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProduct(row) {
  if (!row) return null;
  const images = row.images || [];
  const primaryImage =
    row.main_image_url ||
    row.image ||
    images?.[0]?.url ||
    '';
  const thumbnail =
    row.thumbnail_url ||
    images?.[0]?.thumb ||
    primaryImage;
  const priceAmount =
    row.price_amount ??
    row.current_price_amount ??
    row.amount_minor ??
    0;
  return {
    id: row.id,
    productId: row.id,
    variantId: row.variant_id || row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || '',
    brand: row.brand || row.brand_name || null,
    category: row.category || row.category_name || null,
    department: row.department || 'satovi',
    gender: row.gender || null,
    price: dinars(priceAmount),
    currentPriceAmount: priceAmount,
    currency: row.currency || 'RSD',
    image: primaryImage,
    mainImageUrl: primaryImage,
    thumbnailUrl: thumbnail,
    primaryImageUrl: primaryImage,
    images,
    specs: row.specs || row.attributes || {},
    features: row.features || [],
    seo: row.seo || {},
    model3DUrl: row.model_3d_url || '',
    active: row.active !== false,
    published: row.published !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const productSelectSql = `
  SELECT
    p.id,
    p.name,
    p.slug,
    p.description,
    p.active,
    p.published,
    p.created_at,
    p.updated_at,
    b.name AS brand,
    c.name AS category,
    v.id AS variant_id,
    v.gender,
    v.attributes AS specs,
    COALESCE(v.current_price_amount, vp.amount_minor, 0) AS price_amount,
    COALESCE(v.currency, vp.currency, 'RSD') AS currency,
    media.images,
    media.main_image_url,
    media.thumbnail_url
  FROM products p
  LEFT JOIN brands b
    ON b.id = p.brand_id
  LEFT JOIN categories c
    ON c.id = p.primary_category_id
  LEFT JOIN LATERAL (
    SELECT pv.*
    FROM product_variants pv
    WHERE pv.product_id = p.id
      AND pv.deleted_at IS NULL
      AND pv.active = TRUE
      AND pv.published = TRUE
    ORDER BY pv.created_at ASC
    LIMIT 1
  ) v ON TRUE
  LEFT JOIN LATERAL (
    SELECT price.*
    FROM variant_prices price
    WHERE price.variant_id = v.id
      AND price.price_type = 'sell'
      AND (price.valid_until IS NULL OR price.valid_until > now())
    ORDER BY price.valid_from DESC NULLS LAST, price.created_at DESC
    LIMIT 1
  ) vp ON TRUE
  LEFT JOIN LATERAL (
    SELECT
      jsonb_agg(
        jsonb_build_object(
          'url', ma.public_url,
          'thumb', COALESCE(md.public_url, ma.public_url),
          'path', ma.storage_key
        )
        ORDER BY pm.is_primary DESC, pm.position ASC, pm.created_at ASC
      ) AS images,
      (array_agg(ma.public_url ORDER BY pm.is_primary DESC, pm.position ASC, pm.created_at ASC))[1] AS main_image_url,
      (array_agg(COALESCE(md.public_url, ma.public_url) ORDER BY pm.is_primary DESC, pm.position ASC, pm.created_at ASC))[1] AS thumbnail_url
    FROM product_media pm
    JOIN media_assets ma
      ON ma.id = pm.media_asset_id
      AND ma.deleted_at IS NULL
      AND ma.status = 'ready'
    LEFT JOIN LATERAL (
      SELECT d.public_url
      FROM media_derivatives d
      WHERE d.media_asset_id = ma.id
      ORDER BY d.width ASC NULLS LAST, d.created_at DESC
      LIMIT 1
    ) md ON TRUE
    WHERE pm.product_id = p.id
  ) media ON TRUE
`;

function mapOrder(row) {
  if (!row) return null;
  return {
    id: row.display_id,
    docId: row.id,
    displayId: row.display_id,
    customer: row.customer || {},
    items: row.items || [],
    status: row.status,
    subtotal: dinars(row.subtotal),
    promoCode: row.promo_code,
    discountAmount: dinars(row.discount_amount),
    subtotalAfterDiscount: dinars(row.subtotal_after_discount),
    shippingCost: dinars(row.shipping_cost),
    shippingMethod: row.shipping_method,
    paymentMethod: row.payment_method,
    finalTotal: dinars(row.final_total),
    total: dinars(row.final_total),
    isRead: row.is_read,
    createdAt: row.created_at,
    date: new Date(row.created_at).toLocaleDateString('sr-RS'),
  };
}

async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, jwtSecret);
    const { rows } = await pool.query('SELECT * FROM customers WHERE id = $1', [decoded.sub]);
    req.customer = rows[0] || null;
  } catch {
    req.customer = null;
  }
  return next();
}

async function requireAuth(req, res, next) {
  await optionalAuth(req, res, () => {});
  if (!req.customer) return res.status(401).json({ message: 'Prijava je obavezna.' });
  return next();
}

async function requireAdmin(req, res, next) {
  await requireAuth(req, res, () => {});
  if (!req.customer) return;
  if (!adminEmails.includes(String(req.customer.email || '').toLowerCase())) {
    return res.status(403).json({ message: 'Nemate admin prava.' });
  }
  return next();
}

async function findCustomerByIdentity(identity) {
  const clean = String(identity || '').trim();
  const lower = clean.toLowerCase();
  const { rows } = await pool.query(
    `SELECT c.*, ci.password_hash, ci.provider, ci.provider_subject
     FROM customers c
     LEFT JOIN customer_identities ci
       ON ci.customer_id = c.id
       AND ci.active = TRUE
       AND ci.provider = 'password'
     WHERE c.deleted_at IS NULL
       AND c.active = TRUE
       AND (
         lower(c.email) = $1
         OR c.normalized_email = $1
         OR c.phone = $2
         OR c.normalized_phone = $2
         OR lower(ci.provider_subject) = $1
       )
     LIMIT 1`,
    [lower, clean],
  );
  return rows[0] || null;
}

function splitDisplayName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || null,
    lastName: parts.slice(1).join(' ') || null,
  };
}

function rememberPasskeyChallenge(key, data) {
  passkeyChallenges.set(key, {
    ...data,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });
}

function takePasskeyChallenge(key) {
  const data = passkeyChallenges.get(key);
  passkeyChallenges.delete(key);
  if (!data || data.expiresAt < Date.now()) return null;
  return data;
}

function publicKeyToBase64Url(publicKey) {
  return Buffer.from(publicKey).toString('base64url');
}

function publicKeyFromBase64Url(publicKey) {
  return Buffer.from(publicKey, 'base64url');
}

async function createCustomerRecord(client, { email, phone, displayName }) {
  const { firstName, lastName } = splitDisplayName(displayName);
  const { rows } = await client.query(
    `INSERT INTO customers (
       organization_id,
       email,
       phone,
       display_name,
       first_name,
       last_name,
       email_verified,
       phone_verified
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      organizationId,
      email ? String(email).trim().toLowerCase() : null,
      phone || null,
      displayName,
      firstName,
      lastName,
      false,
      Boolean(phone),
    ],
  );
  return rows[0];
}

app.get(`${apiPrefix}/health`, (_req, res) => {
  res.json({ ok: true, service: 'daja-shop-api' });
});

app.post(`${apiPrefix}/customer-auth/register`, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { identity, email, username, phone, password, name } = req.body || {};
    const finalEmail = email || (String(identity || '').includes('@') ? identity : null);
    const finalUsername = username || (!String(identity || '').includes('@') && !String(identity || '').startsWith('+') ? identity : null);
    const finalPhone = phone || (String(identity || '').startsWith('+') ? identity : null);
    if (!password || (!finalEmail && !finalUsername && !finalPhone)) {
      return res.status(400).json({ message: 'Email, telefon ili username i lozinka su obavezni.' });
    }
    const subject = String(finalEmail || finalUsername || finalPhone).trim().toLowerCase();
    const existing = await findCustomerByIdentity(subject);
    if (existing) return res.status(409).json({ message: 'Nalog vec postoji.' });

    const displayName = name || finalEmail || finalUsername || finalPhone;
    const passwordHash = await argon2.hash(password);

    await client.query('BEGIN');
    const customer = await createCustomerRecord(client, {
      email: finalEmail,
      phone: finalPhone,
      displayName,
    });
    await client.query(
      `INSERT INTO customer_identities (
         organization_id,
         customer_id,
         provider,
         provider_subject,
         password_hash
       )
       VALUES ($1,$2,'password',$3,$4)`,
      [
        organizationId,
        customer.id,
        subject,
        passwordHash,
      ],
    );
    await client.query('COMMIT');
    res.status(201).json(signCustomer(customer));
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error.code === '23505') return res.status(409).json({ message: 'Nalog vec postoji.' });
    next(error);
  } finally {
    client.release();
  }
});

app.post(`${apiPrefix}/customer-auth/login`, async (req, res, next) => {
  try {
    const customer = await findCustomerByIdentity(req.body?.identity);
    if (!customer?.password_hash) return res.status(401).json({ message: 'Pogresni podaci za prijavu.' });
    const hash = customer.password_hash || '';
    const ok = hash.startsWith('$argon2')
      ? await argon2.verify(hash, req.body?.password || '')
      : await bcrypt.compare(req.body?.password || '', hash);
    if (!ok) return res.status(401).json({ message: 'Pogresni podaci za prijavu.' });
    res.json(signCustomer(customer));
  } catch (error) {
    next(error);
  }
});

app.post(`${apiPrefix}/customer-auth/refresh`, async (req, res, next) => {
  try {
    const decoded = jwt.verify(req.body?.refreshToken || '', refreshSecret);
    const { rows } = await pool.query('SELECT * FROM customers WHERE id = $1', [decoded.sub]);
    if (!rows[0]) return res.status(401).json({ message: 'Sesija je istekla.' });
    res.json(signCustomer(rows[0]));
  } catch (error) {
    next(error);
  }
});

app.post(`${apiPrefix}/customer-auth/logout`, (_req, res) => res.status(204).end());
app.get(`${apiPrefix}/customer-auth/me`, requireAuth, (req, res) => res.json(mapCustomer(req.customer)));
app.post(`${apiPrefix}/customer-auth/email/verification`, requireAuth, (_req, res) => res.json({ sent: true }));
app.post(`${apiPrefix}/customer-auth/verify-email`, optionalAuth, async (req, res, next) => {
  try {
    if (!req.customer) return res.json({ verified: true });
    await pool.query('UPDATE customers SET email_verified = TRUE, updated_at = now() WHERE id = $1', [req.customer.id]);
    res.json({ verified: true });
  } catch (error) {
    next(error);
  }
});
app.post(`${apiPrefix}/customer-auth/phone/start`, (_req, res) => res.json({ sent: true, devCode: process.env.NODE_ENV === 'production' ? undefined : '123456' }));
app.post(`${apiPrefix}/customer-auth/phone/verify`, optionalAuth, async (req, res, next) => {
  try {
    const { phone, code, purpose } = req.body || {};
    if (code && code !== '123456' && process.env.NODE_ENV !== 'production') {
      return res.status(400).json({ message: 'Pogresan kod.' });
    }
    if (purpose === 'link' && req.customer) {
      const { rows } = await pool.query(
        'UPDATE customers SET phone = $1, phone_verified = TRUE, updated_at = now() WHERE id = $2 RETURNING *',
        [phone, req.customer.id],
      );
      return res.json(mapCustomer(rows[0]));
    }
    let customer = await findCustomerByIdentity(phone);
    if (!customer) {
      const { rows } = await pool.query(
        'INSERT INTO customers (phone, name, phone_verified) VALUES ($1, $2, TRUE) RETURNING *',
        [phone, phone],
      );
      customer = rows[0];
    }
    res.json(signCustomer(customer));
  } catch (error) {
    next(error);
  }
});

app.get(`${apiPrefix}/customer-auth/oauth/:provider/start`, (req, res) => {
  const provider = String(req.params.provider || '').toLowerCase();
  if (!['google', 'facebook'].includes(provider)) {
    return res.status(404).json({ message: 'OAuth provider nije podrzan.' });
  }

  return res.status(501).json({
    message:
      `${provider} login nije jos povezan. Potrebni su OAuth client id/secret, callback URL i verify callback implementacija.`,
  });
});

app.post(`${apiPrefix}/customer-auth/passkeys/register-challenge`, optionalAuth, async (req, res, next) => {
  try {
    const identity = String(req.body?.identity || req.body?.email || '').trim().toLowerCase();
    const phone = String(req.body?.phone || '').trim();
    const displayName =
      req.body?.name ||
      req.customer?.display_name ||
      req.customer?.email ||
      identity ||
      phone ||
      'DajaShop korisnik';

    if (!req.customer && !identity && !phone) {
      return res.status(400).json({ message: 'Email ili telefon su obavezni za Passkey registraciju.' });
    }

    if (!req.customer) {
      const existingCustomer = await findCustomerByIdentity(identity || phone);
      if (existingCustomer) return res.status(409).json({ message: 'Nalog vec postoji. Prijavite se pa dodajte Passkey.' });
    }

    const existing = req.customer
      ? await pool.query('SELECT credential_id FROM webauthn_credentials WHERE customer_id = $1', [req.customer.id])
      : { rows: [] };
    const userHandle = req.customer?.id || randomUUID();
    const options = await generateRegistrationOptions({
      rpName: webauthnRpName,
      rpID: webauthnRpID,
      userID: Buffer.from(userHandle),
      userName: req.customer?.email || req.customer?.phone || identity || phone,
      userDisplayName: displayName,
      attestationType: 'none',
      excludeCredentials: existing.rows.map((row) => ({ id: row.credential_id })),
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
    });

    rememberPasskeyChallenge(`register:${options.challenge}`, {
      challenge: options.challenge,
      customerId: req.customer?.id || null,
      email: identity || null,
      phone: phone || null,
      displayName,
    });

    res.json(options);
  } catch (error) {
    next(error);
  }
});

app.post(`${apiPrefix}/customer-auth/passkeys/register-verify`, optionalAuth, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const response = req.body?.credential || req.body;
    const challenge = response?.response?.clientDataJSON
      ? JSON.parse(Buffer.from(response.response.clientDataJSON, 'base64url').toString('utf8')).challenge
      : null;
    const pending = challenge ? takePasskeyChallenge(`register:${challenge}`) : null;
    if (!pending) return res.status(400).json({ message: 'Passkey izazov je istekao. Pokusajte ponovo.' });

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: pending.challenge,
      expectedOrigin: webauthnOrigin,
      expectedRPID: webauthnRpID,
      requireUserVerification: false,
    });

    if (!verification.verified) {
      return res.status(400).json({ message: 'Passkey registracija nije verifikovana.' });
    }

    const { credential } = verification.registrationInfo;
    let customer = req.customer || null;
    await client.query('BEGIN');
    if (!customer) {
      const existingCustomer = await findCustomerByIdentity(pending.email || pending.phone);
      if (existingCustomer) {
        await client.query('ROLLBACK');
        return res.status(409).json({ message: 'Nalog vec postoji. Prijavite se pa dodajte Passkey.' });
      }
      customer = await createCustomerRecord(client, {
        email: pending.email,
        phone: pending.phone,
        displayName: pending.displayName,
      });
    }

    await client.query(
      `INSERT INTO webauthn_credentials (
         organization_id,
         customer_id,
         credential_id,
         public_key,
         counter,
         display_name
       )
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (organization_id, credential_id) DO UPDATE
       SET public_key = EXCLUDED.public_key,
           counter = EXCLUDED.counter,
           display_name = EXCLUDED.display_name`,
      [
        organizationId,
        customer.id,
        credential.id,
        publicKeyToBase64Url(credential.publicKey),
        credential.counter,
        pending.displayName,
      ],
    );
    await client.query('COMMIT');

    res.json({
      registered: true,
      ...signCustomer(customer),
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally {
    client.release();
  }
});

app.post(`${apiPrefix}/customer-auth/passkeys/login-challenge`, async (_req, res, next) => {
  try {
    const options = await generateAuthenticationOptions({
      rpID: webauthnRpID,
      userVerification: 'preferred',
    });

    rememberPasskeyChallenge(`login:${options.challenge}`, {
      challenge: options.challenge,
    });

    res.json(options);
  } catch (error) {
    next(error);
  }
});

app.post(`${apiPrefix}/customer-auth/passkeys/login-verify`, async (req, res, next) => {
  try {
    const response = req.body?.credential || req.body;
    const challenge = response?.response?.clientDataJSON
      ? JSON.parse(Buffer.from(response.response.clientDataJSON, 'base64url').toString('utf8')).challenge
      : null;
    const pending = challenge ? takePasskeyChallenge(`login:${challenge}`) : null;
    if (!pending) return res.status(400).json({ message: 'Passkey izazov je istekao. Pokusajte ponovo.' });

    const found = await pool.query(
      `SELECT
         wc.id AS webauthn_id,
         wc.credential_id,
         wc.public_key,
         wc.counter,
         c.id,
         c.email,
         c.phone,
         c.display_name,
         c.photo_url,
         c.email_verified,
         c.phone_verified,
         c.active,
         c.deleted_at
       FROM webauthn_credentials wc
       JOIN customers c ON c.id = wc.customer_id
       WHERE wc.credential_id = $1
       LIMIT 1`,
      [response.id],
    );
    const row = found.rows[0];
    if (!row || row.deleted_at || row.active === false) {
      return res.status(401).json({ message: 'Passkey nije pronadjen.' });
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: pending.challenge,
      expectedOrigin: webauthnOrigin,
      expectedRPID: webauthnRpID,
      requireUserVerification: false,
      credential: {
        id: row.credential_id,
        publicKey: publicKeyFromBase64Url(row.public_key),
        counter: Number(row.counter || 0),
      },
    });

    if (!verification.verified) {
      return res.status(401).json({ message: 'Passkey prijava nije verifikovana.' });
    }

    await pool.query(
      'UPDATE webauthn_credentials SET counter = $1, last_used_at = now() WHERE id = $2',
      [verification.authenticationInfo.newCounter, row.webauthn_id],
    );

    res.json(signCustomer(row));
  } catch (error) {
    next(error);
  }
});

app.patch(`${apiPrefix}/customer-auth/password`, requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT password_hash
       FROM customer_identities
       WHERE customer_id = $1
         AND provider = 'password'
         AND active = TRUE
       LIMIT 1`,
      [req.customer.id],
    );
    const hash = rows[0]?.password_hash || '';
    const ok = hash.startsWith('$argon2')
      ? await argon2.verify(hash, req.body?.currentPassword || '')
      : await bcrypt.compare(req.body?.currentPassword || '', hash);
    if (!ok) return res.status(400).json({ message: 'Trenutna lozinka nije ispravna.' });
    const nextHash = await argon2.hash(req.body?.newPassword || '');
    await pool.query(
      `UPDATE customer_identities
       SET password_hash = $1, updated_at = now()
       WHERE customer_id = $2
         AND provider = 'password'`,
      [nextHash, req.customer.id],
    );
    res.json({ updated: true });
  } catch (error) {
    next(error);
  }
});

app.get(`${apiPrefix}/customers/me`, requireAuth, (req, res) => res.json({ customer: mapCustomer(req.customer) }));
app.patch(`${apiPrefix}/customers/me`, requireAuth, async (req, res, next) => {
  try {
    const { displayName, name, photoURL } = req.body || {};
    const { rows } = await pool.query(
      `UPDATE customers SET name = COALESCE($1, name), photo_url = COALESCE($2, photo_url), updated_at = now()
       WHERE id = $3 RETURNING *`,
      [displayName || name || null, photoURL || null, req.customer.id],
    );
    res.json(mapCustomer(rows[0]));
  } catch (error) {
    next(error);
  }
});
app.get(`${apiPrefix}/customers/me/addresses`, requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM customer_addresses WHERE customer_id = $1 ORDER BY created_at DESC', [req.customer.id]);
    res.json(rowsPayload(rows));
  } catch (error) {
    next(error);
  }
});
app.post(`${apiPrefix}/customers/me/addresses`, requireAuth, async (req, res, next) => {
  try {
    const b = req.body || {};
    const { rows } = await pool.query(
      `INSERT INTO customer_addresses (customer_id, label, icon, name, address, city, zip, phone)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.customer.id, b.label || 'Kuca', b.icon || 'home', b.name || '', b.address || '', b.city || '', b.zip || '', b.phone || ''],
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});
app.patch(`${apiPrefix}/customers/me/addresses/:id`, requireAuth, async (req, res, next) => {
  try {
    const b = req.body || {};
    const { rows } = await pool.query(
      `UPDATE customer_addresses SET label=$1, icon=$2, name=$3, address=$4, city=$5, zip=$6, phone=$7, updated_at=now()
       WHERE id=$8 AND customer_id=$9 RETURNING *`,
      [b.label || 'Kuca', b.icon || 'home', b.name || '', b.address || '', b.city || '', b.zip || '', b.phone || '', req.params.id, req.customer.id],
    );
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});
app.delete(`${apiPrefix}/customers/me/addresses/:id`, requireAuth, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM customer_addresses WHERE id=$1 AND customer_id=$2', [req.params.id, req.customer.id]);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});
app.get(`${apiPrefix}/customers/me/cart`, requireAuth, (req, res) => res.json({ items: req.customer.cart_items || [] }));
app.put(`${apiPrefix}/customers/me/cart`, requireAuth, async (req, res, next) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    await pool.query('UPDATE customers SET cart_items=$1, updated_at=now() WHERE id=$2', [JSON.stringify(items), req.customer.id]);
    res.json({ items });
  } catch (error) {
    next(error);
  }
});
app.get(`${apiPrefix}/customers/me/wishlist`, requireAuth, (req, res) => res.json({ items: req.customer.wishlist_items || [] }));
app.post(`${apiPrefix}/customers/me/wishlist`, requireAuth, async (req, res, next) => {
  try {
    const current = Array.isArray(req.customer.wishlist_items) ? req.customer.wishlist_items : [];
    const item = req.body?.item || req.body;
    const itemId = item?.id || item?.productId;
    const nextItems = itemId && !current.some((x) => (x.id || x.productId) === itemId) ? [...current, item] : current;
    await pool.query('UPDATE customers SET wishlist_items=$1, updated_at=now() WHERE id=$2', [JSON.stringify(nextItems), req.customer.id]);
    res.json({ items: nextItems });
  } catch (error) {
    next(error);
  }
});
app.delete(`${apiPrefix}/customers/me/wishlist/:id`, requireAuth, async (req, res, next) => {
  try {
    const current = Array.isArray(req.customer.wishlist_items) ? req.customer.wishlist_items : [];
    const nextItems = current.filter((x) => (x.id || x.productId) !== req.params.id);
    await pool.query('UPDATE customers SET wishlist_items=$1, updated_at=now() WHERE id=$2', [JSON.stringify(nextItems), req.customer.id]);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get(`${apiPrefix}/public/catalog/products`, async (req, res, next) => {
  try {
    const order = req.query.order === 'price' ? 'price_amount ASC' : 'p.name ASC';
    const { rows } = await pool.query(`
      ${productSelectSql}
      WHERE p.active = TRUE
        AND p.published = TRUE
        AND p.deleted_at IS NULL
      ORDER BY ${order}
    `);
    res.json(rowsPayload(rows.map(mapProduct)));
  } catch (error) {
    next(error);
  }
});
app.get(`${apiPrefix}/public/catalog/products/:slug`, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `
        ${productSelectSql}
        WHERE p.slug=$1
          AND p.active=TRUE
          AND p.published=TRUE
          AND p.deleted_at IS NULL
        LIMIT 1
      `,
      [req.params.slug],
    );
    if (!rows[0]) return res.status(404).json({ message: 'Proizvod nije pronadjen.' });
    res.json({ product: mapProduct(rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.get([`${apiPrefix}/public/sitemap.xml`, '/sitemap.xml'], async (_req, res, next) => {
  try {
    const siteUrl = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://dajashop.rs').replace(/\/$/, '');
    const { rows } = await pool.query('SELECT slug, updated_at FROM products WHERE active=TRUE AND published=TRUE ORDER BY updated_at DESC');
    const urls = [
      `${siteUrl}/`,
      `${siteUrl}/catalog`,
      `${siteUrl}/about`,
      `${siteUrl}/contact`,
      ...rows.map((row) => `${siteUrl}/product/${row.slug}`),
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((loc) => `  <url><loc>${loc}</loc></url>`)
      .join('\n')}\n</urlset>`;
    res.type('application/xml').send(xml);
  } catch (error) {
    next(error);
  }
});

function collectionRoutes(table) {
  app.get(`${apiPrefix}/${table}`, requireAdmin, async (_req, res, next) => {
    try {
      const { rows } = await pool.query(`SELECT * FROM ${table} ORDER BY name ASC`);
      res.json(rowsPayload(rows));
    } catch (error) {
      next(error);
    }
  });
  app.post(`${apiPrefix}/${table}`, requireAdmin, async (req, res, next) => {
    try {
      const b = req.body || {};
      const cols = table === 'spec_keys' ? ['name', 'unit', 'department'] : table === 'categories' ? ['name', 'brand', 'department'] : ['name', 'department'];
      const values = cols.map((key) => b[key] || (key === 'department' ? 'satovi' : null));
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(',');
      const { rows } = await pool.query(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders}) RETURNING *`, values);
      res.status(201).json(rows[0]);
    } catch (error) {
      next(error);
    }
  });
  app.patch(`${apiPrefix}/${table}/:id`, requireAdmin, async (req, res, next) => {
    try {
      const b = req.body || {};
      const cols = table === 'spec_keys' ? ['name', 'unit', 'department'] : table === 'categories' ? ['name', 'brand', 'department'] : ['name', 'department'];
      const sets = cols.map((key, i) => `${key}=$${i + 1}`).join(',');
      const values = [...cols.map((key) => b[key] || (key === 'department' ? 'satovi' : null)), req.params.id];
      const { rows } = await pool.query(`UPDATE ${table} SET ${sets} WHERE id=$${values.length} RETURNING *`, values);
      res.json(rows[0]);
    } catch (error) {
      next(error);
    }
  });
  app.delete(`${apiPrefix}/${table}/:id`, requireAdmin, async (req, res, next) => {
    try {
      await pool.query(`DELETE FROM ${table} WHERE id=$1`, [req.params.id]);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });
}
['brands', 'categories', 'spec_keys'].forEach(collectionRoutes);

app.post(`${apiPrefix}/products`, requireAdmin, async (req, res, next) => {
  try {
    const b = req.body || {};
    const { rows } = await pool.query(
      `INSERT INTO products
       (name, slug, description, brand, category, department, gender, price_amount, image, main_image_url, thumbnail_url, images, specs, features, seo, model_3d_url, active, published)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING *`,
      [b.name, b.slug, b.description || '', b.brand || null, b.category || null, b.department || 'satovi', b.gender || null, cents(b.price ?? b.currentPriceAmount), b.image || null, b.mainImageUrl || null, b.thumbnailUrl || null, JSON.stringify(b.images || []), JSON.stringify(b.specs || {}), JSON.stringify(b.features || []), JSON.stringify(b.seo || {}), b.model3DUrl || null, b.active !== false, b.published !== false],
    );
    res.status(201).json(mapProduct(rows[0]));
  } catch (error) {
    next(error);
  }
});
app.patch(`${apiPrefix}/products/:id`, requireAdmin, async (req, res, next) => {
  try {
    const b = req.body || {};
    const { rows } = await pool.query(
      `UPDATE products SET name=$1, slug=$2, description=$3, brand=$4, category=$5, department=$6, gender=$7,
       price_amount=$8, image=$9, main_image_url=$10, thumbnail_url=$11, images=$12, specs=$13, features=$14, seo=$15,
       model_3d_url=$16, active=$17, published=$18, updated_at=now()
       WHERE id=$19 RETURNING *`,
      [b.name, b.slug, b.description || '', b.brand || null, b.category || null, b.department || 'satovi', b.gender || null, cents(b.price ?? b.currentPriceAmount), b.image || null, b.mainImageUrl || null, b.thumbnailUrl || null, JSON.stringify(b.images || []), JSON.stringify(b.specs || {}), JSON.stringify(b.features || []), JSON.stringify(b.seo || {}), b.model3DUrl || null, b.active !== false, b.published !== false, req.params.id],
    );
    res.json(mapProduct(rows[0]));
  } catch (error) {
    next(error);
  }
});
app.post(`${apiPrefix}/products/:id/variants`, requireAdmin, (_req, res) => res.status(201).json({ id: null }));
app.patch(`${apiPrefix}/variants/:id`, requireAdmin, (_req, res) => res.json({ updated: true }));
app.delete(`${apiPrefix}/products/:id`, requireAdmin, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM products WHERE id=$1', [req.params.id]);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post(`${apiPrefix}/orders`, optionalAuth, async (req, res, next) => {
  try {
    const b = req.body || {};
    const count = await pool.query('SELECT count(*)::int AS count FROM orders');
    const displayId = `DAJA-${String(count.rows[0].count + 1).padStart(5, '0')}`;
    const { rows } = await pool.query(
      `INSERT INTO orders
       (display_id, customer_id, customer, items, subtotal, promo_code, discount_amount, subtotal_after_discount, shipping_cost, shipping_method, payment_method, final_total)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [displayId, req.customer?.id || null, JSON.stringify(b.customer || {}), JSON.stringify(b.items || []), cents(b.subtotal), b.promoCode || null, cents(b.discountAmount), cents(b.subtotalAfterDiscount), cents(b.shippingCost), b.shippingMethod || 'courier', b.paymentMethod || 'cod', cents(b.finalTotal)],
    );
    res.status(201).json({ order: mapOrder(rows[0]) });
  } catch (error) {
    next(error);
  }
});
app.get(`${apiPrefix}/orders/me`, requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM orders WHERE customer_id=$1 ORDER BY created_at DESC', [req.customer.id]);
    res.json(rowsPayload(rows.map(mapOrder)));
  } catch (error) {
    next(error);
  }
});
app.get(`${apiPrefix}/admin/orders`, requireAdmin, async (_req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(rowsPayload(rows.map(mapOrder)));
  } catch (error) {
    next(error);
  }
});
app.patch(`${apiPrefix}/admin/orders/:id/status`, requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query('UPDATE orders SET status=$1, updated_at=now() WHERE id=$2 RETURNING *', [req.body?.status, req.params.id]);
    res.json(mapOrder(rows[0]));
  } catch (error) {
    next(error);
  }
});
app.patch(`${apiPrefix}/admin/orders/:id/read`, requireAdmin, async (req, res, next) => {
  try {
    await pool.query('UPDATE orders SET is_read=TRUE, updated_at=now() WHERE id=$1', [req.params.id]);
    res.json({ read: true });
  } catch (error) {
    next(error);
  }
});

app.get(`${apiPrefix}/products/:id/reviews`, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM product_reviews WHERE product_id=$1 ORDER BY created_at DESC', [req.params.id]);
    res.json(rowsPayload(rows.map((r) => ({
      id: r.id,
      userName: r.user_name,
      rating: r.rating,
      comment: r.comment,
      createdAt: { seconds: Math.floor(new Date(r.created_at).getTime() / 1000) },
    }))));
  } catch (error) {
    next(error);
  }
});
app.post(`${apiPrefix}/products/:id/reviews`, requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'INSERT INTO product_reviews (product_id, customer_id, user_name, rating, comment) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.params.id, req.customer.id, req.body?.userName || req.customer.name || req.customer.email, req.body?.rating, req.body?.comment || ''],
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

app.post(`${apiPrefix}/newsletter/subscribe`, async (req, res, next) => {
  try {
    await pool.query(
      'INSERT INTO newsletter_subscribers (email) VALUES ($1) ON CONFLICT (email) DO NOTHING',
      [String(req.body?.email || '').toLowerCase()],
    );
    res.status(201).json({ subscribed: true });
  } catch (error) {
    next(error);
  }
});

const s3 = process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    })
  : null;

async function storeImage(key, base64, contentType = 'image/webp') {
  const buffer = Buffer.from(base64, 'base64');
  if (s3 && process.env.R2_BUCKET && process.env.R2_PUBLIC_URL) {
    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));
    return `${process.env.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
  }
  const diskPath = join(process.cwd(), 'public', 'uploads', key);
  await mkdir(join(diskPath, '..'), { recursive: true });
  await writeFile(diskPath, buffer);
  return `/uploads/${key}`;
}

app.post(`${apiPrefix}/media/uploads`, requireAdmin, async (req, res, next) => {
  try {
    const b = req.body || {};
    const slug = b.slug || 'misc';
    const index = Number(b.index || 0);
    const originalKey = `products/${slug}/${b.originalFilename || `${index}-original.webp`}`;
    const thumbKey = `products/${slug}/${b.thumbFilename || `${index}-thumb.webp`}`;
    const original = b.originalBase64 ? await storeImage(originalKey, b.originalBase64) : null;
    const thumb = b.thumbBase64 ? await storeImage(thumbKey, b.thumbBase64) : original;
    res.json({ url: original, original, mainImageUrl: original, thumb, thumbnailUrl: thumb, path: originalKey });
  } catch (error) {
    next(error);
  }
});
app.post(`${apiPrefix}/media/remote-image`, requireAdmin, async (req, res) => {
  res.json({ success: false, url: req.body?.url, results: [], message: 'Remote image import nije omogucen bez image proxy obrade.' });
});
app.delete(`${apiPrefix}/media/uploads/:slug`, requireAdmin, async (req, res, next) => {
  try {
    if (s3 && process.env.R2_BUCKET) {
      await s3.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: `products/${req.params.slug}` })).catch(() => {});
    }
    res.json({ deleted: true });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, next) => {
  void next;
  console.error(error);
  res.status(error.status || 500).json({
    message: error.code === '23505' ? 'Duplikat nije dozvoljen.' : error.message || 'Server greska.',
  });
});

if (hasDatabasePlaceholder) {
  console.error('DATABASE_URL nije podesen na pravi Neon connection string. API server nije pokrenut.');
  process.exit(1);
}

app.listen(port, () => {
  console.log(`DAJA API listening on http://localhost:${port}${apiPrefix}`);
});
