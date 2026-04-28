// ============================================================================
// F/09 — Customer Complaint Report
// Pixel-perfect replica of the Word DOCX template layout.
// Supports three modes:
//   isTemplate=true           → read-only placeholder view (Template tab)
//   isTemplate=false, editMode=false → filled record view (Record page)
//   isTemplate=false, editMode=true   → editable form (Create/Edit page)
// ============================================================================

import React, { useState } from "react";
import { cn } from "@/lib/utils";

export interface F09Props {
  data?: Record<string, unknown>;
  isTemplate?: boolean;
  editMode?: boolean;
  onChange?: (field: string, value: string) => void;
  className?: string;
}

function val(data: Record<string, unknown> | undefined, key: string): string {
  if (!data) return "";
  const v = data[key];
  if (v == null) return "";
  if (typeof v === "string") return v;
  return String(v);
}

function todayDDMMYYYY(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
}

/* 12-column grid matching DOCX proportions */

export function F09Template({ data, isTemplate = true, editMode = false, onChange, className }: F09Props) {
  const d = data ?? {};
  const readonly = isTemplate || !editMode;
  const [natureChecks, setNatureChecks] = useState<Record<string, boolean>>({
    serious: val(d, "complaint_nature") === "SERIOUS",
    major: val(d, "complaint_nature") === "MAJOR",
    minor: val(d, "complaint_nature") === "MINOR",
  });

  // ── Styling presets ─────────────────────────────────────────────────
  const labelCls = "bg-slate-100 dark:bg-slate-800 font-semibold text-sm px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300";
  const valueCls = "px-2 py-2 border border-slate-300 dark:border-slate-600 text-sm text-slate-900 dark:text-slate-100 min-h-[2.25rem]";
  const emptyValueCls = cn(valueCls, isTemplate ? "text-slate-300 dark:text-slate-600" : "");
  const titleCls = "bg-slate-100 dark:bg-slate-800 font-bold text-base px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100";
  const headerCls = "bg-indigo-50 dark:bg-indigo-950 font-semibold text-xs uppercase tracking-wide px-3 py-2 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300";
  const inputCls = "w-full bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600";

  // ── Cell helpers ────────────────────────────────────────────────────
  const Cell = ({ field, colSpan, className, placeholder, readonly: forceReadonly }: {
    field: string;
    colSpan?: number;
    className?: string;
    placeholder?: string;
    readonly?: boolean;
  }) => {
    const value = val(d, field);
    const isReadonly = forceReadonly ?? readonly;
    if (isReadonly) {
      return (
        <td colSpan={colSpan} className={cn(className || emptyValueCls, !value && "text-slate-300 dark:text-slate-600")}>
          {value || (isTemplate ? (placeholder || "") : "")}
        </td>
      );
    }
    return (
      <td colSpan={colSpan} className={cn(className || valueCls)}>
        <input
          type="text"
          value={value}
          onChange={e => onChange?.(field, e.target.value)}
          placeholder={placeholder || ""}
          className={inputCls}
        />
      </td>
    );
  };

  const TextAreaCell = ({ field, colSpan, className, placeholder, rows = 3 }: {
    field: string;
    colSpan?: number;
    className?: string;
    placeholder?: string;
    rows?: number;
  }) => {
    const value = val(d, field);
    if (readonly) {
      return (
        <td colSpan={colSpan} className={cn(className || emptyValueCls, !value && "text-slate-300 dark:text-slate-600", "whitespace-pre-wrap")}>
          {value || (isTemplate ? (placeholder || "") : "")}
        </td>
      );
    }
    return (
      <td colSpan={colSpan} className={cn(className || valueCls)}>
        <textarea
          value={value}
          onChange={e => onChange?.(field, e.target.value)}
          placeholder={placeholder || ""}
          rows={rows}
          className={cn(inputCls, "resize-y")}
        />
      </td>
    );
  };

  const DateOrTextCell = ({ field, colSpan, className, defaultToday, placeholder }: {
    field: string;
    colSpan?: number;
    className?: string;
    defaultToday?: boolean;
    placeholder?: string;
  }) => {
    const rawValue = val(d, field);
    if (readonly) {
      return (
        <td colSpan={colSpan} className={cn(className || emptyValueCls, !rawValue && "text-slate-300 dark:text-slate-600")}>
          {rawValue || (isTemplate ? (placeholder || "DD/MM/YYYY") : "")}
        </td>
      );
    }
    const displayValue = rawValue || (defaultToday ? todayDDMMYYYY() : "");
    return (
      <td colSpan={colSpan} className={cn(className || valueCls)}>
        <input
          type="text"
          value={displayValue}
          onChange={e => onChange?.(field, e.target.value)}
          placeholder={placeholder || "DD/MM/YYYY"}
          className={inputCls}
        />
      </td>
    );
  };

  const LabelCell = ({ text, colSpan, className }: { text: string; colSpan?: number; className?: string }) => (
    <td colSpan={colSpan} className={cn(labelCls, className)}>{text}</td>
  );

  const serialValue = val(d, "serial") || val(d, "formCode") || "";

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse">
        <colgroup>
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[9%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[9%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[9%]" />
          <col className="w-[9%]" />
          <col className="w-[8%]" />
        </colgroup>
        <tbody>
          {/* ── Row 0: Title + Serial ─────────────────────── */}
          <tr>
            <td colSpan={11} className={cn(titleCls, "text-center text-lg")}>
              Customer Complaint Report
            </td>
            <td colSpan={1} className={cn(titleCls, "text-center text-sm whitespace-nowrap")}>
              F/09<br />
              {editMode && !isTemplate ? (
                <input
                  className="w-full text-xs bg-transparent outline-none text-center text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                  value={serialValue}
                  onChange={e => onChange?.("serial", e.target.value)}
                  placeholder="F/09-001"
                />
              ) : (
                `Rev ${serialValue || "No.00"}`
              )}
            </td>
          </tr>

          {/* ── Row 1: Complaint Sr. No. + Date labels ───── */}
          <tr>
            <LabelCell text="Complaint Sr. No." colSpan={7} />
            <LabelCell text="Date" colSpan={5} />
          </tr>
          <tr>
            <Cell field="serial" colSpan={7} placeholder="Auto-generated" />
            <DateOrTextCell field="date" colSpan={5} defaultToday={editMode && !isTemplate} />
          </tr>

          {/* ── Row 2-4: Receipt of Complaint section ────── */}
          {/* ── R2: Receipt of Complaint | Date | Received By ── */}
          <tr>
            <LabelCell text="Receipt of Complaint" colSpan={1} className="text-xs" />
            <LabelCell text="Date" colSpan={3} />
            <DateOrTextCell field="receipt_date" colSpan={3} placeholder="DD/MM/YYYY" />
            <LabelCell text="Received By" colSpan={5} />
          </tr>

          {/* ── R3: Receipt of Complaint (cont) | Time | Received By ── */}
          <tr>
            <LabelCell text="" colSpan={1} className="text-xs" />
            <LabelCell text="Time" colSpan={3} />
            <Cell field="receipt_time" colSpan={3} placeholder="HH:MM" />
            <Cell field="received_by" colSpan={5} placeholder="Name" />
          </tr>

          {/* ── R4: Mode of Receipt | Received By (cont) ── */}
          <tr>
            <LabelCell text="Mode of Receipt" colSpan={7} />
            <Cell field="received_by" colSpan={5} placeholder="Name" readonly />
          </tr>

          {/* ── R5: Customer Name ──────────────────────────── */}
          <tr>
            <LabelCell text="Customer Name" colSpan={7} />
            <Cell field="client_name" colSpan={5} placeholder="Customer name" />
          </tr>

          {/* ── R6: Details of Product ───────────────────── */}
          <tr>
            <LabelCell text="Details of Product" colSpan={12} />
          </tr>

          {/* ── R7: Type Of Product ──────────────────────── */}
          <tr>
            <LabelCell text="Type Of Product" colSpan={2} />
            <Cell field="product_type" colSpan={10} placeholder="Product / service type" />
          </tr>

          {/* ── R8: Description Of Complaints ─────────────── */}
          <tr>
            <LabelCell text="Description Of Complaints" colSpan={12} />
          </tr>
          <tr>
            <Cell field="description" colSpan={12} placeholder="Describe the complaint in detail..." />
          </tr>

          {/* ── R9-10: Nature Of Complaints ──────────────── */}
          <tr>
            <LabelCell text="Nature Of Complaints" colSpan={3} />
            <td colSpan={3} className={cn(headerCls, "text-center")}>SERIOUS</td>
            <td colSpan={3} className={cn(headerCls, "text-center")}>MAJOR</td>
            <td colSpan={3} className={cn(headerCls, "text-center")}>MINOR</td>
          </tr>
          <tr>
            <td colSpan={3} className={emptyValueCls}>
              {editMode && !isTemplate ? (
                <label className="flex items-center gap-2 px-2">
                  <input type="radio" name="complaint_nature_f09" value="SERIOUS"
                    checked={natureChecks.serious}
                    onChange={() => {
                      setNatureChecks({ serious: true, major: false, minor: false });
                      onChange?.("complaint_nature", "SERIOUS");
                    }}
                    className="accent-indigo-500" />
                </label>
              ) : (val(d, "complaint_nature") === "SERIOUS" ? "✓" : "")}
            </td>
            <td colSpan={3} className={emptyValueCls}>
              {editMode && !isTemplate ? (
                <label className="flex items-center gap-2 px-2">
                  <input type="radio" name="complaint_nature_f09" value="MAJOR"
                    checked={natureChecks.major}
                    onChange={() => {
                      setNatureChecks({ serious: false, major: true, minor: false });
                      onChange?.("complaint_nature", "MAJOR");
                    }}
                    className="accent-indigo-500" />
                </label>
              ) : (val(d, "complaint_nature") === "MAJOR" ? "✓" : "")}
            </td>
            <td colSpan={3} className={emptyValueCls}>
              {editMode && !isTemplate ? (
                <label className="flex items-center gap-2 px-2">
                  <input type="radio" name="complaint_nature_f09" value="MINOR"
                    checked={natureChecks.minor}
                    onChange={() => {
                      setNatureChecks({ serious: false, major: false, minor: true });
                      onChange?.("complaint_nature", "MINOR");
                    }}
                    className="accent-indigo-500" />
                </label>
              ) : (val(d, "complaint_nature") === "MINOR" ? "✓" : "")}
            </td>
          </tr>

          {/* ── R11: Corrective Action Taken ──────────────── */}
          <tr>
            <LabelCell text="Corrective Action Taken" colSpan={12} />
          </tr>
          <tr>
            <TextAreaCell field="corrective_action" colSpan={12} placeholder="Describe corrective actions taken..." />
          </tr>

          {/* ── R12-14: Result / Actions / Customer Informed ── */}
          <tr>
            <LabelCell text="Result Of Action Taken" colSpan={5} />
            <LabelCell text="Actions Proposed For Future" colSpan={7} />
          </tr>
          <tr>
            <TextAreaCell field="result_of_action" colSpan={5} rows={3} />
            <TextAreaCell field="actions_proposed" colSpan={7} rows={3} />
          </tr>

          <tr>
            <LabelCell text="" colSpan={5} />
            <LabelCell text="Customer Informed Vide" colSpan={3} />
            <LabelCell text="" colSpan={2} />
            <LabelCell text="" colSpan={2} />
          </tr>
          <tr>
            <Cell field="result_reference" colSpan={5} placeholder="Reference" readonly />
            <LabelCell text="Customer Informed" colSpan={3} />
            <LabelCell text="Date" colSpan={2} />
            <DateOrTextCell field="customer_informed_date" colSpan={2} placeholder="DD/MM/YYYY" />
          </tr>

          {/* ── R15: Analysed By / Closed By ──────────────── */}
          <tr>
            <LabelCell text="Analysed By:" colSpan={5} />
            <LabelCell text="Closed By — Authorised Person" colSpan={7} />
          </tr>
          <tr>
            <Cell field="analysed_by" colSpan={5} placeholder="Name & Signature" />
            <Cell field="closed_by" colSpan={7} placeholder="Name & Signature" />
          </tr>

          {/* ── VEZLOO footer ────────────────────────────── */}
          <tr>
            <td colSpan={12} className="text-center text-xs font-bold text-slate-400 dark:text-slate-500 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900">
              VEZLOO
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}