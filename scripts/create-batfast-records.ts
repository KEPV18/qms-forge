import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle } from "docx";
import * as fs from "fs";

// Helper to create a styled paragraph
function p(text, options = {}) {
  const runs = [];
  if (options.bold) {
    runs.push(new TextRun({ text, bold: true, size: options.size || 22, font: "Calibri" }));
  } else {
    runs.push(new TextRun({ text, size: options.size || 22, font: "Calibri" }));
  }
  return new Paragraph({ children: runs, spacing: { after: 100 }, alignment: options.center ? AlignmentType.CENTER : undefined });
}

function heading(text, level = 1) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: level === 1 ? 28 : 24, font: "Calibri" })],
    heading: level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
    spacing: { after: 200 },
  });
}

function separator() {
  return new Paragraph({ children: [new TextRun({ text: "─".repeat(60), size: 18, color: "999999" })], spacing: { after: 100 } });
}

function fieldRow(label, value) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20, font: "Calibri" })] })], borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } } }),
          new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: value, size: 20, font: "Calibri" })] })], borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } } }),
        ],
      }),
    ],
  });
}

async function createDocument(sections, filename) {
  const doc = new Document({
    sections: [{ properties: {}, children: sections }],
  });
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(`/tmp/batfast-records/${filename}`, buffer);
  console.log(`✅ Created: ${filename}`);
}

// Create output directory
fs.mkdirSync("/tmp/batfast-records", { recursive: true });

// ═══════════════════════════════════════════════════════
// F/08-002: Order Form / Order Confirmation - BatFast
// ═══════════════════════════════════════════════════════
async function createF08() {
  const sections = [
    heading("VEZLOO", 1),
    heading("Order Form / Order Confirmation", 2),
    separator(),
    fieldRow("Form Code", "F/08"),
    fieldRow("Revision No.", "02"),
    fieldRow("Serial No.", "F/08-002"),
    fieldRow("Date", "March 2026"),
    separator(),
    heading("Customer Information", 2),
    fieldRow("Customer Name", "BatFast"),
    fieldRow("Project Name", "BatFast - AI Data Annotation"),
    fieldRow("Project Type", "Annotation"),
    fieldRow("Mode of Receipt", "Email / Online"),
    separator(),
    heading("Order Details", 2),
    fieldRow("Product/Service", "AI Data Annotation - Image Annotation"),
    fieldRow("Specifications", "Annotated images per client guidelines"),
    fieldRow("Quantity", "6,000 annotated images"),
    fieldRow("Delivery Schedule", "20 days from project start"),
    separator(),
    heading("Compliance", 2),
    fieldRow("Test Certificate Required", "No"),
    fieldRow("Statutory & Regulatory Requirements", "Complies - Data confidentiality and quality standards per client requirements"),
    fieldRow("Order Status", "Accepted"),
    separator(),
    heading("Approval", 2),
    fieldRow("Reviewed By", "Andrew Maged (Operations Manager / QA Leader)"),
    fieldRow("Authorised By", "Kareem Yehia (CEO)"),
    fieldRow("Date", "March 2026"),
  ];
  await createDocument(sections, "F-08-002 - BatFast Order Form.docx");
}

