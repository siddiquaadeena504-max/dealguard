// Runs before `npm run dev`: checks settings, the local data folder, and Ollama.
// Then prints the addresses to open on this laptop and on your phone.
import { existsSync, mkdirSync, accessSync, constants } from "node:fs";
import { networkInterfaces } from "node:os";

let ok = true;

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
else console.warn("! .env.local not found, using default Ollama settings");

const OLLAMA_URL = (process.env.OLLAMA_URL || "http://localhost:11434").replace(/\/$/, "");
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:3b";

try {
  mkdirSync("data", { recursive: true });
  accessSync("data", constants.W_OK);
  console.log("✓ Local data folder is writable (dealguard/data)");
} catch {
  console.error("✗ Cannot write to the dealguard/data folder");
  ok = false;
}

const [major] = process.versions.node.split(".").map(Number);
if (major < 22) {
  console.error(`✗ Node.js ${process.versions.node} is too old. Install Node.js 22 or newer.`);
  ok = false;
} else {
  console.log(`✓ Node.js ${process.versions.node}`);
}

// Ollama problems are warnings: the app still runs, only AI features wait.
try {
  const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
  const { models = [] } = await res.json();
  const names = models.map((m) => m.name);
  if (names.includes(OLLAMA_MODEL)) {
    console.log(`✓ Ollama is running with ${OLLAMA_MODEL}`);
  } else {
    console.warn(`! Ollama is running but ${OLLAMA_MODEL} is missing. Run: ollama pull ${OLLAMA_MODEL}`);
  }
} catch {
  console.warn("! Ollama is not running. Open the Ollama app from the Start menu (AI features need it).");
}

if (!ok) process.exit(1);

const lan = Object.values(networkInterfaces())
  .flat()
  .filter((i) => i && i.family === "IPv4" && !i.internal)
  .map((i) => i.address);
console.log("\nOpen DealGuard:");
console.log("  On this laptop:  http://localhost:3000");
for (const ip of lan) console.log(`  On your phone:   http://${ip}:3000  (same Wi-Fi)`);
console.log("");
