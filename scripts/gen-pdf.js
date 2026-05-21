const { spawnSync } = require("child_process");
const path = require("path");

const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const html   = path.resolve(__dirname, "../salidas/presupuesto-cliente-cvalle.html");
const pdf    = path.resolve(__dirname, "../salidas/presupuesto-cliente-cvalle.pdf");

const result = spawnSync(chrome, [
  "--headless=new",
  "--disable-gpu",
  "--no-sandbox",
  "--print-to-pdf=" + pdf,
  "--print-to-pdf-no-header",
  "--no-pdf-header-footer",
  "--run-all-compositor-stages-before-draw",
  "--disable-software-rasterizer",
  "file:///" + html.replace(/\\/g, "/"),
], { timeout: 30000 });

if (result.error) {
  console.error("Error:", result.error.message);
  process.exit(1);
}

const fs = require("fs");
if (fs.existsSync(pdf)) {
  const size = fs.statSync(pdf).size;
  console.log("PDF generado OK:", pdf);
  console.log("Tamaño:", (size / 1024).toFixed(1), "KB");
} else {
  console.error("No se generó el PDF");
  process.exit(1);
}
