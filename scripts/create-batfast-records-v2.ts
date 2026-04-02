import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType,
  PageOrientation, PageNumber, Header, Footer, Tab, TabStopPosition, TabStopType
} from "docx";
import * as fs from "fs";

const FONT = "Arial Narrow";
const TITLE_SIZE = 36;
const SUBTITLE_SIZE = 24;
const LABEL_SIZE = 20;
const VALUE_SIZE = 20;
const HEADER_SIZE = 18;

// ─── Helpers ─────────────────────────────────────────
function centeredTitle(text, size = TITLE_SIZE) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, font: FONT, size, bold: true, allCaps: true })],
  });
}

function centeredSubtitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text, font: FONT, size: SUBTITLE_SIZE, bold: true })],
  });
}

function formHeader(code, revNo, srNo, date) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          cell(`Form Code: ${code}`, 25, true),
          cell(`Rev No.: ${revNo}`, 25, true),
          cell(`Sr. No.: ${srNo}`, 25, true),
          cell(`Date: ${date}`, 25, true),
        ],
      }),
    ],
  });
}

function blankLine() {
  return new Paragraph({ spacing: { after: 100 }, children: [] });
}

function sectionTitle(text) {
  return new Paragraph({
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text, font: FONT, size: 24, bold: true, underline: {} })],
  });
}

function labelValueRow(label, value) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: "F2F2F2" },
            children: [new Paragraph({ children: [new TextRun({ text: label, font: FONT, size: LABEL_SIZE, bold: true })] })],
            borders: borderStyle(),
          }),
          new TableCell({
            width: { size: 60, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: value, font: FONT, size: VALUE_SIZE })] })],
            borders: borderStyle(),
          }),
        ],
      }),
    ],
  });
}

function multiRowTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([label, value]) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: "F2F2F2" },
            children: [new Paragraph({ children: [new TextRun({ text: label, font: FONT, size: LABEL_SIZE, bold: true })] })],
            borders: borderStyle(),
          }),
          new TableCell({
            width: { size: 60, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: value, font: FONT, size: VALUE_SIZE })] })],
            borders: borderStyle(),
          }),
        ],
      })
    ),
  });
}

function borderStyle() {
  return {
    top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  };
}

function cell(text, widthPct, bold = false) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    children: [new Paragraph({ children: [new TextRun({ text, font: FONT, size: LABEL_SIZE, bold })] })],
    borders: borderStyle(),
  });
}

function approvalRow(role, name) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: "F2F2F2" },
            children: [new Paragraph({ children: [new TextRun({ text: role, font: FONT, size: LABEL_SIZE, bold: true })] })],
            borders: borderStyle(),
          }),
          new TableCell({
            width: { size: 60, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: name, font: FONT, size: VALUE_SIZE })] })],
            borders: borderStyle(),
          }),
        ],
      }),
    ],
  });
}

async function createDoc(title, filename, content) {
  const doc = new Document({
    sections: [{
      properties: {
        page: { margin: { top: 720, bottom: 720, left: 1080, right: 1080 } },
      },
      children: content,
    }],
  });
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(`/tmp/batfast-records/${filename}`, buffer);
  console.log(`✅ ${filename}`);
}

fs.mkdirSync("/tmp/batfast-records", { recursive: true });

// ═══════════════════════════════════════════════════════════
// F/08-002: ORDER FORM / ORDER CONFIRMATION
// ═══════════════════════════════════════════════════════════
async function createF08() {
  await createDoc("Order Form", "F-08-002 - BatFast Order Form.docx", [
    centeredTitle("VEZLOO"),
    centeredSubtitle("Order Form / Order Confirmation"),
    formHeader("F/08", "02", "F/08-002", "March 2026"),
    blankLine(),
    sectionTitle("Customer Information"),
    multiRowTable([
      ["Customer Name", "BatFast"],
      ["Project Name", "BatFast - AI Data Annotation"],
      ["Project Type", "Annotation"],
      ["Mode of Receipt", "Email / Online"],
    ]),
    blankLine(),
    sectionTitle("Order Details"),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [cell("Sr.", 8, true), cell("Product Name", 25, true), cell("Specifications", 35, true), cell("Qty.", 15, true), cell("Remarks", 17, true)],
        }),
        new TableRow({
          children: [cell("1", 8), cell("AI Data Annotation", 25), cell("Image annotation per client guidelines", 35), cell("6,000", 15), cell("Completed", 17)],
        }),
      ],
    }),
    blankLine(),
    sectionTitle("Delivery & Compliance"),
    multiRowTable([
      ["Delivery Schedule", "20 days from project start"],
      ["Test Certificate Required", "No"],
      ["Statutory & Regulatory Requirements", "Complies - Data confidentiality per client requirements"],
      ["Order Status", "Accepted ✅"],
    ]),
    blankLine(),
    sectionTitle("Approval"),
    approvalRow("Reviewed By", "Andrew Maged (Operations Manager / QA Leader)"),
    blankLine(),
    approvalRow("Authorised By", "Kareem Yehia (CEO)"),
  ]);
}