// ═══════════════════════════════════════════════════════
// F/11-003: Production Plan - BatFast
// ═══════════════════════════════════════════════════════
async function createF11() {
  const sections = [
    heading("VEZLOO", 1),
    heading("Production Plan", 2),
    separator(),
    fieldRow("Form Code", "F/11"),
    fieldRow("Revision No.", "02"),
    fieldRow("Serial No.", "F/11-003"),
    fieldRow("Date", "March 2026"),
    separator(),
    heading("Project Information", 2),
    fieldRow("Project Name", "BatFast"),
    fieldRow("Project Type", "AI Data Annotation - Image Annotation"),
    fieldRow("Client", "BatFast"),
    fieldRow("Start Date", "March 2026"),
    fieldRow("Deadline", "20 days from start"),
    separator(),
    heading("Production Requirements", 2),
    fieldRow("Total Tasks", "6,000 annotated images"),
    fieldRow("Daily Target", "300 images/day (6000 ÷ 20 days)"),
    fieldRow("Team Size", "5 agents"),
    fieldRow("Per Agent Daily Target", "60 images/agent/day"),
    separator(),
    heading("Resource Allocation", 2),
    fieldRow("Team Leader", "TBD (assigned by Operations Manager)"),
    fieldRow("Agents", "5 annotation specialists"),
    fieldRow("Additional Resources Required", "No"),
    fieldRow("Tools/Software", "Annotation platform per client specifications"),
    separator(),
    heading("Milestones", 2),
    fieldRow("Week 1", "1,500 images (25% completion)"),
    fieldRow("Week 2", "3,000 images (50% completion)"),
    fieldRow("Week 3", "4,500 images (75% completion)"),
    fieldRow("Day 17", "6,000 images (100% - delivered 3 days early)"),
    separator(),
    heading("Quality Control Points", 2),
    fieldRow("QC Check 1", "After first 1,000 images - verify annotation accuracy"),
    fieldRow("QC Check 2", "After 3,000 images - mid-project quality review"),
    fieldRow("QC Check 3", "After 5,000 images - pre-delivery verification"),
    fieldRow("Final QC", "Before delivery - 100% compliance check"),
    separator(),
    heading("Approval", 2),
    fieldRow("Prepared By", "Andrew Maged (Operations Manager / QA Leader)"),
    fieldRow("Approved By", "Eman El Serafy (Operations Director)"),
    fieldRow("Date", "March 2026"),
  ];
  await createDocument(sections, "F-11-003 - BatFast Production Plan.docx");
}

// ═══════════════════════════════════════════════════════
// F/19-006: Product Description - BatFast
// ═══════════════════════════════════════════════════════
async function createF19() {
  const sections = [
    heading("VEZLOO", 1),
    heading("Product / Service Description Form", 2),
    separator(),
    fieldRow("Form Code", "F/19"),
    fieldRow("Revision No.", "02"),
    fieldRow("Serial No.", "F/19-006"),
    fieldRow("Date", "March 2026"),
    separator(),
    heading("Product/Service Details", 2),
    fieldRow("Product/Service Name", "AI Data Annotation - Image Annotation"),
    fieldRow("Project Code", "BatFast-2026-03"),
    fieldRow("Client", "BatFast"),
    fieldRow("Service Category", "AI Data Annotation & Labeling"),
    separator(),
    heading("Description", 2),
    p("BatFast is an AI data annotation project requiring the annotation of 6,000 images according to specific client guidelines. The annotations are used for training AI/ML models in computer vision applications."),
    separator(),
    heading("Specifications", 2),
    fieldRow("Input Data", "Raw images provided by client"),
    fieldRow("Output Format", "Annotated images per client specifications"),
    fieldRow("Total Volume", "6,000 images"),
    fieldRow("Annotation Type", "Image annotation (bounding boxes, labels, etc.)"),
    fieldRow("Quality Standard", "Per client annotation guidelines"),
    separator(),
    heading("Deliverables", 2),
    fieldRow("Primary Deliverable", "6,000 annotated images"),
    fieldRow("Quality Report", "Yes - included with delivery"),
    fieldRow("Delivery Method", "Digital upload per client requirements"),
    fieldRow("Delivery Deadline", "20 days from project start"),
    separator(),
    heading("Project Outcome", 2),
    fieldRow("Status", "Completed"),
    fieldRow("Actual Delivery", "3 days before deadline (Day 17)"),
    fieldRow("Client Satisfaction", "Excellent - all feedback addressed"),
    fieldRow("Issues", "Initial feedback on missing parts - promptly corrected"),
    separator(),
    heading("Approval", 2),
    fieldRow("Prepared By", "Andrew Maged (Operations Manager / QA Leader)"),
    fieldRow("Approved By", "Eman El Serafy (Operations Director)"),
    fieldRow("Date", "March 2026"),
  ];
  await createDocument(sections, "F-19-006 - BatFast Product Description.docx");
}

