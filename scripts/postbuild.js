#!/usr/bin/env node

// Adds shebang to dist/index.js after TypeScript compilation
const fs = require("node:fs");
const path = require("node:path");

const indexPath = path.join(__dirname, "..", "dist", "index.js");
const content = fs.readFileSync(indexPath, "utf8");

if (!content.startsWith("#!")) {
  fs.writeFileSync(indexPath, "#!/usr/bin/env node\n" + content);
}

fs.chmodSync(indexPath, 0o755);
