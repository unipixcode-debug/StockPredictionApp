#!/bin/bash
# Migration script for credit system
echo "Applying database migrations..."

sudo -u postgres psql -d prediction_db <<SQL
-- Add developer role to existing enum if it doesn't exist
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'developer' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_Users_role')) THEN
    ALTER TYPE "enum_Users_role" ADD VALUE 'developer';
  END IF;
END \$\$;

-- Add credits column if missing
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 100;

-- Add tier column if missing
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'FREE';

-- Create AdminLogs table
CREATE TABLE IF NOT EXISTS "AdminLogs" (
  "id" UUID PRIMARY KEY,
  "adminId" UUID NOT NULL,
  "adminName" VARCHAR(255) NOT NULL,
  "action" VARCHAR(255) NOT NULL,
  "targetId" VARCHAR(255),
  "details" JSONB,
  "ipAddress" VARCHAR(255),
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create GlobalSettings table if it doesn't exist
CREATE TABLE IF NOT EXISTS "GlobalSettings" (
  key VARCHAR(255) PRIMARY KEY,
  value VARCHAR(255) NOT NULL,
  description VARCHAR(255),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed default settings
INSERT INTO "GlobalSettings" (key, value, description) VALUES
  ('price_per_100_tokens', '9.99', '100 Token Paketi Fiyatı (USD)'),
  ('price_per_500_tokens', '39.99', '500 Token Paketi (Pro) Fiyatı (USD)'),
  ('price_per_1000_tokens', '69.99', '1000 Token Paketi (Premium) Fiyatı (USD)'),
  ('news_enabled', 'true', 'Haber Akışı aktif mi?'),
  ('auto_prediction_enabled', 'true', 'Otomatik tahmin aktif mi?'),
  ('money_flow_ai_enabled', 'true', 'Money Flow AI aktif mi?')
ON CONFLICT (key) DO NOTHING;

SELECT 'Migration completed successfully!' as status;
SQL

echo "Database migration done."
