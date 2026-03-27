-- Migration 001: Add campaign_type and status columns to messages table
-- Run this in the Supabase SQL editor if you already have the messages table created.

ALTER TABLE messages ADD COLUMN IF NOT EXISTS campaign_type TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
  CHECK (status IN ('draft', 'sent', 'archived'));
