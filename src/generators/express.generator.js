import fs from "fs";
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export function generateExpress(targetDir) {
  const templateDir = path.join(__dirname, "../templates/express");

  copyDirectory(templateDir, targetDir);

  replaceProjectName(targetDir);

  console.log("Express project generated");
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function replaceProjectName(targetDir) {
  const packagePath = path.join(targetDir, "package.json");
  const projectName = path.basename(targetDir);

  let content = fs.readFileSync(packagePath, "utf-8");
  content = content.replace("{{projectName}}", projectName);

  fs.writeFileSync(packagePath, content);
}
