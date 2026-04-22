-- ============================================================================
-- QMS FORGE — PHASE E: HARD CUTOVER
-- Executes in STRICT ORDER. No mixed state allowed.
--
-- PREREQUISITES:
--   1. Phase A backup VERIFIED
--   2. Phase B schema build COMPLETE
--   3. Phase C data migration COMPLETE + VALIDATED
--   4. Phase D infrastructure COMPLETE
--   5. Frontend deployed with ONLY new schema
--
-- This script:
--   - Adds NOT NULL constraints on required columns
--   - Adds unique constraint on serial
--   - Enforces status enum
--   - Removes ability to read/write legacy columns from frontend
--
-- DO NOT RUN until frontend cutover is deployed and verified.
-- ============================================================================

-- ============================================================================
-- STEP 1: NOT NULL constraints on required columns
-- ============================================================================
ALTER TABLE public.records ALTER COLUMN form_code SET NOT NULL;
ALTER TABLE public.records ALTER COLUMN serial SET NOT NULL;
ALTER TABLE public.records ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.records ALTER COLUMN form_data SET NOT NULL;
ALTER TABLE public.records ALTER COLUMN form_name SET NOT NULL;
ALTER TABLE public.records ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.records ALTER COLUMN updated_at SET NOT NULL;

-- ============================================================================
-- STEP 2: UNIQUE constraint on serial (active records only)
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_records_serial_unique_active
  ON public.records (serial)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- STEP 3: CHECK constraints
-- ============================================================================

-- edit_count must be >= 0
ALTER TABLE public.records ADD CONSTRAINT chk_records_edit_count
  CHECK (edit_count >= 0);

-- section must be 0-7
ALTER TABLE public.records ADD CONSTRAINT chk_records_section
  CHECK (section >= 0 AND section <= 7);

-- status must be valid enum value (belt-and-suspenders with the ENUM type)
ALTER TABLE public.records ADD CONSTRAINT chk_records_status
  CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected'));

-- ============================================================================
-- STEP 4: Update any remaining NULL values with defaults
-- (Shouldn't exist after Phase C, but safety net)
-- ============================================================================
UPDATE public.records SET form_data = '{}'::jsonb WHERE form_data IS NULL;
UPDATE public.records SET form_code = code WHERE form_code IS NULL OR form_code = '';
UPDATE public.records SET serial = last_serial WHERE serial IS NULL OR serial = '';
UPDATE public.records SET serial = code WHERE serial IS NULL OR serial = '';
UPDATE public.records SET form_name = record_name WHERE form_name IS NULL OR form_name = '';
UPDATE public.records SET status = 'draft' WHERE status IS NULL;
UPDATE public.records SET edit_count = 0 WHERE edit_count IS NULL;

-- ============================================================================
-- VERIFICATION: Confirm all constraints are enforced
-- ============================================================================
-- Run: SELECT constraint_name, check_clause 
--   FROM information_schema.check_constraints 
--   WHERE table_name = 'records';