-- Fix _validate_form_required_fields to match Zod schemas (formSchemas.ts)
-- All 35 forms now have DOCX-accurate templates with correct field keys
-- Old SQL had placeholder/generic field names that didn't match actual form data keys

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
    WHEN 'F/08' THEN ARRAY['date', 'client_name']
    WHEN 'F/09' THEN ARRAY['date', 'client_name', 'description', 'complaint_nature']
    WHEN 'F/10' THEN ARRAY['date', 'client_name']
    WHEN 'F/11' THEN ARRAY['date', 'month', 'year', 'name', 'prepared_by', 'approved_by']
    WHEN 'F/12' THEN ARRAY['date', 'nc_type', 'description', 'corrective_action', 'reported_by']
    WHEN 'F/13' THEN ARRAY['date', 'supplier', 'description', 'quantity', 'requested_by', 'approved_by']
    WHEN 'F/14' THEN ARRAY['date', 'supplier', 'items_inspected', 'inspector']
    WHEN 'F/15' THEN ARRAY['year', 'name', 'service', 'prepared_by', 'approved_by']
    WHEN 'F/16' THEN ARRAY['date', 'supplier_name', 'service_type', 'evaluated_by']
    WHEN 'F/17' THEN ARRAY['date', 'description', 'requested_by']
    WHEN 'F/18' THEN ARRAY['date', 'product', 'reason', 'authorized_by']
    WHEN 'F/19' THEN ARRAY['date', 'project_name', 'client_name', 'description', 'prepared_by', 'approved_by']
    WHEN 'F/20' THEN ARRAY['date', 'chairperson', 'item', 'prepared_by']
    WHEN 'F/21' THEN ARRAY['meeting_date', 'chairperson', 'attendees', 'discussion', 'decisions', 'action', 'minutes_by', 'approved_by']
    WHEN 'F/22' THEN ARRAY['date', 'problem_description', 'root_cause', 'corrective_action', 'responsible', 'initiated_by']
    WHEN 'F/23' THEN ARRAY['date', 'form_code', 'record_serial', 'maintained_by']
    WHEN 'F/24' THEN ARRAY['date', 'quarter', 'year', 'objective', 'target', 'prepared_by', 'reviewed_by']
    WHEN 'F/25' THEN ARRAY['date', 'period', 'year', 'scope', 'department', 'prepared_by', 'approved_by']
    WHEN 'F/28' THEN ARRAY['date', 'course_name', 'trainer', 'name', 'trainer_signature', 'manager_signature']
    WHEN 'F/29' THEN ARRAY['date', 'employee_name', 'employee_id', 'department', 'course_name', 'training_date', 'trainer', 'recorded_by']
    WHEN 'F/30' THEN ARRAY['date', 'employee_name', 'employee_id', 'department', 'period', 'criterion', 'score', 'overall_score', 'evaluator', 'employee_signature']
    WHEN 'F/32' THEN ARRAY['date', 'title', 'objective', 'requested_by', 'approved_by']
    WHEN 'F/34' THEN ARRAY['date', 'project', 'findings', 'verified_by']
    WHEN 'F/35' THEN ARRAY['date', 'month', 'year', 'project', 'progress', 'monitored_by']
    WHEN 'F/37' THEN ARRAY['date', 'experiment_title', 'recorded_by']
    WHEN 'F/40' THEN ARRAY['date', 'period', 'name', 'skill', 'prepared_by']
    WHEN 'F/41' THEN ARRAY['date', 'gaps', 'training_needed', 'prepared_by']
    WHEN 'F/42' THEN ARRAY['date', 'year', 'objectives', 'course', 'prepared_by', 'approved_by']
    WHEN 'F/43' THEN ARRAY['date', 'employee_name', 'employee_id', 'department', 'project', 'qualification', 'trainer', 'issued_by', 'trainer_signature', 'manager_signature']
    WHEN 'F/44' THEN ARRAY['date', 'job_title', 'department', 'responsibilities', 'prepared_by']
    WHEN 'F/45' THEN ARRAY['date', 'doc_id', 'title', 'maintained_by']
    WHEN 'F/46' THEN ARRAY['date', 'change_type', 'description', 'reason', 'approved_by']
    WHEN 'F/47' THEN ARRAY['date', 'department', 'clause', 'requirement', 'auditor']
    WHEN 'F/48' THEN ARRAY['date', 'month', 'year', 'scope', 'findings', 'auditor', 'reviewed_by']
    WHEN 'F/50' THEN ARRAY['date', 'client_name', 'description']
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
      RAISE EXCEPTION 'Missing required fields for form %: %', p_form_code, array_to_string(v_missing, ', ');
    END IF;
  END IF;
END;
$function$;