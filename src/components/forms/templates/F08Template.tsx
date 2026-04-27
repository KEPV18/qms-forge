// ============================================================================
// F/08 — Order Form / Order Confirmation
// Pixel-perfect replica of the Word DOCX template layout.
// Supports three modes:
//   isTemplate=true           → read-only placeholder view (Template tab)
//   isTemplate=false, editMode=false → filled record view (Record page)
//   isTemplate=false, editMode=true   → editable form (Create/Edit page)
// ============================================================================

import React, { useCallback } from "react";
import { cn } from "@/lib/utils";

export interface F08Props {
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

/* 14-column grid matching DOCX proportions ──────────────────────────── */

export function F08Template({ data, isTemplate = true, editMode = false, onChange, className }: F08Props) {
  const d = data ?? {};
  const readonly = isTemplate || !editMode;

  // Styling presets
  const labelCls = "bg-slate-100 dark:bg-slate-800 font-semibold text-sm px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300";
  const valueCls = "px-2 py-2 border border-slate-300 dark:border-slate-600 text-sm text-slate-900 dark:text-slate-100 min-h-[2.25rem]";
  const emptyValueCls = cn(valueCls, isTemplate ? "text-slate-300 dark:text-slate-600" : "");
  const titleCls = "bg-slate-100 dark:bg-slate-800 font-bold text-base px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100";
  const headerCls = "bg-indigo-50 dark:bg-indigo-950 font-semibold text-xs uppercase tracking-wide px-3 py-2 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300";
  const inputCls = "w-full bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600";

  // Editable cell helper
  const Cell = ({ field, colSpan, className, placeholder }: {
    field: string;
    colSpan?: number;
    className?: string;
    placeholder?: string;
  }) => {
    const value = val(d, field);
    if (readonly) {
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

  // Date cell helper (uses date input in editMode)
  const DateCell = ({ field, colSpan, className, placeholder }: {
    field: string;
    colSpan?: number;
    className?: string;
    placeholder?: string;
  }) => {
    const value = val(d, field);
    if (readonly) {
      return (
        <td colSpan={colSpan} className={cn(className || emptyValueCls, !value && "text-slate-300 dark:text-slate-600")}>
          {value || (isTemplate ? (placeholder || "DD/MM/YYYY") : "")}
        </td>
      );
    }
    return (
      <td colSpan={colSpan} className={cn(className || valueCls)}>
        <input
          type="date"
          value={value}
          onChange={e => onChange?.(field, e.target.value)}
          className="w-full bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100"
        />
      </td>
    );
  };

  // Label-only cell (never editable)
  const LabelCell = ({ text, colSpan, className }: { text: string; colSpan: number; className?: string }) => (
    <td colSpan={colSpan} className={className || labelCls}>{text}</td>
  );

  // Product rows
  const productRows = isTemplate
    ? Array.from({ length: 6 }, (_, i) => ({ sr: String(i + 1), product_name: "", specifications: "", qty: "" }))
    : (() => {
        const items = (d.items as Array<Record<string, unknown>> | undefined) ?? [];
        if (items.length === 0) return Array.from({ length: 6 }, (_, i) => ({ sr: String(i + 1), product_name: "", specifications: "", qty: "" }));
        while (items.length < 6) items.push({ sr: String(items.length + 1), product_name: "", specifications: "", qty: "" });
        return items.map((item, i) => ({
          sr: String(i + 1),
          product_name: val(item as Record<string, unknown>, "product_name"),
          specifications: val(item as Record<string, unknown>, "specifications"),
          qty: val(item as Record<string, unknown>, "qty"),
        }));
      })();

  return (
    <div className={cn("max-w-4xl mx-auto font-[Arial,Helvetica,sans-serif]", className)}>
      {/* ── VEZLOO Company Header ───────────────────────────── */}
      <div className="text-center py-3">
        <span className="text-2xl font-bold tracking-widest text-slate-800 dark:text-slate-200">VEZLOO</span>
      </div>

      {/* ── Main Form Table ─────────────────────────────────── */}
      <div className="border border-slate-300 dark:border-slate-600 rounded-sm overflow-hidden">
        <table className="w-full border-collapse">
          <colgroup>
            <col className="w-[5%]" />
            <col className="w-[9%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
            <col className="w-[5%]" />
            <col className="w-[5%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
          </colgroup>
          <tbody>
            {/* ── Row 0: Title + F/08 ─────────────────────── */}
            <tr>
              <td colSpan={13} className={cn(titleCls, "text-center text-lg")}>
                Order Form / Order Confirmation
              </td>
              <td colSpan={1} className={cn(titleCls, "text-center text-sm whitespace-nowrap")}>
                F/08<br />Rev No.00
              </td>
            </tr>

            {/* ── Row 1: Sr. No. + Date labels ───────────── */}
            <tr>
              <LabelCell text="Sr. No." colSpan={8} />
              <LabelCell text="Date" colSpan={6} />
            </tr>
            <tr>
              <Cell field="serial" colSpan={8} placeholder="Auto-generated" />
              <DateCell field="date" colSpan={6} />
            </tr>

            {/* ── Row 2: Customer ──────────────────────────── */}
            <tr>
              <LabelCell text="Customer" colSpan={2} />
              <td colSpan={1} className={cn(labelCls, "text-center")}>:</td>
              <Cell field="client_name" colSpan={11} placeholder="Customer name" />
            </tr>

            {/* ── Row 3: Mode Of Receipt ────────────────────── */}
            <tr>
              <LabelCell text="Mode Of Receipt" colSpan={2} />
              <td colSpan={1} className={cn(labelCls, "text-center")}>:</td>
              <Cell field="mode_of_receipt" colSpan={11} placeholder="Email / Phone / Walk-in" />
            </tr>

            {/* ── Row 4: Product table header ───────────────── */}
            <tr>
              <td colSpan={1} className={headerCls}>Sr. No.</td>
              <td colSpan={3} className={headerCls}>Product Name</td>
              <td colSpan={7} className={headerCls}>Specifications</td>
              <td colSpan={3} className={headerCls}>Qty.</td>
            </tr>

            {/* ── Rows 5–10: Product data rows ──────────────── */}
            {productRows.map((row, i) => (
              <tr key={i}>
                <td colSpan={1} className={cn(valueCls, "text-center")}>{row.sr}</td>
                {editMode && !isTemplate ? (
                  <>
                    <td colSpan={3} className={valueCls}>
                      <input className={inputCls} value={row.product_name} placeholder="Product name"
                        onChange={e => {
                          const items = [...((d.items as Array<Record<string, unknown>>) || Array.from({ length: 6 }, () => ({})))];
                          while (items.length < 6) items.push({});
                          items[i] = { ...items[i], product_name: e.target.value, sr: String(i + 1) };
                          onChange?.("items", JSON.stringify(items));
                        }} />
                    </td>
                    <td colSpan={7} className={valueCls}>
                      <input className={inputCls} value={row.specifications} placeholder="Specifications"
                        onChange={e => {
                          const items = [...((d.items as Array<Record<string, unknown>>) || Array.from({ length: 6 }, () => ({})))];
                          while (items.length < 6) items.push({});
                          items[i] = { ...items[i], specifications: e.target.value, sr: String(i + 1) };
                          onChange?.("items", JSON.stringify(items));
                        }} />
                    </td>
                    <td colSpan={3} className={valueCls}>
                      <input className={inputCls} value={row.qty} placeholder="Qty"
                        onChange={e => {
                          const items = [...((d.items as Array<Record<string, unknown>>) || Array.from({ length: 6 }, () => ({})))];
                          while (items.length < 6) items.push({});
                          items[i] = { ...items[i], qty: e.target.value, sr: String(i + 1) };
                          onChange?.("items", JSON.stringify(items));
                        }} />
                    </td>
                  </>
                ) : (
                  <>
                    <td colSpan={3} className={cn(emptyValueCls)}>{row.product_name}</td>
                    <td colSpan={7} className={cn(emptyValueCls)}>{row.specifications}</td>
                    <td colSpan={3} className={cn(emptyValueCls)}>{row.qty}</td>
                  </>
                )}
              </tr>
            ))}

            {/* ── Row 10: Requirement Of Test Certificate ──── */}
            <tr>
              <LabelCell text="Requirement Of Test Certificate" colSpan={5} />
              <td colSpan={2} className={cn(labelCls, "text-center")}>:</td>
              {editMode && !isTemplate ? (
                <td colSpan={7} className={valueCls}>
                  <select className="w-full bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100"
                    value={val(d, "test_certificate_required")}
                    onChange={e => onChange?.("test_certificate_required", e.target.value)}>
                    <option value="">— Select —</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </td>
              ) : (
                <td colSpan={7} className={cn(emptyValueCls)}>
                  {val(d, "test_certificate_required") || (isTemplate ? "Yes / No" : "")}
                </td>
              )}
            </tr>

            {/* ── Row 11: Delivery Schedule ──────────────────── */}
            <tr>
              <LabelCell text="Delivery Schedule" colSpan={5} />
              <td colSpan={2} className={cn(labelCls, "text-center")}>:</td>
              <Cell field="delivery_schedule" colSpan={7} placeholder="Delivery date or timeline" />
            </tr>

            {/* ── Row 12: Statutory And Regulatory ──────────── */}
            <tr>
              <LabelCell text="Statutory And Regulatory Requirements, If Any" colSpan={5} />
              <td colSpan={2} className={cn(labelCls, "text-center")}>:</td>
              {editMode && !isTemplate ? (
                <td colSpan={7} className={valueCls}>
                  <select className="w-full bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100"
                    value={val(d, "complies")}
                    onChange={e => onChange?.("complies", e.target.value)}>
                    <option value="">— Select —</option>
                    <option value="Complies">Complies</option>
                    <option value="Does Not Comply">Does Not Comply</option>
                  </select>
                </td>
              ) : (
                <td colSpan={7} className={cn(emptyValueCls)}>
                  {val(d, "complies") || (isTemplate ? "Complies / Does Not Complies" : "")}
                </td>
              )}
            </tr>

            {/* ── Row 13: Order decision ──────────────────────── */}
            <tr>
              <LabelCell text="Order" colSpan={5} />
              <td colSpan={2} className={cn(labelCls, "text-center")}>:</td>
              {editMode && !isTemplate ? (
                <td colSpan={7} className={valueCls}>
                  <select className="w-full bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100"
                    value={val(d, "order_status")}
                    onChange={e => onChange?.("order_status", e.target.value)}>
                    <option value="">— Select —</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </td>
              ) : (
                <td colSpan={7} className={cn(emptyValueCls)}>
                  {val(d, "order_status") || (isTemplate ? "–  Accepted  –  Rejected" : "")}
                </td>
              )}
            </tr>

            {/* ── Row 14: Remarks + Reviewed By ───────────────── */}
            <tr>
              <LabelCell text="Remarks" colSpan={8} />
              <LabelCell text="Reviewed By / Authorised Person" colSpan={6} />
            </tr>
            <tr>
              {editMode && !isTemplate ? (
                <td colSpan={8} className={cn(valueCls, "min-h-[3rem]")}>
                  <textarea className="w-full bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100 resize-none"
                    value={val(d, "remarks")} placeholder="Remarks"
                    rows={2} onChange={e => onChange?.("remarks", e.target.value)} />
                </td>
              ) : (
                <td colSpan={8} className={cn(emptyValueCls, "min-h-[3rem]")}>
                  {val(d, "remarks")}
                </td>
              )}
              <Cell field="reviewed_by" colSpan={6} placeholder="Authorised person name" />
            </tr>

            {/* ── Row 15: Bill No. ────────────────────────────── */}
            <tr>
              <LabelCell text="Bill No." colSpan={2} />
              <td colSpan={1} className={cn(labelCls, "text-center")}>:</td>
              <Cell field="bill_no" colSpan={3} placeholder="Bill number" />
              <td colSpan={2} className={emptyValueCls} />
              <td colSpan={3} className={emptyValueCls} />
              <td colSpan={3} className={emptyValueCls} />
            </tr>

            {/* ── Row 16: Despatch Date ──────────────────────── */}
            <tr>
              <LabelCell text="Despatch Date" colSpan={2} />
              <td colSpan={1} className={cn(labelCls, "text-center")}>:</td>
              <DateCell field="despatch_date" colSpan={3} placeholder="DD/MM/YYYY" />
              <td colSpan={2} className={emptyValueCls} />
              <td colSpan={3} className={emptyValueCls} />
              <td colSpan={3} className={emptyValueCls} />
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Footer ────────────────────────────────────────────── */}
      {!isTemplate && (
        <div className="text-center text-xs text-slate-400 mt-4">
          QMS Forge · {val(d, "serial")}
        </div>
      )}
    </div>
  );
}

export default F08Template;