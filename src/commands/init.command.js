import fs from "fs"
import path from "path"
import { generateExpress } from "../generators/express.generator.js"

export function initCommand(args = []) {
  const framework = args[0]
  const cwd = process.cwd()
  const packageJsonPath = path.join(cwd, "package.json")

  if (fs.existsSync(packageJsonPath)) {
    console.log("This folder already contains a project")
    return
  }

  if (!framework) {
    console.log("Please specify a framework: devkit init express")
    return
  }

  if (framework === "express") {
    generateExpress(cwd)
    return
  }

  console.log("Unsupported framework")
}
