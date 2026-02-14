import { initCommand } from "./commands/init.command.js";

const args = process.argv.slice(2);
const command = args[0];

if (command === "init") {
  initCommand(args.slice(1));
} else {
  console.log("Available commands: init");
}
