/**
 * Runs as the process Infisical starts. Removes machine-identity credentials
 * from the environment, then replaces this process with the requested command.
 * Injected app secrets stay. Nothing in the environment is printed.
 */
import { spawn } from "node:child_process"

const CREDENTIALS = [
  "INFISICAL_TOKEN",
  "INFISICAL_UNIVERSAL_AUTH_CLIENT_ID",
  "INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET",
  "INFISICAL_UNIVERSAL_AUTH_ACCESS_TOKEN",
  "INFISICAL_JWT",
  "INFISICAL_PASSWORD",
]

const separator = process.argv.indexOf("--")
const command = separator === -1 ? [] : process.argv.slice(separator + 1)
if (command.length === 0) {
  process.stderr.write("infisical-drop-auth: missing command after --\n")
  process.exit(1)
}

const env = { ...process.env }
for (const name of CREDENTIALS) delete env[name]

const child = spawn(command[0], command.slice(1), { env, stdio: "inherit" })
child.on("error", () => {
  process.stderr.write("infisical-drop-auth: failed to start command\n")
  process.exit(1)
})
child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 1)
})
