// ============================================================================
// F/08 — Order Form / Order Confirmation
// Pixel-perfect replica of the Word DOCX template layout.
// Used for both Template preview (empty) and Record view (filled).
// ============================================================================

import React from "react";
import { cn } from "@/lib/utils";

interface F08Props {
  /** formData — empty {} for template view, populated for record view */
  data?: Record<string, unknown>;
  /** true = template (labels shown, no data); false = record (data filled in) */
  isTemplate?: boolean;
  className?: string;
}

// Helper to safely read form data
function val(data: Record<string, unknown> | undefined, key: string): string {
  if (!data) return "";
  const v = data[key];
  if (v == null) return "";
  if (typeof v === "string") return v;
  return String(v);
}

/* ─── Layout constants (matching DOCX proportions) ──────────────────────
   Table total = 9990 DXA → mapped to 14 grid columns.
   Row 0:  [13col title] [1col F/08]
   Row 1:  [8col SrNo] [6col Date]
   Row 2:  [2col Customer] [1col :] [11col value]
   Row 3:  [2col Mode]    [1col :] [11col value]
   Row 4:  [1col SrNo] [3col ProductName] [7col Specs] [3col Qty]
   Row 5-9: same 4 col (data rows)
   Row 10: [5col ReqTestCert] [2col :] [7col Yes/No]
   Row 11: [5col Delivery]    [2col :] [7col value]
   Row 12: [5col Statutory]   [2col :] [7col Complies/Not]
   Row 13: [5col Order]       [2col :] [7col Accepted/Rejected]
   Row 14: [8col Remarks] [6col Reviewed By / Authorised]
   Row 15: [2col BillNo] [1col :] [3col val] [3col val] [1col] [2col] [2col]
   Row 16: [2col Despatch] [1col :] [3col] [3col] [1col] [2col] [2col]
───────────────────────────────────────────────────────────────────────── */

const COLS = 14;

