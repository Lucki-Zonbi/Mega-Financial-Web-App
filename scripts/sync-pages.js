const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const distDir = path.join(rootDir, ".pages-dist");

const forbiddenDeploymentNames = new Set([
  ".env",
  ".git",
  "private-uploads"
]);

function findForbiddenDeploymentPath(directory) {
  const entries = fs.readdirSync(directory, {
    withFileTypes: true
  });

  for (const entry of entries) {
    if (
      forbiddenDeploymentNames.has(entry.name) ||
      entry.name.startsWith(".env.")
    ) {
      return path.join(directory, entry.name);
    }

    if (entry.isDirectory()) {
      const nestedForbiddenPath =
        findForbiddenDeploymentPath(
          path.join(directory, entry.name)
        );

      if (nestedForbiddenPath) {
        return nestedForbiddenPath;
      }
    }
  }

  return null;
}

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

const forbiddenDeploymentPath =
  findForbiddenDeploymentPath(distDir);

if (forbiddenDeploymentPath) {
  const relativeForbiddenPath =
    path.relative(
      distDir,
      forbiddenDeploymentPath
    );

  fs.rmSync(distDir, {
    recursive: true,
    force: true
  });

  console.error(
    `ERROR: Forbidden deployment file detected: ${relativeForbiddenPath}`
  );

  console.error(
    "GitHub Pages deployment was stopped before publishing."
  );

  process.exit(1);
}

console.log("Copied public/ into .pages-dist/");
console.log("");
console.log("GitHub Pages files synced successfully.");
console.log("Ready to deploy.");
console.log("");
console.log("==========================================");
console.log("");
