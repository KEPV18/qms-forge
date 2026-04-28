// ============================================================================
// Form Template Index
// Maps form codes to their DOCX-accurate React components.
// Forms without a dedicated template fall back to SchemaDrivenRecordView.
// ============================================================================

import React from "react";
import { F08Template } from "./F08Template";
import { F09Template } from "./F09Template";
import { F10Template } from "./F10Template";
import { F12Template } from "./F12Template";
import { F13Template } from "./F13Template";
import { F14Template } from "./F14Template";
import { F15Template } from "./F15Template";
import { F16Template } from "./F16Template";
import { F17Template } from "./F17Template";
import { F18Template } from "./F18Template";
import { F19Template } from "./F19Template";
import { F20Template } from "./F20Template";
import { F21Template } from "./F21Template";
import { F22Template } from "./F22Template";
import { F23Template } from "./F23Template";
import { F24Template } from "./F24Template";
import { F25Template } from "./F25Template";
import { F28Template } from "./F28Template";
import { F34Template } from "./F34Template";
import { F35Template } from "./F35Template";
import { F44Template } from "./F44Template";
import { F45Template } from "./F45Template";
import { F46Template } from "./F46Template";
import { F48Template } from "./F48Template";
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
  "F/12": F12Template,
  "F/13": F13Template,
  "F/14": F14Template,
  "F/15": F15Template,
  "F/16": F16Template,
  "F/17": F17Template,
  "F/18": F18Template,
  "F/19": F19Template,
  "F/20": F20Template,
  "F/21": F21Template,
  "F/22": F22Template,
  "F/23": F23Template,
  "F/24": F24Template,
  "F/25": F25Template,
  "F/28": F28Template,
  "F/34": F34Template,
  "F/35": F35Template,
  "F/44": F44Template,
  "F/45": F45Template,
  "F/46": F46Template,
  "F/48": F48Template,
  "F/50": F50Template,
  // Remaining forms use SchemaDrivenRecordView fallback:
  // F/11 (Production Plan - complex with product table)
  // F/29 (Training & Competence - wide 34-col matrix)
  // F/30 (Performance Appraisal - 39-row complex)
  // F/32 (R&D Request - multi-section)
  // F/37 (Experiment Data Sheet - complex)
  // F/40 (Competence Matrix - wide matrix)
  // F/41 (Competence Gap Analysis - wide matrix)
  // F/42 (Annual Training Program)
  // F/43 (Induction Training - already has detailed data)
  // F/47 (Internal Audit Checklist - 303 rows)
};

/**
 * Returns the DOCX-accurate template component for a form code,
 * or null if no dedicated template exists (fallback to schema-driven view).
 */
export function getFormTemplateComponent(formCode: string): FormTemplateComponent | null {
  return TEMPLATE_MAP[formCode] ?? null;
}

export {
  F08Template, F09Template, F10Template, F12Template, F13Template, F14Template,
  F15Template, F16Template, F17Template, F18Template, F19Template, F20Template,
  F21Template, F22Template, F23Template, F24Template, F25Template, F28Template,
  F34Template, F35Template, F44Template, F45Template, F46Template, F48Template,
  F50Template,
};