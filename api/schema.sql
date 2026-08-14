CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000101',
  email TEXT UNIQUE,
  normalized_email TEXT,
  username TEXT UNIQUE,
  phone TEXT UNIQUE,
  normalized_phone TEXT,
  password_hash TEXT,
  name TEXT NOT NULL DEFAULT '',
  display_name TEXT,
  first_name TEXT,
  last_name TEXT,
  photo_url TEXT,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at TIMESTAMPTZ,
  cart_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  wishlist_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE customers ADD COLUMN IF NOT EXISTS organization_id UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000101';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS normalized_email TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS normalized_phone TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE customers SET normalized_email = lower(email) WHERE normalized_email IS NULL AND email IS NOT NULL;
UPDATE customers SET normalized_phone = phone WHERE normalized_phone IS NULL AND phone IS NOT NULL;
UPDATE customers SET display_name = name WHERE display_name IS NULL;

CREATE INDEX IF NOT EXISTS customers_active_idx ON customers(active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS customers_normalized_email_idx ON customers(normalized_email);
CREATE INDEX IF NOT EXISTS customers_normalized_phone_idx ON customers(normalized_phone);

CREATE TABLE IF NOT EXISTS customer_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000101',
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_subject TEXT NOT NULL,
  password_hash TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, provider, provider_subject)
);

CREATE INDEX IF NOT EXISTS customer_identities_customer_idx ON customer_identities(customer_id);
CREATE INDEX IF NOT EXISTS customer_identities_provider_idx ON customer_identities(provider, provider_subject);

CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-4000-8000-000000000101',
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  UNIQUE(organization_id, credential_id)
);

CREATE TABLE IF NOT EXISTS customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Kuca',
  icon TEXT NOT NULL DEFAULT 'home',
  name TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  zip TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL DEFAULT 'satovi',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  department TEXT NOT NULL DEFAULT 'satovi',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS categories_unique_idx
  ON categories(name, COALESCE(brand, ''), department);

CREATE TABLE IF NOT EXISTS spec_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  unit TEXT,
  department TEXT NOT NULL DEFAULT 'satovi',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name, department)
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  brand TEXT,
  category TEXT,
  department TEXT NOT NULL DEFAULT 'satovi',
  gender TEXT,
  price_amount INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'RSD',
  image TEXT,
  main_image_url TEXT,
  thumbnail_url TEXT,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  specs JSONB NOT NULL DEFAULT '{}'::jsonb,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  seo JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_3d_url TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_active_idx ON products(active, published);
CREATE INDEX IF NOT EXISTS products_brand_idx ON products(brand);
CREATE INDEX IF NOT EXISTS products_category_idx ON products(category);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer JSONB NOT NULL DEFAULT '{}'::jsonb,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'Na cekanju',
  subtotal INTEGER NOT NULL DEFAULT 0,
  promo_code TEXT,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  subtotal_after_discount INTEGER NOT NULL DEFAULT 0,
  shipping_cost INTEGER NOT NULL DEFAULT 0,
  shipping_method TEXT NOT NULL DEFAULT 'courier',
  payment_method TEXT NOT NULL DEFAULT 'cod',
  final_total INTEGER NOT NULL DEFAULT 0,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders(customer_id);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders(created_at DESC);

CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL DEFAULT '',
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