// ═══════════════════════════════════════════════════════
// F/28-009: Training Attendance - BatFast
// ═══════════════════════════════════════════════════════
async function createF28() {
  const sections = [
    heading("VEZLOO", 1),
    heading("Training Attendance Sheet", 2),
    separator(),
    fieldRow("Form Code", "F/28"),
    fieldRow("Revision No.", "02"),
    fieldRow("Serial No.", "F/28-009"),
    fieldRow("Date", "March 2026"),
    separator(),
    heading("Training Information", 2),
    fieldRow("Training Title", "BatFast - AI Data Annotation Project Training"),
    fieldRow("Project", "BatFast"),
    fieldRow("Reason for Training", "Prepare team for project requirements and ensure alignment with annotation guidelines"),
    fieldRow("Trainer", "Andrew Maged (Operations Manager / QA Leader)"),
    fieldRow("Training Date", "March 2026 (before project start)"),
    separator(),
    heading("Attendance Record", 2),
    fieldRow("Total Batches", "1"),
    fieldRow("Batch 1 - Agent 1", "Present ✅"),
    fieldRow("Batch 1 - Agent 2", "Present ✅"),
    fieldRow("Batch 1 - Agent 3", "Present ✅"),
    fieldRow("Batch 1 - Agent 4", "Present ✅"),
    fieldRow("Batch 1 - Agent 5", "Present ✅"),
    fieldRow("Total Attendees", "5 agents"),
    fieldRow("Attendance Rate", "100%"),
    separator(),
    heading("Training Content", 2),
    p("1. Explanation of project requirements"),
    p("2. Detailed walkthrough of annotation guidelines"),
    p("3. Ensuring team readiness before starting production"),
    separator(),
    heading("Approval", 2),
    fieldRow("Conducted By", "Andrew Maged (Operations Manager / QA Leader)"),
    fieldRow("Verified By", "Eman El Serafy (Operations Director)"),
    fieldRow("Date", "March 2026"),
  ];
  await createDocument(sections, "F-28-009 - BatFast Training Attendance.docx");
}

// ═══════════════════════════════════════════════════════
// F/29-006: Training Record - BatFast
// ═══════════════════════════════════════════════════════
async function createF29() {
  const sections = [
    heading("VEZLOO", 1),
    heading("Employee Training & Competence Record", 2),
    separator(),
    fieldRow("Form Code", "F/29"),
    fieldRow("Revision No.", "02"),
    fieldRow("Serial No.", "F/29-006"),
    fieldRow("Date", "March 2026"),
    separator(),
    heading("Training Details", 2),
    fieldRow("Training Program", "BatFast - AI Data Annotation Project"),
    fieldRow("Project", "BatFast"),
    fieldRow("Training Type", "Project-Specific Training"),
    fieldRow("Training Duration", "1 day (pre-production)"),
    fieldRow("Training Method", "In-person / Video conference"),
    separator(),
    heading("Training Objectives", 2),
    p("1. Understand BatFast project requirements and client expectations"),
    p("2. Master annotation guidelines specific to this project"),
    p("3. Ensure consistent quality across all team members"),
    p("4. Achieve 100% team readiness before production start"),
    separator(),
    heading("Training Outcomes", 2),
    fieldRow("Total Agents Trained", "5"),
    fieldRow("Competence Assessment", "All agents demonstrated understanding of guidelines"),
    fieldRow("Training Effectiveness", "100% - all agents passed assessment"),
    fieldRow("Production Readiness", "Ready ✅"),
    separator(),
    heading("Project Results", 2),
    fieldRow("Total Annotated Images", "6,000"),
    fieldRow("Quality Standard Met", "Yes - per client specifications"),
    fieldRow("Delivery Status", "Completed 3 days before deadline"),
    fieldRow("Client Feedback", "Initial feedback on missing parts - corrected promptly. Final feedback: Excellent"),
    separator(),
    heading("Approval", 2),
    fieldRow("Trainer", "Andrew Maged (Operations Manager / QA Leader)"),
    fieldRow("Verified By", "Eman El Serafy (Operations Director)"),
    fieldRow("Date", "March 2026"),
  ];
  await createDocument(sections, "F-29-006 - BatFast Training Record.docx");
}

// ═══════════════════════════════════════════════════════
// F/22-?: Corrective Action Report - BatFast (if needed)
// ═══════════════════════════════════════════════════════
// BatFast had minor issues (missing annotations) that were corrected
// This is optional - only if Ahmed wants to document the issue

// ═══════════════════════════════════════════════════════
// RUN ALL
// ═══════════════════════════════════════════════════════
async function main() {
  console.log("🔄 Creating BatFast QMS Records...\n");
  await createF08();
  await createF11();
  await createF19();
  await createF28();
  await createF29();
  console.log("\n✅ All 5 BatFast Records Created!");
  console.log("\n📁 Files in /tmp/batfast-records/:");
  fs.readdirSync("/tmp/batfast-records/").forEach(f => console.log(`   - ${f}`));
}

main().catch(console.error);
