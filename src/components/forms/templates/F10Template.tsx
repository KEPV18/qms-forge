// ============================================================================
// F/10 — Customer Feedback Form
// Pixel-perfect replica of the Word DOCX template layout.
// Supports three modes:
//   isTemplate=true           → read-only placeholder view (Template tab)
//   isTemplate=false, editMode=false → filled record view (Record page)
//   isTemplate=false, editMode=true   → editable form (Create/Edit page)
//
// Layout: 10-column grid matching DOCX proportions.
// Includes a self-rating table (Product Quality, Order Processing, etc.)
// with checkbox-style rating columns.
// ============================================================================

import React, { useState } from "react";
import { cn } from "@/lib/utils";

export interface F10Props {
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

const RATING_FIELDS = [
  { key: "rating_product_quality", label: "Product Quality" },
  { key: "rating_order_processing", label: "Order Processing" },
  { key: "rating_complaint_handling", label: "Complaint Handling" },
  { key: "rating_delivery", label: "Delivery" },
  { key: "rating_price", label: "Price" },
] as const;

const RATING_OPTIONS = ["Excellent", "Good", "Satisfactory", "Average", "Poor"] as const;

export function F10Template({ data, isTemplate = true, editMode = false, onChange, className }: F10Props) {
  const d = data ?? {};
  const readonly = isTemplate || !editMode;

  // Track selected ratings in edit mode
  const [ratings, setRatings] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const f of RATING_FIELDS) {
      initial[f.key] = val(d, f.key);
    }
    return initial;
  });

  // ── Styling presets ─────────────────────────────────────────────────
  const labelCls = "bg-slate-100 dark:bg-slate-800 font-semibold text-sm px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300";
  const valueCls = "px-2 py-2 border border-slate-300 dark:border-slate-600 text-sm text-slate-900 dark:text-slate-100 min-h-[2.25rem]";
  const emptyValueCls = cn(valueCls, isTemplate ? "text-slate-300 dark:text-slate-600" : "");
  const titleCls = "bg-slate-100 dark:bg-slate-800 font-bold text-base px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100";
  const headerCls = "bg-indigo-50 dark:bg-indigo-950 font-semibold text-xs uppercase tracking-wide px-2 py-2 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300";
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
          <col className="w-[12%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[16%]" />
          <col className="w-[14%]" />
          <col className="w-[14%]" />
          <col className="w-[8%]" />
          <col className="w-[6%]" />
          <col className="w-[6%]" />
          <col className="w-[8%]" />
        </colgroup>
        <tbody>
          {/* ── Row 0: Title + Serial ─────────────────────── */}
          <tr>
            <td colSpan={8} className={cn(titleCls, "text-center text-lg")}>
              Customers Feedback Form
            </td>
            <td colSpan={2} className={cn(titleCls, "text-center text-sm whitespace-nowrap")}>
              F/10<br />
              {editMode && !isTemplate ? (
                <input
                  className="w-full text-xs bg-transparent outline-none text-center text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                  value={serialValue}
                  onChange={e => onChange?.("serial", e.target.value)}
                  placeholder="F/10-001"
                />
              ) : (
                `No. ${serialValue || "00"}`
              )}
            </td>
          </tr>

          {/* ── Row 1: Date + Year ────────────────────────── */}
          <tr>
            <LabelCell text="Date" colSpan={3} />
            <DateOrTextCell field="date" colSpan={3} defaultToday={editMode && !isTemplate} />
            <LabelCell text="Year" colSpan={1} />
            <Cell field="year" colSpan={3} placeholder={new Date().getFullYear().toString()} />
          </tr>

          {/* ── Row 2: Name ──────────────────────────────── */}
          <tr>
            <LabelCell text="Name" colSpan={3} />
            <Cell field="client_name" colSpan={7} placeholder="Customer name" />
          </tr>

          {/* ── Row 3: Address ────────────────────────────── */}
          <tr>
            <LabelCell text="Address" colSpan={3} />
            <Cell field="address" colSpan={7} placeholder="Customer address" />
          </tr>

          {/* ── Row 4: Self Rating (header, spans full width) */}
          <tr>
            <LabelCell text="Self Rating" colSpan={10} className="text-center" />
          </tr>

          {/* ── Row 5: Comment + rating column headers ──── */}
          <tr>
            <LabelCell text="Comment" colSpan={3} />
            <td colSpan={1} className={cn(headerCls, "text-center")}>Excellent</td>
            <td colSpan={1} className={cn(headerCls, "text-center")}>Good</td>
            <td colSpan={1} className={cn(headerCls, "text-center")}>Satisfactory</td>
            <td colSpan={1} className={cn(headerCls, "text-center")}>Average</td>
            <td colSpan={1} className={cn(headerCls, "text-center")}>Poor</td>
            {/* col 8+9+10 are the value cells */}
          </tr>

          {/* ── Rows 6-10: Rating rows ────────────────────── */}
          {RATING_FIELDS.map(({ key, label }) => (
            <tr key={key}>
              <LabelCell text={label} colSpan={3} />
              {RATING_OPTIONS.map((option) => {
                const isSelected = val(d, key) === option || ratings[key] === option;
                return (
                  <td key={option} colSpan={1} className={cn(emptyValueCls, "text-center")}>
                    {editMode && !isTemplate ? (
                      <input
                        type="radio"
                        name={key}
                        value={option}
                        checked={ratings[key] === option}
                        onChange={() => {
                          setRatings(prev => ({ ...prev, [key]: option }));
                          onChange?.(key, option);
                        }}
                        className="accent-indigo-500"
                      />
                    ) : (
                      isSelected ? "✓" : ""
                    )}
                  </td>
                );
              })}
              {/* Extra 2 columns for visual balance matching DOCX */}
              <td colSpan={3} className={emptyValueCls}></td>
            </tr>
          ))}

          {/* ── Row 11: Any other suggestions ─────────────── */}
          <tr>
            <LabelCell text="Any other suggestions for improvement" colSpan={10} />
          </tr>
          <tr>
            <TextAreaCell field="suggestions" colSpan={10} placeholder="Write your suggestions here..." rows={3} />
          </tr>

          {/* ── Row 12: Disclaimer ────────────────────────── */}
          <tr>
            <td colSpan={10} className="text-xs text-slate-500 dark:text-slate-400 px-2 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 italic">
              Please note that this is just for improving ourselves, your feedback is valuable to us.
            </td>
          </tr>

          {/* ── Row 13: Signature row ────────────────────── */}
          <tr>
            <LabelCell text="Signature of Distributors with rubber stamp" colSpan={5} />
            <LabelCell text="Reviewed by — Sales Person / Authorised person" colSpan={5} />
          </tr>
          <tr>
            <Cell field="distributor_signature" colSpan={5} placeholder="Signature" readonly />
            <Cell field="reviewed_by" colSpan={5} placeholder="Name & Signature" readonly />
          </tr>

          {/* ── Row 14: For Office Use Only header ────────── */}
          <tr>
            <td colSpan={10} className={cn(headerCls, "text-center")}>For Office Use Only</td>
          </tr>

          {/* ── Row 15-17: Office use fields ──────────────── */}
          <tr>
            <LabelCell text="Action proposed for future" colSpan={5} />
            <Cell field="action_proposed" colSpan={5} placeholder="" />
          </tr>
          <tr>
            <LabelCell text="Corrective action reference" colSpan={5} />
            <Cell field="corrective_action_ref" colSpan={5} placeholder="" />
          </tr>
          <tr>
            <LabelCell text="Remarks" colSpan={5} />
            <Cell field="remarks" colSpan={5} placeholder="" />
          </tr>

          {/* ── VEZLOO footer ────────────────────────────── */}
          <tr>
            <td colSpan={10} className="text-center text-xs font-bold text-slate-400 dark:text-slate-500 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900">
              VEZLOO
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}