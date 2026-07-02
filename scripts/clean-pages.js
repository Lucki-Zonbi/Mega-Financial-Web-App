const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const distDir = path.join(rootDir, ".pages-dist");

console.log("");
console.log("==========================================");
console.log("Mega Financial GitHub Pages Cleanup");
console.log("==========================================");
console.log("");

if (!fs.existsSync(distDir)) {
  console.log("No .pages-dist/ folder found. Nothing to clean.");
} else {
  fs.rmSync(distDir, { recursive: true, force: true });
  console.log("Removed .pages-dist/ temporary deployment folder.");
}

console.log("");
console.log("Cleanup complete.");
console.log("");
console.log("==========================================");
console.log("");
