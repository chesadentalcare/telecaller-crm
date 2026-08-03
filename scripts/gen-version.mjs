import { writeFileSync, mkdirSync } from "node:fs"
import { resolve } from "node:path"

// Emitted on every build (via the `prebuild` npm hook). Next copies public/ into
// out/, so this ships as /version.json. use-version-watcher polls it and reloads
// open browsers when `version` changes — deploys propagate automatically.
const dir = resolve("public")
mkdirSync(dir, { recursive: true })
const payload = JSON.stringify({ version: Date.now(), buildAt: new Date().toISOString() })
writeFileSync(resolve(dir, "version.json"), payload)
console.log("version.json →", payload)
