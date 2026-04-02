import AdmZip from "adm-zip";
import * as fs from "fs";

const DIR = "/tmp/batfast-final";
fs.mkdirSync(DIR, { recursive: true });

// ─── Helper: Fill empty cells after labels ─────────
function fillDocx(templatePath, outputPath, dataMap) {
  const zip = new AdmZip(templatePath);
  const entry = zip.getEntry("word/document.xml");
  let xml = zip.readAsText(entry);

  // Replace {{SERIAL}}
  for (const [placeholder, value] of Object.entries(dataMap)) {
    if (placeholder.startsWith("{{")) {
      xml = xml.split(placeholder).join(value);
    }
  }

  // For each label->value pair, find the empty <w:r> AFTER the label and inject data
  // Pattern: label text followed by empty cell
  // We need to find: <w:t>LABEL</w:t> ... (possibly across cells) ... then empty <w:r>...</w:r>
  
  for (const [label, value] of Object.entries(dataMap)) {
    if (label.startsWith("{{")) continue; // Skip placeholders

    // Find the label in the XML
    const labelIdx = xml.indexOf(`<w:t xml:space="preserve">${label}</w:t>`);
    if (labelIdx === -1) continue;

    // Find the NEXT empty <w:r> after this label (the cell value)
    // Empty pattern: <w:r w:rsidDel=... w:rsidR=... w:rsidRPr=...><w:rPr>...<w:rtl w:val="0"/></w:rPr></w:r>
    const afterLabel = xml.substring(labelIdx);
    
    // Find first empty <w:r> after the label
    const emptyPattern = /<w:r\s+w:rsidDel="00000000"\s+w:rsidR="00000000"\s+w:rsidRPr="00000000"><w:rPr>(<w:rFonts[^/]*\/>)?<w:rtl w:val="0"\/><\/w:rPr><\/w:r>/;
    const match = afterLabel.match(emptyPattern);
    
    if (match) {
      // Insert text content into this empty run
      const emptyRun = match[0];
      const filledRun = emptyRun.replace(
        '</w:rPr></w:r>',
        `</w:rPr><w:t xml:space="preserve">${value}</w:t></w:r>`
      );
      xml = xml.replace(emptyRun, filledRun);
    }
  }

  zip.updateFile(entry, Buffer.from(xml, "utf-8"));
  zip.writeZip(outputPath);
  console.log(`✅ ${outputPath.split("/").pop()}`);
}

// ─── F/08: Order Form ─────────
fillDocx(`${DIR}/F-08-template.docx`, `${DIR}/F-08-002-BatFast.docx`, {
  "{{SERIAL}}": "02",
  "Customer ": "BatFast",
  "Mode Of Receipt": "Email / Online",
  "Delivery Schedule": "20 days from project start",
  "Requirement Of Test Certificate": "No",
  "Statutory And Regulatory Requirements, If Any": "Complies - Data confidentiality per client requirements",
  "Yes / No": "No",
  "Complies / Does Not Complies": "Complies",
  "Remarks": "AI Data Annotation - 6,000 images. Delivered 3 days early.",
  "Despatch Date": "March 2026 (Day 17)",
});

// ─── F/11: Production Plan ─────────
// Need to download and check its structure
console.log("⚠️ F/11, F/19, F/28, F/29 need same treatment");
console.log("📁 Done with F/08");
