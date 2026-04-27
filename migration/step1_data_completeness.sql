-- Step 1: Data Completeness Enforcement
-- Create RPC `create_record_validated` that:
--   1. Validates form_data is not empty (no {} payloads for new records)
--   2. Requires at least one business field matching the form's required fields
--   3. Only allow this RPC for admin/manager roles
--   4. Auto-generates serial if 'auto' is provided
-- This replaces direct REST INSERT for record creation.

-- Also: add a CHECK constraint that form_data must not be '{}' for new records
-- going forward. Existing records with {} form_data remain valid (added later, 
-- not worth backfilling).

CREATE OR REPLACE FUNCTION public.create_record_validated(
  p_form_code text,
  p_form_name text,
  p_form_data jsonb,
  p_status record_status_enum DEFAULT 'draft',
  p_serial text DEFAULT 'auto',
  p_section integer DEFAULT NULL,
  p_section_name text DEFAULT NULL,
  p_frequency text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS TABLE(out_id uuid, out_serial text, out_form_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_serial text;
  v_section integer;
  v_section_name text;
  v_frequency text;
  v_form_name text;
  v_id uuid;
  v_form_data jsonb;
begin
  -- ── GATE 1: Role check ─────────────────────────────────────────────────
  IF NOT public.has_role('admin') AND NOT public.has_role('manager') THEN
    RAISE EXCEPTION 'Insufficient role: admin or manager required';
  END IF;

  -- ── GATE 2: form_data must not be empty ────────────────────────────────
  -- New records MUST have at least one business field in form_data
  -- This prevents blank template records from entering the system
  v_form_data := p_form_data;
  IF v_form_data IS NULL OR v_form_data = '{}'::jsonb THEN
    RAISE EXCEPTION 'Validation failed: form_data cannot be empty. At least one business field is required.';
  END IF;

  -- ── GATE 3: Required fields check (form-specific) ──────────────────────
  -- Enforce that known required fields for each form are present in form_data
  -- This is a server-side enforcement layer — the frontend Zod schemas are more complete
  -- but this catches direct API calls that bypass the frontend.
  PERFORM public._validate_form_required_fields(p_form_code, v_form_data);

  -- ── Serial generation ──────────────────────────────────────────────────
  IF p_serial IS NULL OR p_serial = 'auto' THEN
    v_serial := public.get_next_serial(p_form_code);
  ELSE
    v_serial := p_serial;
    -- Check uniqueness
    PERFORM 1 FROM records WHERE serial = v_serial AND deleted_at IS NULL;
    IF FOUND THEN
      RAISE EXCEPTION 'Serial % already exists', v_serial;
    END IF;
  END IF;

  -- ── Derive section info from form code if not provided ──────────────────
  -- Section mapping: F/08-F/10 → 1, F/11-F/19 → 3, F/20-F/25 → 4,
  -- F/28-F/30 → 5, F/32-F/35 → 6, F/37-F/50 → 7
  IF p_section IS NULL THEN
    v_section := CASE
      WHEN p_form_code IN ('F/08','F/09','F/10','F/50') THEN 1
      WHEN p_form_code IN ('F/11','F/12','F/13','F/14','F/15','F/16','F/17','F/18','F/19') THEN 3
      WHEN p_form_code IN ('F/20','F/21','F/22','F/23','F/24','F/25') THEN 4
      WHEN p_form_code IN ('F/28','F/29','F/30') THEN 5
      WHEN p_form_code IN ('F/32','F/34','F/35') THEN 6
      WHEN p_form_code IN ('F/37','F/40','F/41','F/42','F/43','F/44','F/45','F/46','F/47','F/48') THEN 7
      ELSE 0
    END;
  ELSE
    v_section := p_section;
  END IF;

  IF p_section_name IS NULL THEN
    v_section_name := CASE v_section
      WHEN 1 THEN 'Sales & Customer Service'
      WHEN 3 THEN 'Planning & Risk'
      WHEN 4 THEN 'Management Review'
      WHEN 5 THEN 'HR & Training'
      WHEN 6 THEN 'Design & Development'
      WHEN 7 THEN 'Measurement & Improvement'
      ELSE 'General'
    END;
  ELSE
    v_section_name := p_section_name;
  END IF;

  IF p_frequency IS NULL THEN
    v_frequency := CASE p_form_code
      WHEN 'F/11' THEN 'Monthly'
      WHEN 'F/48' THEN 'Monthly'
      WHEN 'F/24' THEN 'Quarterly'
      WHEN 'F/25' THEN 'Semi-annual'
      WHEN 'F/40' THEN 'Semi-annual'
      WHEN 'F/15' THEN 'Annual'
      WHEN 'F/16' THEN 'Annual'
      WHEN 'F/42' THEN 'Annual'
      ELSE 'On event'
    END;
  ELSE
    v_frequency := p_frequency;
  END IF;

  v_form_name := p_form_name;

  -- ── INSERT ──────────────────────────────────────────────────────────────
  INSERT INTO records (
    form_code, serial, form_name, status, form_data,
    section, section_name, frequency,
    created_by, edit_count, modification_reason, deleted_at
  ) VALUES (
    p_form_code, v_serial, v_form_name, p_status, v_form_data,
    v_section, v_section_name, v_frequency,
    p_created_by, 0, '', NULL
  )
  RETURNING records.id, records.serial, records.form_code INTO v_id, v_serial, p_form_code;

  RETURN QUERY SELECT v_id, v_serial, p_form_code;
END;
$function$;


-- Helper: Validate required fields per form code
-- This is a simplified server-side check — the frontend Zod schemas are more complete
-- but this catches direct API calls bypassing the frontend.
CREATE OR REPLACE FUNCTION public._validate_form_required_fields(
  p_form_code text,
  p_form_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_required_fields text[];
  v_missing text[];
  v_field text;
BEGIN
  -- Define required fields per form code
  -- These match the Zod schemas in formValidation.ts
  v_required_fields := CASE p_form_code
    WHEN 'F/08' THEN ARRAY['date','client_name']
    WHEN 'F/09' THEN ARRAY['date','complainant_name','complaint_type','description']
    WHEN 'F/10' THEN ARRAY['date','client_name']
    WHEN 'F/11' THEN ARRAY['date','month','year','batch_count']
    WHEN 'F/12' THEN ARRAY['date','nc_title','nc_description','nc_type']
    WHEN 'F/13' THEN ARRAY['date','title','description']
    WHEN 'F/14' THEN ARRAY['date','title','description','severity']
    WHEN 'F/15' THEN ARRAY['date','objective','scope']
    WHEN 'F/16' THEN ARRAY['date','supplier_name','evaluation_result']
    WHEN 'F/17' THEN ARRAY['date','title','description','status']
    WHEN 'F/18' THEN ARRAY['date','document_title','revision']
    WHEN 'F/19' THEN ARRAY['date','project_name','review_type']
    WHEN 'F/20' THEN ARRAY['date','agenda_items']
    WHEN 'F/21' THEN ARRAY['date','attendees','decisions']
    WHEN 'F/22' THEN ARRAY['date','document_title','version']
    WHEN 'F/23' THEN ARRAY['date','form_code_ref','record_serial']
    WHEN 'F/24' THEN ARRAY['date','quarter','objectives_reviewed']
    WHEN 'F/25' THEN ARRAY['date','semester','objectives_met']
    WHEN 'F/28' THEN ARRAY['date','training_topic','trainer','attendees']
    WHEN 'F/29' THEN ARRAY['date','employee_name','competence_area']
    WHEN 'F/30' THEN ARRAY['date','employee_name','performance_rating']
    WHEN 'F/32' THEN ARRAY['date','design_project','phase']
    WHEN 'F/34' THEN ARRAY['date','project_name','design_output']
    WHEN 'F/35' THEN ARRAY['date','project_name','monitoring_method']
    WHEN 'F/37' THEN ARRAY['date','nc_reference','root_cause','corrective_action']
    WHEN 'F/40' THEN ARRAY['date','competence_area','evaluation_method']
    WHEN 'F/41' THEN ARRAY['date','audit_type','auditor','scope']
    WHEN 'F/42' THEN ARRAY['date','area','findings']
    WHEN 'F/43' THEN ARRAY['date','employee_name','qualification']
    WHEN 'F/44' THEN ARRAY['date','area','status']
    WHEN 'F/45' THEN ARRAY['date','document_title','version']
    WHEN 'F/46' THEN ARRAY['date','procedure_title','version']
    WHEN 'F/47' THEN ARRAY['date','nc_title','corrective_action']
    WHEN 'F/48' THEN ARRAY['date','month','audit_findings']
    WHEN 'F/50' THEN ARRAY['date','client_name','description']
    ELSE ARRAY[]::text[]
  END;

  -- Check each required field exists in form_data and is not null/empty
  IF array_length(v_required_fields, 1) > 0 THEN
    FOREACH v_field IN ARRAY v_required_fields LOOP
      IF NOT (p_form_data ? v_field) OR
         (p_form_data->>v_field IS NULL) OR
         (p_form_data->>v_field = '') THEN
        v_missing := array_append(v_missing, v_field);
      END IF;
    END LOOP;

    IF array_length(v_missing, 1) > 0 THEN
      RAISE EXCEPTION 'Validation failed: required fields missing: %', array_to_string(v_missing, ', ');
    END IF;
  END IF;
END;
$function$;