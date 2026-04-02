import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ShadingType, PageNumber, Header, Footer } from "docx";
import * as fs from "fs";

const DIR = "/tmp/batfast-pro";
fs.mkdirSync(DIR, { recursive: true });

// Professional border style matching original templates
const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: "000000" };
const borders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const noBorder = { style: BorderStyle.NONE, size: 0 };

// Cell helper
function cell(text: string, widthPct: number, opts: { bold?: boolean; bg?: string; align?: string; fontSize?: number; font?: string } = {}) {
  const { bold = false, bg = "FFFFFF", align = "left", fontSize = 20, font = "Arial Narrow" } = opts;
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.SOLID, color: bg },
    borders,
    children: [new Paragraph({
      alignment: align === "center" ? AlignmentType.CENTER : align === "right" ? AlignmentType.RIGHT : AlignmentType.LEFT,
      spacing: { before: 40, after: 40 },
      children: [new TextRun({ text, font, size: fontSize, bold })],
    })],
  });
}

// Empty cell for data entry
function emptyCell(widthPct: number) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    borders,
    children: [new Paragraph({ spacing: { before: 40, after: 40 }, children: [] })],
  });
}

// Row helper
function labelValueRow(label: string, value: string, labelWidth = 35) {
  return new TableRow({ children: [
    cell(label, labelWidth, { bold: true, bg: "F2F2F2" }),
    cell(value, 100 - labelWidth),
  ]});
}

async function createProfessionalF19() {
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 720, bottom: 720, left: 900, right: 900 },
          size: { width: 12240, height: 15840 }, // Letter portrait
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: "F/19 | Rev 02 | F/19-007", font: "Arial Narrow", size: 16, color: "888888" })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "Vezloo QMS - Confidential", font: "Arial Narrow", size: 16, color: "888888" })],
          })],
        }),
      },
      children: [
        // ═══ HEADER ═══
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 50 }, children: [
          new TextRun({ text: "VEZLOO", font: "Arial Narrow", size: 40, bold: true }),
        ]}),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 50 }, children: [
          new TextRun({ text: "Quality Management System", font: "Arial Narrow", size: 22, color: "666666" }),
        ]}),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [
          new TextRun({ text: "PRODUCT / SERVICE DESCRIPTION FORM", font: "Arial Narrow", size: 28, bold: true }),
        ]}),

        // ═══ FORM INFO ═══
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [new TableRow({ children: [
            cell("Form Code: F/19", 25, { bold: true, fontSize: 18 }),
            cell("Revision: 02", 25, { fontSize: 18 }),
            cell("Sr. No.: F/19-007", 25, { bold: true, fontSize: 18 }),
            cell("Date: April 2026", 25, { fontSize: 18 }),
          ]})],
        }),

        new Paragraph({ spacing: { after: 200 }, children: [] }),

        // ═══ SECTION: Service Details ═══
        new Paragraph({ spacing: { before: 200, after: 100 }, children: [
          new TextRun({ text: "Service Details", font: "Arial Narrow", size: 24, bold: true, underline: {} }),
        ]}),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            labelValueRow("Product/Service Name", "BatFast - AI Data Annotation"),
            labelValueRow("Project Code", "BatFast-2026-04"),
            labelValueRow("Client", "BatFast"),
            labelValueRow("Service Category", "AI Data Annotation & Labeling"),
          ],
        }),

        new Paragraph({ spacing: { after: 200 }, children: [] }),

        // ═══ SECTION: Specifications ═══
        new Paragraph({ spacing: { before: 200, after: 100 }, children: [
          new TextRun({ text: "Specifications", font: "Arial Narrow", size: 24, bold: true, underline: {} }),
        ]}),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            labelValueRow("Input Data", "Raw images provided by client"),
            labelValueRow("Output Format", "Annotated images per client specifications"),
            labelValueRow("Total Volume", "6,000 images"),
            labelValueRow("Annotation Type", "Image annotation (bounding boxes, labels)"),
            labelValueRow("Quality Standard", "Per client annotation guidelines"),
          ],
        }),

        new Paragraph({ spacing: { after: 200 }, children: [] }),

        // ═══ SECTION: Deliverables ═══
        new Paragraph({ spacing: { before: 200, after: 100 }, children: [
          new TextRun({ text: "Deliverables", font: "Arial Narrow", size: 24, bold: true, underline: {} }),
        ]}),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            labelValueRow("Primary Deliverable", "6,000 annotated images"),
            labelValueRow("Quality Report", "Yes - included with delivery"),
            labelValueRow("Delivery Method", "Digital upload per client requirements"),
            labelValueRow("Delivery Deadline", "20 days from project start"),
          ],
        }),

        new Paragraph({ spacing: { after: 200 }, children: [] }),

        // ═══ SECTION: Project Outcome ═══
        new Paragraph({ spacing: { before: 200, after: 100 }, children: [
          new TextRun({ text: "Project Outcome", font: "Arial Narrow", size: 24, bold: true, underline: {} }),
        ]}),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            labelValueRow("Status", "Completed"),
            labelValueRow("Actual Delivery", "3 days before deadline (Day 17)"),
            labelValueRow("Client Satisfaction", "Excellent - all feedback addressed"),
            labelValueRow("Issues", "Initial feedback on missing parts - corrected promptly"),
          ],
        }),

        new Paragraph({ spacing: { after: 300 }, children: [] }),

        // ═══ APPROVAL ═══
        new Paragraph({ spacing: { before: 200, after: 100 }, children: [
          new TextRun({ text: "Approval", font: "Arial Narrow", size: 24, bold: true, underline: {} }),
        ]}),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [
              cell("Prepared By:", 35, { bold: true, bg: "F2F2F2" }),
              cell("Andrew Maged (Operations Manager / QA Leader)", 65),
            ]}),
            new TableRow({ children: [
              cell("Approved By:", 35, { bold: true, bg: "F2F2F2" }),
              cell("Eman El Serafy (Operations Director)", 65),
            ]}),
            new TableRow({ children: [
              cell("Date:", 35, { bold: true, bg: "F2F2F2" }),
              cell("April 2026", 65),
            ]}),
          ],
        }),
      ],
    }],
  });

  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(`${DIR}/PROFESSIONAL-F-19-007-BatFast.docx`, buf);
  console.log("✅ Professional F/19-007 created");
}

createProfessionalF19().catch(console.error);