export function F08Template({ data, isTemplate = true, className }: F08Props) {
  const d = data ?? {};

  const labelCls = "bg-slate-100 dark:bg-slate-800 font-semibold text-sm px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300";
  const valueCls = "px-3 py-2 border border-slate-300 dark:border-slate-600 text-sm text-slate-900 dark:text-slate-100 min-h-[2.25rem]";
  const emptyValueCls = cn(valueCls, isTemplate ? "text-slate-300 dark:text-slate-600" : "");
  const titleCls = "bg-slate-100 dark:bg-slate-800 font-bold text-base px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100";
  const headerCls = "bg-indigo-50 dark:bg-indigo-950 font-semibold text-xs uppercase tracking-wide px-3 py-2 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300";

  // Product rows — from schema, the table has columns: sr, product_name, specifications, qty
  const productRows = isTemplate
    ? Array.from({ length: 6 }, (_, i) => ({ sr: String(i + 1), product_name: "", specifications: "", qty: "" }))
    : (() => {
        const items = (d.items as Array<Record<string, unknown>> | undefined) ?? [];
        if (items.length === 0) return Array.from({ length: 6 }, (_, i) => ({ sr: String(i + 1), product_name: "", specifications: "", qty: "" }));
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
            {/* 14 columns following DOCX grid */}
            <col className="w-[5%]" />   {/* 1  */}
            <col className="w-[9%]" />   {/* 2  */}
            <col className="w-[7%]" />   {/* 3  */}
            <col className="w-[7%]" />   {/* 4  */}
            <col className="w-[7%]" />   {/* 5  */}
            <col className="w-[7%]" />   {/* 6  */}
            <col className="w-[7%]" />   {/* 7  */}
            <col className="w-[7%]" />   {/* 8  */}
            <col className="w-[7%]" />   {/* 9  */}
            <col className="w-[7%]" />   {/* 10 */}
            <col className="w-[5%]" />   {/* 11 */}
            <col className="w-[5%]" />   {/* 12 */}
            <col className="w-[10%]" />  {/* 13 */}
            <col className="w-[10%]" />  {/* 14 */}
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

            {/* ── Row 1: Sr. No. + Date ────────────────────── */}
            <tr>
              <td colSpan={8} className={labelCls}>
                Sr. No.
              </td>
              <td colSpan={6} className={labelCls}>
                Date
              </td>
            </tr>
            <tr>
              <td colSpan={8} className={emptyValueCls}>
                {isTemplate ? "________" : val(d, "serial")}
              </td>
              <td colSpan={6} className={emptyValueCls}>
                {isTemplate ? "DD/MM/YYYY" : val(d, "date")}
              </td>
            </tr>

            {/* ── Row 2: Customer ──────────────────────────── */}
            <tr>
              <td colSpan={2} className={labelCls}>Customer</td>
              <td colSpan={1} className={cn(labelCls, "text-center")}>:</td>
              <td colSpan={11} className={emptyValueCls}>
                {isTemplate ? "" : val(d, "client_name") || val(d, "customer")}
              </td>
            </tr>

            {/* ── Row 3: Mode Of Receipt ────────────────────── */}
            <tr>
              <td colSpan={2} className={labelCls}>Mode Of Receipt</td>
              <td colSpan={1} className={cn(labelCls, "text-center")}>:</td>
              <td colSpan={11} className={emptyValueCls}>
                {isTemplate ? "" : val(d, "mode_of_receipt")}
              </td>
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
                <td colSpan={1} className={valueCls + " text-center"}>
                  {isTemplate ? row.sr : row.sr}
                </td>
                <td colSpan={3} className={emptyValueCls}>
                  {isTemplate ? "" : row.product_name}
                </td>
                <td colSpan={7} className={emptyValueCls}>
                  {isTemplate ? "" : row.specifications}
                </td>
                <td colSpan={3} className={emptyValueCls}>
                  {isTemplate ? "" : row.qty}
                </td>
              </tr>
            ))}

            {/* ── Row 10: Requirement Of Test Certificate ──── */}
            <tr>
              <td colSpan={5} className={labelCls}>Requirement Of Test Certificate</td>
              <td colSpan={2} className={cn(labelCls, "text-center")}>:</td>
              <td colSpan={7} className={emptyValueCls}>
                {isTemplate ? "Yes / No" : val(d, "test_certificate_required") || val(d, "requirement_of_test_certificate")}
              </td>
            </tr>

            {/* ── Row 11: Delivery Schedule ──────────────────── */}
            <tr>
              <td colSpan={5} className={labelCls}>Delivery Schedule</td>
              <td colSpan={2} className={cn(labelCls, "text-center")}>:</td>
              <td colSpan={7} className={emptyValueCls}>
                {isTemplate ? "" : val(d, "delivery_schedule")}
              </td>
            </tr>

            {/* ── Row 12: Statutory And Regulatory ──────────── */}
            <tr>
              <td colSpan={5} className={labelCls}>
                Statutory And Regulatory Requirements, If Any
              </td>
              <td colSpan={2} className={cn(labelCls, "text-center")}>:</td>
              <td colSpan={7} className={emptyValueCls}>
                {isTemplate ? "Complies / Does Not Complies" : val(d, "statutory_requirements") || val(d, "complies")}
              </td>
            </tr>

            {/* ── Row 13: Order decision ──────────────────────── */}
            <tr>
              <td colSpan={5} className={labelCls}>Order</td>
              <td colSpan={2} className={cn(labelCls, "text-center")}>:</td>
              <td colSpan={7} className={emptyValueCls}>
                {isTemplate ? "–  Accepted  –  Rejected" : val(d, "order_decision") || val(d, "order_status")}
              </td>
            </tr>

            {/* ── Row 14: Remarks + Reviewed By ───────────────── */}
            <tr>
              <td colSpan={8} className={labelCls}>Remarks</td>
              <td colSpan={6} className={cn(labelCls, "text-center")}>
                Reviewed By / Authorised Person
              </td>
            </tr>
            <tr>
              <td colSpan={8} rowSpan={1} className={cn(emptyValueCls, "min-h-[3rem]")}>
                {isTemplate ? "" : val(d, "remarks")}
              </td>
              <td colSpan={6} className={emptyValueCls}>
                {isTemplate ? "" : val(d, "reviewed_by") || val(d, "authorised_person")}
              </td>
            </tr>

            {/* ── Row 15: Bill No. ────────────────────────────── */}
            <tr>
              <td colSpan={2} className={labelCls}>Bill No.</td>
              <td colSpan={1} className={cn(labelCls, "text-center")}>:</td>
              <td colSpan={3} className={emptyValueCls}>
                {isTemplate ? "" : val(d, "bill_no")}
              </td>
              <td colSpan={2} className={emptyValueCls} />
              <td colSpan={3} className={emptyValueCls} />
              <td colSpan={3} className={emptyValueCls} />
            </tr>

            {/* ── Row 16: Despatch Date ──────────────────────── */}
            <tr>
              <td colSpan={2} className={labelCls}>Despatch Date</td>
              <td colSpan={1} className={cn(labelCls, "text-center")}>:</td>
              <td colSpan={3} className={emptyValueCls}>
                {isTemplate ? "" : val(d, "despatch_date")}
              </td>
              <td colSpan={2} className={emptyValueCls} />
              <td colSpan={3} className={emptyValueCls} />
              <td colSpan={3} className={emptyValueCls} />
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Footer hint ────────────────────────────────────── */}
      {!isTemplate && (
        <div className="text-center text-xs text-slate-400 mt-4">
          QMS Forge · {val(d, "serial")}
        </div>
      )}
    </div>
  );
}

export default F08Template;