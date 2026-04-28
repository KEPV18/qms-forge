// ============================================================================
// Form Template Index
// Maps form codes to their DOCX-accurate React components.
// Forms without a dedicated template fall back to SchemaDrivenRecordView.
// ============================================================================

import React from "react";
import { F08Template } from "./F08Template";
import { F09Template } from "./F09Template";
import { F10Template } from "./F10Template";
import { F50Template } from "./F50Template";

export interface FormTemplateProps {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  className?: string;
}

type FormTemplateComponent = React.FC<FormTemplateProps>;

const TEMPLATE_MAP: Record<string, FormTemplateComponent> = {
  "F/08": F08Template,
  "F/09": F09Template,
  "F/10": F10Template,
  "F/50": F50Template,
  // Add more forms here as they're built
};

/**
 * Returns the DOCX-accurate template component for a form code,
 * or null if no dedicated template exists (fallback to schema-driven view).
 */
export function getFormTemplateComponent(formCode: string): FormTemplateComponent | null {
  return TEMPLATE_MAP[formCode] ?? null;
}

export { F08Template, F09Template, F10Template, F50Template };