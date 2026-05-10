-- ============================================================================
-- CAPA Evidence Table — ISO 9001:2015 Clause 10.2
-- Tracks evidence items attached to each CAPA with status-based review workflow.
-- CAPA-001 FIX: supports rejected status for closure gate logic.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.capa_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capa_id uuid NOT NULL REFERENCES public.capas(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'document'
    CHECK (type IN ('document', 'photo', 'measurement', 'test_result', 'other')),
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by text NOT NULL DEFAULT '',
  reviewed_at timestamp with time zone,
  reviewer_comment text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast lookup by CAPA
CREATE INDEX IF NOT EXISTS idx_capa_evidence_capa_id ON public.capa_evidence(capa_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_capa_evidence_status ON public.capa_evidence(status);

-- Enable RLS
ALTER TABLE public.capa_evidence ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all evidence
CREATE POLICY "Authenticated users can read capa evidence"
  ON public.capa_evidence FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert evidence
CREATE POLICY "Authenticated users can insert capa evidence"
  ON public.capa_evidence FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update evidence (for review workflow)
CREATE POLICY "Authenticated users can update capa evidence"
  ON public.capa_evidence FOR UPDATE
  TO authenticated
  USING (true);

-- Updated_at auto-update trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER capa_evidence_updated_at
  BEFORE UPDATE ON public.capa_evidence
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();