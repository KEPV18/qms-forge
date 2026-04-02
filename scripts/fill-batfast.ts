import AdmZip from "adm-zip";
import * as fs from "fs";
import * as path from "path";

const DIR = "/tmp/batfast-filled";

function processTemplate(inputFile, outputFile, serial, replacements) {
  const zip = new AdmZip(inputFile);
  const xmlEntry = zip.getEntry("word/document.xml");
  if (!xmlEntry) { console.error(`❌ No document.xml in ${inputFile}`); return; }

  let xml = zip.readAsText(xmlEntry);

  // Replace {{SERIAL}}
  xml = xml.replace(/\{\{SERIAL\}\}/g, serial);

  // Apply custom replacements
  for (const [from, to] of Object.entries(replacements)) {
    xml = xml.split(from).join(to);
  }

  // Update the zip
  zip.updateFile("word/document.xml", Buffer.from(xml, "utf-8"));

  // Write output
  zip.writeZip(outputFile);
  console.log(`✅ ${path.basename(outputFile)}`);
}

// ═══════════════════════════════════════════════════════
// F/08: Order Form
// ═══════════════════════════════════════════════════════
processTemplate(
  `${DIR}/F-08-template.docx`,
  `${DIR}/F-08-002-BatFast.docx`,
  "02",
  {
    // Fill empty fields - replace empty table cells after label text
    // "Date 🡪" is followed by empty cell - add date after the arrow
    "Date \u{1F61A}": "Date: March 2026",
    "Date 🡪": "Date: March 2026",
    // After "Customer " there's an empty cell
    "Mode Of Receipt": "Customer: BatFast\nMode Of Receipt: Email / Online",
  }
);

// ═══════════════════════════════════════════════════════
// F/11: Production Plan  
// ═══════════════════════════════════════════════════════
processTemplate(
  `${DIR}/F-11-template.docx`,
  `${DIR}/F-11-003-BatFast.docx`,
  "03",
  {
    "Date \u{1F61A}": "Date: March 2026",
    "Date 🡪": "Date: March 2026",
  }
);

// ═══════════════════════════════════════════════════════
// F/19: Product Description
// ═══════════════════════════════════════════════════════
processTemplate(
  `${DIR}/F-19-template.docx`,
  `${DIR}/F-19-006-BatFast.docx`,
  "06",
  {
    "Date \u{1F61A}": "Date: March 2026",
    "Date 🡪": "Date: March 2026",
  }
);

// ═══════════════════════════════════════════════════════
// F/28: Training Attendance
// ═══════════════════════════════════════════════════════
processTemplate(
  `${DIR}/F-28-template.docx`,
  `${DIR}/F-28-009-BatFast.docx`,
  "09",
  {
    "Date \u{1F61A}": "Date: March 2026",
    "Date 🡪": "Date: March 2026",
  }
);

// ═══════════════════════════════════════════════════════
// F/29: Training Record
// ═══════════════════════════════════════════════════════
processTemplate(
  `${DIR}/F-29-template.docx`,
  `${DIR}/F-29-006-BatFast.docx`,
  "06",
  {
    "Date \u{1F61A}": "Date: March 2026",
    "Date 🡪": "Date: March 2026",
  }
);

console.log("\n=== All 5 Records Filled ===");
fs.readdirSync(DIR).filter(f => f.includes("BatFast")).forEach(f => console.log(`📁 ${f}`));
