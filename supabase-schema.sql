-- Run these SQL commands in your Supabase SQL Editor to create the required tables

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  product_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  size TEXT NOT NULL,
  color TEXT,
  quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  product_id TEXT NOT NULL,
  action TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  performed_by TEXT,
  location TEXT,
  notes TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- QR Codes table
CREATE TABLE IF NOT EXISTS qr_codes (
  id SERIAL PRIMARY KEY,
  product_id TEXT UNIQUE NOT NULL,
  qr_data TEXT NOT NULL,
  qr_image_base64 TEXT,
  qr_image_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_product_id ON products(product_id);
CREATE INDEX IF NOT EXISTS idx_transactions_product_id ON transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_qr_codes_product_id ON qr_codes(product_id);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (modify as needed for your security requirements)
CREATE POLICY "Enable all access for products" ON products
  FOR ALL USING (true);

CREATE POLICY "Enable all access for transactions" ON transactions
  FOR ALL USING (true);

CREATE POLICY "Enable all access for qr_codes" ON qr_codes
  FOR ALL USING (true);