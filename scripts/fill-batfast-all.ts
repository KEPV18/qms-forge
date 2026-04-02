import AdmZip from "adm-zip";
import * as fs from "fs";

const DIR = "/tmp/batfast-final";

function fillDocx(templatePath, outputPath, dataMap) {
  const zip = new AdmZip(templatePath);
  const entry = zip.getEntry("word/document.xml");
  let xml = zip.readAsText(entry);

  // Replace {{SERIAL}}
  for (const [k, v] of Object.entries(dataMap)) {
    if (k.startsWith("{{")) xml = xml.split(k).join(v);
  }

  // Fill empty cells after labels
  for (const [label, value] of Object.entries(dataMap)) {
    if (label.startsWith("{{")) continue;

    // Find label - try exact match first
    let labelIdx = xml.indexOf(label);
    if (labelIdx === -1) continue;

    // Find NEXT empty <w:r> after this label
    const afterLabel = xml.substring(labelIdx + label.length, labelIdx + label.length + 5000);
    const emptyPattern = /<w:r\s+w:rsidDel="00000000"\s+w:rsidR="00000000"\s+w:rsidRPr="00000000"><w:rPr>(<w:rFonts[^/]*\/>)?<w:rtl w:val="0"\/><\/w:rPr><\/w:r>/;
    const match = afterLabel.match(emptyPattern);

    if (match) {
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

// ═══════════════════════════════════════════════════════
// F/08: Order Form
// ═══════════════════════════════════════════════════════
fillDocx(`${DIR}/F-08-template.docx`, `${DIR}/F-08-002-BatFast.docx`, {
  "{{SERIAL}}": "02",
  "Customer ": "BatFast",
  "Mode Of Receipt": "Email / Online",
  "Delivery Schedule": "20 days from project start",
  "Requirement Of Test Certificate": "No",
  "Statutory And Regulatory Requirements, If Any": "Complies - Data confidentiality per client requirements",
  "Yes / No": "No",
  "Complies / Does Not Complies": "Complies",
  "Remarks": "AI Data Annotation - 6,000 images. Completed 3 days before deadline.",
  "Despatch Date": "Day 17 (3 days early)",
});

// ═══════════════════════════════════════════════════════
// F/11: Production Plan
// ═══════════════════════════════════════════════════════
fillDocx(`${DIR}/F-11-template.docx`, `${DIR}/F-11-003-BatFast.docx`, {
  "{{SERIAL}}": "03",
  "Planning For Products": "AI Data Annotation - Image Annotation",
  "Plan For Completion": "20 days",
  "Actual Completion": "17 days (3 days early)",
  "% Yield": "100% - 6,000 images delivered",
  "Date": "March 2026",
});

// ═══════════════════════════════════════════════════════
// F/19: Product Description
// ═══════════════════════════════════════════════════════
fillDocx(`${DIR}/F-19-template.docx`, `${DIR}/F-19-006-BatFast.docx`, {
  "Product Name": "BatFast - AI Data Annotation",
  " Process name": "Image Annotation",
  "Composition": "6,000 annotated images per client guidelines",
  "End Product Characteristics": "Annotated images with bounding boxes and labels",
  "Method of Prevention": "Quality checks at 1K, 3K, 5K milestones",
  " Storage Condition": "Digital storage - Google Drive",
  "Distribution Method": "Digital upload to client",
  "Support &amp; Update Period": "N/A - one-time delivery",
  "Licensing &amp; Legal notices": "Per client NDA and data confidentiality",
  "Customer Use and Installation/Setup guide.": "N/A - raw data for AI training",
  "Where it is to be sold": "Internal use by BatFast for AI/ML models",
  "Sensitive Consumer": "N/A - B2B service",
  "Intended Use": "Training AI/ML computer vision models",
  "Regulatory Requirements": "Data protection and client confidentiality",
});

// ═══════════════════════════════════════════════════════
// F/28: Training Attendance
// ═══════════════════════════════════════════════════════
fillDocx(`${DIR}/F-28-template.docx`, `${DIR}/F-28-009-BatFast.docx`, {
  "Department ": "Operations - BatFast Project",
  "Training Date ": "March 2026",
});

// ═══════════════════════════════════════════════════════
// F/29: Training Record
// ═══════════════════════════════════════════════════════
fillDocx(`${DIR}/F-29-template.docx`, `${DIR}/F-29-006-BatFast.docx`, {
  "{{SERIAL}}": "06",
  "Annual Assessment Done On": "March 2026",
});

console.log("\n=== All 5 Forms Filled ===");
fs.readdirSync(DIR).filter(f => f.includes("BatFast")).forEach(f => console.log(`📄 ${f}`));
