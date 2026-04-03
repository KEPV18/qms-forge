const Docxtemplater = require("docxtemplater");
const PizZip = require("pizzip");
const fs = require("fs");
const { execSync } = require("child_process");

const DIR = "/tmp/batfast-templater";
fs.mkdirSync(DIR, { recursive: true });

function download(id, name) {
  execSync(`gog drive download "${id}" --account ibnkhaled16@gmail.com --output "${DIR}/${name}" 2>/dev/null`);
  console.log(`📥 ${name}`);
}

function fillTemplate(templatePath, outputPath, data) {
  const content = fs.readFileSync(templatePath, "binary");
  const zip = new PizZip(content);
  
  try {
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: "{{", end: "}}" },
    });

    doc.render(data);
    
    const buf = doc.getZip().generate({ type: "nodebuffer" });
    fs.writeFileSync(outputPath, buf);
    console.log(`✅ ${outputPath.split("/").pop()}`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

// Download templates
download("1rOjMRFffkqOBLdX7AK8dnBGiNu6vwZvn", "F08.docx");
download("1E_LFdEKjg96hklUucswEAVibo-v8HNu2", "F11.docx");
download("1wgE4dRyRjL4hYHdc79kTsLmh6q1rjeh0", "F19.docx");

// Fill each template
console.log("\n🔄 Filling templates...\n");

fillTemplate(`${DIR}/F08.docx`, `${DIR}/F-08-002-BatFast.docx`, {
  SERIAL: "02",
});

fillTemplate(`${DIR}/F11.docx`, `${DIR}/F-11-003-BatFast.docx`, {
  SERIAL: "03",
});

fillTemplate(`${DIR}/F19.docx`, `${DIR}/F-19-006-BatFast.docx`, {
  SERIAL: "06",
});

console.log("\nDone!");
