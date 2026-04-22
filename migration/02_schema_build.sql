-- ============================================================================
-- QMS FORGE — PHASE B: NEW SCHEMA BUILD
-- Adds ALL new columns, constraints, indexes, enums.
-- Legacy columns KEPT temporarily (dropped in Phase G).
-- Safe to run on production — no data loss, no downtime.
--
-- Execution: Run via Supabase SQL Editor or psql
-- Prerequisite: Phase A backup VERIFIED
-- ============================================================================

-- ============================================================================
-- 1. STATUS ENUM
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'record_status_enum') THEN
    CREATE TYPE public.record_status_enum AS ENUM (
      'draft',
      'pending_review',
      'approved',
      'rejected'
    );
  END IF;
END $$;

-- ============================================================================
-- 2. NEW COLUMNS — All nullable initially (data migration fills them)
-- ============================================================================

-- form_code: The form code (e.g. F/08, F/12). Eventually replaces `code`
ALTER TABLE public.records ADD COLUMN IF NOT EXISTS form_code text;
-- serial: The record serial (e.g. F/08-001). Eventually replaces `last_serial`
ALTER TABLE public.records ADD COLUMN IF NOT EXISTS serial text;
-- form_name: Human-readable name (e.g. "Order Form"). Eventually replaces `record_name`
ALTER TABLE public.records ADD COLUMN IF NOT EXISTS form_name text;
-- form_data: The actual form field data (JSONB). Eventually replaces `file_reviews`
ALTER TABLE public.records ADD COLUMN IF NOT EXISTS form_data jsonb DEFAULT '{}';
-- status: Record lifecycle status. Eventually replaces `record_status`
ALTER TABLE public.records ADD COLUMN IF NOT EXISTS status public.record_status_enum DEFAULT 'draft';
-- created_by: Who created this record
ALTER TABLE public.records ADD COLUMN IF NOT EXISTS created_by text DEFAULT '';
-- last_modified_by: Who last modified this record
ALTER TABLE public.records ADD COLUMN IF NOT EXISTS last_modified_by text DEFAULT '';
-- edit_count: Incremented on each update (optimistic locking)
ALTER TABLE public.records ADD COLUMN IF NOT EXISTS edit_count integer DEFAULT 0;
-- modification_reason: Reason for last modification
ALTER TABLE public.records ADD COLUMN IF NOT EXISTS modification_reason text DEFAULT '';
-- section: Section number (1-7) for grouping
ALTER TABLE public.records ADD COLUMN IF NOT EXISTS section integer;
-- section_name: Section name (e.g. "Sales & Customer Service")
ALTER TABLE public.records ADD COLUMN IF NOT EXISTS section_name text DEFAULT '';
-- frequency: How often this form is filled
ALTER TABLE public.records ADD COLUMN IF NOT EXISTS frequency text DEFAULT '';
-- deleted_at: Soft delete timestamp (NULL = active)
ALTER TABLE public.records ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- ============================================================================
-- 3. INDEXES for query performance
-- ============================================================================

-- Primary lookup: form_code + serial
CREATE INDEX IF NOT EXISTS idx_records_form_code ON public.records (form_code);
CREATE INDEX IF NOT EXISTS idx_records_serial ON public.records (serial);
CREATE INDEX IF NOT EXISTS idx_records_serial_unique ON public.records (serial) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_records_status ON public.records (status);
CREATE INDEX IF NOT EXISTS idx_records_form_code_status ON public.records (form_code, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_records_section ON public.records (section) WHERE deleted_at IS NULL;

-- Created/updated timestamps
CREATE INDEX IF NOT EXISTS idx_records_created_at ON public.records (created_at);
CREATE INDEX IF NOT EXISTS idx_records_updated_at ON public.records (updated_at);

-- Audit log lookups
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON public.audit_log (record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log (action);

-- ============================================================================
-- 4. CONSTRAINTS (added AFTER data migration — see Phase C script)
-- These are SAFE to add now because new columns are nullable:
-- ============================================================================

-- Unique serial constraint (partial — only active records)
-- NOTE: Will be enforced AFTER data migration validates no duplicates
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_records_serial_unique_active 
--   ON public.records (serial) WHERE deleted_at IS NULL AND serial IS NOT NULL;

-- ============================================================================
-- 5. AUDIT LOG — Add missing columns for rich audit
-- ============================================================================

ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS action_type text;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS form_code text;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS serial text;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS user_email text;

-- Indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_log_form_code ON public.audit_log (form_code);
CREATE INDEX IF NOT EXISTS idx_audit_log_serial ON public.audit_log (serial);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log (created_at);

-- ============================================================================
-- 6. NOTIFICATIONS TABLE — Ensure it exists with proper schema
-- ============================================================================
-- (Already exists from prior work — just verify and add indexes if missing)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications (read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications (type);

-- ============================================================================
-- VERIFICATION: List all columns on records
-- ============================================================================
-- Run this after: SELECT column_name, data_type FROM information_schema.columns 
--   WHERE table_name = 'records' ORDER BY ordinal_position;