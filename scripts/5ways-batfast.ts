import AdmZip from "adm-zip";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, HeadingLevel } from "docx";
import * as fs from "fs";
import { execSync } from "child_process";

const DIR = "/tmp/batfast-5ways";
fs.mkdirSync(DIR, { recursive: true });

const FORM_CODE = "F-19";
const SERIAL = "007";
const RECORD_NAME = `${FORM_CODE}-${SERIAL}`;

// ═══════════════════════════════════════════════════════
// METHOD 1: docx npm - Professional New Document
// ═══════════════════════════════════════════════════════
async function method1() {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "000000" };
  const borders = { top: border, bottom: border, left: border, right: border };

  const cell = (text: string, width: number, bold = false, bg = "FFFFFF") => new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    shading: { type: "solid", color: bg },
    borders,
    children: [new Paragraph({ children: [new TextRun({ text, font: "Arial", size: 20, bold })] })],
  });

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: "VEZLOO", font: "Arial", size: 32, bold: true })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: "Product / Service Description Form", font: "Arial", size: 24 })] }),
        new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 100 }, children: [
          new TextRun({ text: `Form: ${FORM_CODE}  |  Rev: 02  |  Sr. No.: ${RECORD_NAME}  |  Date: April 2026`, font: "Arial", size: 18 }),
        ]}),
        new Paragraph({ spacing: { after: 200 }, children: [] }),

        // Header info table
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
          new TableRow({ children: [cell("Product Name", 30, true, "F0F0F0"), cell("BatFast - AI Data Annotation", 70)] }),
          new TableRow({ children: [cell("Process Name", 30, true, "F0F0F0"), cell("Image Annotation", 70)] }),
          new TableRow({ children: [cell("Composition", 30, true, "F0F0F0"), cell("6,000 annotated images per client guidelines", 70)] }),
          new TableRow({ children: [cell("Storage Condition", 30, true, "F0F0F0"), cell("Digital - Google Drive", 70)] }),
          new TableRow({ children: [cell("Distribution Method", 30, true, "F0F0F0"), cell("Digital upload to client", 70)] }),
          new TableRow({ children: [cell("Intended Use", 30, true, "F0F0F0"), cell("Training AI/ML computer vision models", 70)] }),
        ]}),

        new Paragraph({ spacing: { after: 300 }, children: [] }),
        new Paragraph({ children: [new TextRun({ text: "Approved By: Eman El Serafy (Operations Director)", font: "Arial", size: 20 })] }),
      ],
    }],
  });

  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(`${DIR}/WAY1-docx-npm-${RECORD_NAME}.docx`, buf);
  console.log("✅ Way 1: docx npm - new document with tables");
}

// ═══════════════════════════════════════════════════════
// METHOD 2: adm-zip - Modify Original Template XML
// ═══════════════════════════════════════════════════════
async function method2() {
  // Download original F/19 template
  execSync(`gog drive download "1wgE4dRyRjL4hYHdc79kTsLmh6q1rjeh0" --account ibnkhaled16@gmail.com --output "${DIR}/F19-template.docx" 2>/dev/null`);

  const zip = new AdmZip(`${DIR}/F19-template.docx`);
  const entry = zip.getEntry("word/document.xml");
  let xml = zip.readAsText(entry);

  // Replace {{SERIAL}}
  xml = xml.replace(/\{\{SERIAL\}\}/g, "02");

  // Find empty <w:r> elements and inject data
  // The pattern: empty runs have <w:rPr>...<w:rtl w:val="0"/></w:rPr></w:r>
  // We replace the FIRST empty run after each known label

  const fills: [string, string][] = [
    // For F/19, labels are in the text runs
    // We find the empty run AFTER each label text
  ];

  // More aggressive: replace ALL empty <w:r> runs with text
  // First, count empty runs
  const emptyPattern = /<w:r\s+w:rsidDel="00000000"\s+w:rsidR="00000000"\s+w:rsidRPr="00000000"><w:rPr>(<w:rFonts[^/]*\/>)?(<w:b[^/]*\/>)?(<w:sz[^/]*\/>)?<w:rtl w:val="0"\/><\/w:rPr><\/w:r>/g;
  const emptyRuns = xml.match(emptyPattern);
  console.log(`  Found ${emptyRuns?.length || 0} empty runs in F/19`);

  // Replace with data (mapped to known positions)
  const data = ["BatFast - AI Data Annotation", "Image Annotation", "6,000 annotated images", 
    "Bounding boxes and labels", "Quality checks at milestones", "Digital - Google Drive",
    "Digital upload", "N/A", "N/A", "N/A", "Internal use", "N/A", "AI/ML training", "Data protection"];
  
  let idx = 0;
  xml = xml.replace(emptyPattern, (match) => {
    const val = data[idx] || "";
    idx++;
    if (!val) return match;
    return match.replace('</w:rPr></w:r>', `</w:rPr><w:t xml:space="preserve">${val}</w:t></w:r>`);
  });

  zip.updateFile(entry, Buffer.from(xml, "utf-8"));
  zip.writeZip(`${DIR}/WAY2-admzip-${RECORD_NAME}.docx`);
  console.log("✅ Way 2: adm-zip - modify original XML");
}

