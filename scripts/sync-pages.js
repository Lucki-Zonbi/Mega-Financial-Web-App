const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const distDir = path.join(rootDir, ".pages-dist");

console.log("");
console.log("==========================================");
console.log("Mega Financial GitHub Pages Sync");
console.log("==========================================");
console.log("");

if (!fs.existsSync(publicDir)) {
  console.error("ERROR: public/ folder was not found.");
  process.exit(1);
}

if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}

fs.mkdirSync(distDir, { recursive: true });

fs.cpSync(publicDir, distDir, {
  recursive: true,
  force: true
});

console.log("Copied public/ into .pages-dist/");
console.log("");
console.log("GitHub Pages files synced successfully.");
console.log("Ready to deploy.");
console.log("");
console.log("==========================================");
console.log("");
