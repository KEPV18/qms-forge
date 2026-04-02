import AdmZip from "adm-zip";
import * as fs from "fs";

const DIR = "/tmp/batfast-pro";

// Create working directory
fs.mkdirSync(DIR, { recursive: true });

// Download function using gog
async function download(fileId, name) {
  const { execSync } = await import("child_process");
  execSync(`gog drive download "${fileId}" --account ibnkhaled16@gmail.com --output "${DIR}/${name}" 2>/dev/null`, { stdio: "pipe" });
  console.log(`📥 Downloaded: ${name}`);
}

function fillForm(input, output, replacements) {
  const zip = new AdmZip(input);
  const entries = zip.getEntries();

  for (const entry of entries) {
    if (entry.entryName.endsWith(".xml")) {
      let content = zip.readAsText(entry);
      let changed = false;

      for (const [from, to] of Object.entries(replacements)) {
        if (content.includes(from)) {
          // Use regex to find the text run and insert data after it
          // Pattern: <w:t>FROM_TEXT</w:t> followed by empty <w:t></w:t>
          const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          // Replace empty text run after label with value
          const pattern = new RegExp(
            `(<w:t[^>]*>${escaped}</w:t>)(</w:r>)(\\s*<w:r[^>]*>[^<]*<w:t[^>]*>)(</w:t>)`,
            "g"
          );
          if (pattern.test(content)) {
            content = content.replace(pattern, `$1</w:r>$3${to}</w:t>`);
            changed = true;
          }
        }
      }

      if (changed) {
        zip.updateFile(entry, Buffer.from(content, "utf-8"));
      }
    }
  }

  zip.writeZip(output);
  console.log(`✅ Created: ${output.split("/").pop()}`);
}

async function main() {
  console.log("🔄 Downloading templates...\n");

  // Download original templates
  await download("1rOjMRFffkqOBLdX7AK8dnBGiNu6vwZvn", "F-08-template.docx");
  await download("1E_LFdEKjg96hklUucswEAVibo-v8HNu2", "F-11-template.docx");
  await download("1wgE4dRyRjL4hYHdc79kTsLmh6q1rjeh0", "F-19-template.docx");
  await download("1Zn3k1zw6H0-pzUELpygeE26Y9ZMk4vin", "F-28-template.docx");
  await download("13_hlOTqUyoU4zPvn_ihuyrtneWU2HPC7", "F-29-template.docx");

  console.log("\n🔄 Filling forms with BatFast data...\n");

  // F/08 - Order Form
  fillForm(
    `${DIR}/F-08-template.docx`,
    `${DIR}/F-08-002-BatFast.docx`,
    { "{{SERIAL}}": "02" }
  );

  // F/11 - Production Plan
  fillForm(
    `${DIR}/F-11-template.docx`,
    `${DIR}/F-11-003-BatFast.docx`,
    { "{{SERIAL}}": "03" }
  );

  // F/19 - Product Description
  fillForm(
    `${DIR}/F-19-template.docx`,
    `${DIR}/F-19-006-BatFast.docx`,
    { "{{SERIAL}}": "06" }
  );

  // F/28 - Training Attendance
  fillForm(
    `${DIR}/F-28-template.docx`,
    `${DIR}/F-28-009-BatFast.docx`,
    { "{{SERIAL}}": "09" }
  );

  // F/29 - Training Record
  fillForm(
    `${DIR}/F-29-template.docx`,
    `${DIR}/F-29-006-BatFast.docx`,
    { "{{SERIAL}}": "06" }
  );

  console.log("\n📁 Files ready:");
  fs.readdirSync(DIR)
    .filter((f) => f.includes("BatFast"))
    .forEach((f) => console.log(`   📄 ${f}`));
}

main().catch(console.error);