// ═══════════════════════════════════════════════════════
// METHOD 3: Simple text replacement with markers
// ═══════════════════════════════════════════════════════
async function method3() {
  // Download original
  execSync(`gog drive download "1wgE4dRyRjL4hYHdc79kTsLmh6q1rjeh0" --account ibnkhaled16@gmail.com --output "${DIR}/F19-template-3.docx" 2>/dev/null`);

  const zip = new AdmZip(`${DIR}/F19-template-3.docx`);
  const entry = zip.getEntry("word/document.xml");
  let xml = zip.readAsText(entry);

  // Simple replacements - find specific text patterns and extend them
  const replacements: Record<string, string> = {
    "{{SERIAL}}": "02",
    // Replace label-only cells: find "Product Name" followed by empty cell
    // In XML: <w:t>Product Name</w:t> ... <w:r><w:rPr>...</w:rPr></w:r>
    // After "Product Name" text, find the next <w:r> without <w:t>
  };

  // Use regex to find label + empty cell pattern
  const labelData: Record<string, string> = {
    "Product Name": "BatFast - AI Data Annotation",
    "Process name": "Image Annotation",
    "Composition": "6,000 images per guidelines",
    "End Product Characteristics": "Annotated images with labels",
    "Storage Condition": "Digital - Google Drive",
    "Distribution Method": "Digital upload to client",
    "Intended Use": "AI/ML training",
    "Regulatory Requirements": "Data protection compliance",
  };

  for (const [label, value] of Object.entries(labelData)) {
    // Find: <w:t>LABEL</w:t> ... <w:r><w:rPr>...<w:rtl w:val="0"/></w:rPr></w:r>
    // Replace the empty <w:r> after the label
    const regex = new RegExp(
      `(<w:t[^>]*>${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</w:t>[\\s\\S]{0,200}?)<w:r\\s+[^>]*><w:rPr>[^<]*(<w:rFonts[^/]*\\/>)?<w:rtl w:val="0"/><\\/w:rPr><\\/w:r>`,
      "g"
    );
    xml = xml.replace(regex, `$1<w:r><w:rPr><w:rtl w:val="0"/></w:rPr><w:t xml:space="preserve">${value}</w:t></w:r>`);
  }

  zip.updateFile(entry, Buffer.from(xml, "utf-8"));
  zip.writeZip(`${DIR}/WAY3-smart-replace-${RECORD_NAME}.docx`);
  console.log("✅ Way 3: smart label-based replacement");
}

// ═══════════════════════════════════════════════════════
// METHOD 4: Download as Google Doc, edit, export
// ═══════════════════════════════════════════════════════
async function method4() {
  // Step 1: Copy template to a new Google Doc
  const copyResult = execSync(`gog drive copy "1wgE4dRyRjL4hYHdc79kTsLmh6q1rjeh0" "WAY4-gdoc-${RECORD_NAME}" --account ibnkhaled16@gmail.com --json 2>/dev/null`, { encoding: "utf-8" });
  const fileId = JSON.parse(copyResult).file.id;
  console.log(`  Created Google Doc: ${fileId}`);

  // Step 2: Download as docx (Google converts it)
  execSync(`gog drive download "${fileId}" --account ibnkhaled16@gmail.com --output "${DIR}/WAY4-gdoc-${RECORD_NAME}.docx" 2>/dev/null`);

  // Step 3: Clean up the Google Doc
  execSync(`gog drive delete "${fileId}" --account ibnkhaled16@gmail.com --force 2>/dev/null`);

  console.log("✅ Way 4: Google Docs copy & download");
}

// ═══════════════════════════════════════════════════════
// METHOD 5: Download original, rename, minimal changes
// ═══════════════════════════════════════════════════════
async function method5() {
  // Just download the original and rename - no modifications
  // The user fills data manually
  execSync(`gog drive download "1wgE4dRyRjL4hYHdc79kTsLmh6q1rjeh0" --account ibnkhaled16@gmail.com --output "${DIR}/WAY5-original-${RECORD_NAME}.docx" 2>/dev/null`);
  console.log("✅ Way 5: original template - no modifications (user fills manually)");
}

// ═══════════════════════════════════════════════════════
// RUN ALL 5 METHODS
// ═══════════════════════════════════════════════════════
async function main() {
  console.log("🔄 Creating 5 different record formats...\n");
  await method1();
  await method2();
  await method3();
  await method4();
  await method5();
  console.log("\n📁 All 5 methods done:");
  fs.readdirSync(DIR).filter(f => f.startsWith("WAY")).forEach(f => console.log(`   📄 ${f}`));
}

main().catch(console.error);