// ═══════════════════════════════════════════════════════════
// F/11-003: PRODUCTION PLAN
// ═══════════════════════════════════════════════════════════
async function createF11() {
  await createDoc("Production Plan", "F-11-003 - BatFast Production Plan.docx", [
    centeredTitle("VEZLOO"),
    centeredSubtitle("Production Plan"),
    formHeader("F/11", "02", "F/11-003", "March 2026"),
    blankLine(),
    sectionTitle("Project Information"),
    multiRowTable([
      ["Project Name", "BatFast"],
      ["Project Type", "AI Data Annotation - Image Annotation"],
      ["Client", "BatFast"],
      ["Start Date", "March 2026"],
      ["Deadline", "20 days from start"],
    ]),
    blankLine(),
    sectionTitle("Production Requirements"),
    multiRowTable([
      ["Total Tasks", "6,000 annotated images"],
      ["Daily Target", "300 images/day"],
      ["Team Size", "5 agents"],
      ["Per Agent Daily Target", "60 images/agent/day"],
    ]),
    blankLine(),
    sectionTitle("Resource Allocation"),
    multiRowTable([
      ["Team Leader", "Assigned by Operations Manager"],
      ["Agents", "5 annotation specialists"],
      ["Additional Resources", "No additional resources required"],
      ["Tools/Software", "Annotation platform per client specs"],
    ]),
    blankLine(),
    sectionTitle("Milestones"),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [cell("Milestone", 30, true), cell("Target", 35, true), cell("Status", 35, true)] }),
        new TableRow({ children: [cell("Week 1", 30), cell("1,500 images (25%)", 35), cell("✅ Completed", 35)] }),
        new TableRow({ children: [cell("Week 2", 30), cell("3,000 images (50%)", 35), cell("✅ Completed", 35)] }),
        new TableRow({ children: [cell("Week 3", 30), cell("4,500 images (75%)", 35), cell("✅ Completed", 35)] }),
        new TableRow({ children: [cell("Day 17", 30), cell("6,000 images (100%)", 35), cell("✅ Delivered 3 days early", 35)] }),
      ],
    }),
    blankLine(),
    sectionTitle("Quality Control Points"),
    multiRowTable([
      ["QC Check 1", "After 1,000 images - verify accuracy"],
      ["QC Check 2", "After 3,000 images - mid-project review"],
      ["QC Check 3", "After 5,000 images - pre-delivery check"],
      ["Final QC", "Before delivery - 100% compliance"],
    ]),
    blankLine(),
    sectionTitle("Approval"),
    approvalRow("Prepared By", "Andrew Maged (Operations Manager / QA Leader)"),
    blankLine(),
    approvalRow("Approved By", "Eman El Serafy (Operations Director)"),
  ]);
}

// ═══════════════════════════════════════════════════════════
// F/19-006: PRODUCT DESCRIPTION
// ═══════════════════════════════════════════════════════════
async function createF19() {
  await createDoc("Product Description", "F-19-006 - BatFast Product Description.docx", [
    centeredTitle("VEZLOO"),
    centeredSubtitle("Product / Service Description Form"),
    formHeader("F/19", "02", "F/19-006", "March 2026"),
    blankLine(),
    sectionTitle("Service Details"),
    multiRowTable([
      ["Product/Service Name", "AI Data Annotation - Image Annotation"],
      ["Project Code", "BatFast-2026-03"],
      ["Client", "BatFast"],
      ["Service Category", "AI Data Annotation & Labeling"],
    ]),
    blankLine(),
    sectionTitle("Description"),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({
        text: "BatFast is an AI data annotation project requiring the annotation of 6,000 images according to specific client guidelines. The annotations are used for training AI/ML models in computer vision applications.",
        font: FONT, size: VALUE_SIZE,
      })],
    }),
    blankLine(),
    sectionTitle("Specifications"),
    multiRowTable([
      ["Input Data", "Raw images provided by client"],
      ["Output Format", "Annotated images per client specifications"],
      ["Total Volume", "6,000 images"],
      ["Annotation Type", "Image annotation (bounding boxes, labels)"],
      ["Quality Standard", "Per client annotation guidelines"],
    ]),
    blankLine(),
    sectionTitle("Deliverables"),
    multiRowTable([
      ["Primary Deliverable", "6,000 annotated images"],
      ["Quality Report", "Yes - included with delivery"],
      ["Delivery Method", "Digital upload per client requirements"],
      ["Delivery Deadline", "20 days from project start"],
    ]),
    blankLine(),
    sectionTitle("Project Outcome"),
    multiRowTable([
      ["Status", "Completed ✅"],
      ["Actual Delivery", "3 days before deadline (Day 17)"],
      ["Client Satisfaction", "Excellent - all feedback addressed"],
      ["Issues", "Initial feedback on missing parts - corrected promptly"],
    ]),
    blankLine(),
    sectionTitle("Approval"),
    approvalRow("Prepared By", "Andrew Maged (Operations Manager / QA Leader)"),
    blankLine(),
    approvalRow("Approved By", "Eman El Serafy (Operations Director)"),
  ]);
}

