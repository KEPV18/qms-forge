// ============================================================================
// Form Template Index
// Maps form codes to their DOCX-accurate React components.
// Forms without a dedicated template fall back to SchemaDrivenRecordView.
// ============================================================================

import React from "react";
import { F08Template } from "./F08Template";

export interface FormTemplateProps {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  className?: string;
}

type FormTemplateComponent = React.FC<FormTemplateProps>;

const TEMPLATE_MAP: Record<string, FormTemplateComponent> = {
  "F/08": F08Template,
  // Add more forms here as they're built:
  // "F/09": F09Template,
  // "F/10": F10Template,
  // ...
};

/**
 * Returns the DOCX-accurate template component for a form code,
 * or null if no dedicated template exists (fallback to schema-driven view).
 */
export function getFormTemplateComponent(formCode: string): FormTemplateComponent | null {
  return TEMPLATE_MAP[formCode] ?? null;
}

export { F08Template };