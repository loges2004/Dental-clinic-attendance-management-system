-- Migration: Make email column nullable in users table
-- This allows creating staff/nurses without requiring an email address

ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