// ═══════════════════════════════════════════════════════════
// F/28-009: TRAINING ATTENDANCE
// ═══════════════════════════════════════════════════════════
async function createF28() {
  await createDoc("Training Attendance", "F-28-009 - BatFast Training Attendance.docx", [
    centeredTitle("VEZLOO"),
    centeredSubtitle("Training Attendance Sheet"),
    formHeader("F/28", "02", "F/28-009", "March 2026"),
    blankLine(),
    sectionTitle("Training Information"),
    multiRowTable([
      ["Training Title", "BatFast - AI Data Annotation Project Training"],
      ["Project", "BatFast"],
      ["Reason", "Prepare team for project requirements"],
      ["Trainer", "Andrew Maged (Operations Manager / QA Leader)"],
      ["Date", "March 2026 (before project start)"],
    ]),
    blankLine(),
    sectionTitle("Attendance Record - Batch 1"),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [cell("Sr.", 10, true), cell("Agent Name", 40, true), cell("Attendance", 25, true), cell("Signature", 25, true)] }),
        new TableRow({ children: [cell("1", 10), cell("Agent 1", 40), cell("✅ Present", 25), cell("", 25)] }),
        new TableRow({ children: [cell("2", 10), cell("Agent 2", 40), cell("✅ Present", 25), cell("", 25)] }),
        new TableRow({ children: [cell("3", 10), cell("Agent 3", 40), cell("✅ Present", 25), cell("", 25)] }),
        new TableRow({ children: [cell("4", 10), cell("Agent 4", 40), cell("✅ Present", 25), cell("", 25)] }),
        new TableRow({ children: [cell("5", 10), cell("Agent 5", 40), cell("✅ Present", 25), cell("", 25)] }),
      ],
    }),
    blankLine(),
    multiRowTable([
      ["Total Attendees", "5 agents"],
      ["Attendance Rate", "100%"],
    ]),
    blankLine(),
    sectionTitle("Training Content"),
    new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "1. Explanation of project requirements", font: FONT, size: VALUE_SIZE })] }),
    new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "2. Detailed walkthrough of annotation guidelines", font: FONT, size: VALUE_SIZE })] }),
    new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "3. Ensuring team readiness before starting production", font: FONT, size: VALUE_SIZE })] }),
    blankLine(),
    sectionTitle("Approval"),
    approvalRow("Conducted By", "Andrew Maged (Operations Manager / QA Leader)"),
    blankLine(),
    approvalRow("Verified By", "Eman El Serafy (Operations Director)"),
  ]);
}

// ═══════════════════════════════════════════════════════════
// F/29-006: TRAINING RECORD
// ═══════════════════════════════════════════════════════════
async function createF29() {
  await createDoc("Training Record", "F-29-006 - BatFast Training Record.docx", [
    centeredTitle("VEZLOO"),
    centeredSubtitle("Employee Training & Competence Record"),
    formHeader("F/29", "02", "F/29-006", "March 2026"),
    blankLine(),
    sectionTitle("Training Details"),
    multiRowTable([
      ["Training Program", "BatFast - AI Data Annotation Project"],
      ["Project", "BatFast"],
      ["Training Type", "Project-Specific Training"],
      ["Duration", "1 day (pre-production)"],
      ["Method", "In-person / Video conference"],
    ]),
    blankLine(),
    sectionTitle("Training Objectives"),
    new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "1. Understand BatFast project requirements and client expectations", font: FONT, size: VALUE_SIZE })] }),
    new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "2. Master annotation guidelines specific to this project", font: FONT, size: VALUE_SIZE })] }),
    new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "3. Ensure consistent quality across all team members", font: FONT, size: VALUE_SIZE })] }),
    new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "4. Achieve 100% team readiness before production start", font: FONT, size: VALUE_SIZE })] }),
    blankLine(),
    sectionTitle("Training Outcomes"),
    multiRowTable([
      ["Total Agents Trained", "5"],
      ["Competence Assessment", "All agents demonstrated understanding"],
      ["Effectiveness", "100% - all agents passed assessment"],
      ["Production Readiness", "Ready ✅"],
    ]),
    blankLine(),
    sectionTitle("Project Results"),
    multiRowTable([
      ["Total Annotated Images", "6,000"],
      ["Quality Standard Met", "Yes - per client specifications"],
      ["Delivery Status", "Completed 3 days before deadline"],
      ["Client Feedback", "Excellent - all feedback addressed"],
    ]),
    blankLine(),
    sectionTitle("Approval"),
    approvalRow("Trainer", "Andrew Maged (Operations Manager / QA Leader)"),
    blankLine(),
    approvalRow("Verified By", "Eman El Serafy (Operations Director)"),
  ]);
}

// ═══════════════════════════════════════════════════════════
// RUN ALL
// ═══════════════════════════════════════════════════════════
async function main() {
  console.log("🔄 Creating BatFast QMS Records (Professional Format)...\n");
  await createF08();
  await createF11();
  await createF19();
  await createF28();
  await createF29();
  console.log("\n✅ All 5 Records Created!");
}

main().catch(console.error);
