import fs from "fs";
import path from "path";

export function generateExpress(targetDir) {
  const srcDir = path.join(targetDir, "src");

  fs.mkdirSync(srcDir, { recursive: true });

  const packageJson = {
    name: path.basename(targetDir),
    version: "1.0.0",
    main: "src/server.js",
    scripts: {
      start: "node src/server.js",
      dev: "node src/server.js",
    },
    dependencies: {
      express: "^4.18.2",
    },
  };

  fs.writeFileSync(
    path.join(targetDir, "package.json"),
    JSON.stringify(packageJson, null, 2),
  );

  fs.writeFileSync(path.join(srcDir, "app.js"), getAppTemplate());

  fs.writeFileSync(path.join(srcDir, "server.js"), getServerTemplate());

  console.log("Express project generated");
}

function getAppTemplate() {
  return `
import express from "express"

const app = express()

app.get("/", (req, res) => {
  res.send("Hello from DevKit Express")
})

export default app
`;
}

function getServerTemplate() {
  return `
import app from "./app.js"

const PORT = 3000

app.listen(PORT, () => {
  console.log("Server running on port " + PORT)
})
`;
}
