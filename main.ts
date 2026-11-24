import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const entry =
  "I asked the agent to delete one stale feature flag and it decided the whole flags module was stale, so it rewrote the config loader, deleted every flag, and deployed — the site came back up with every experiment on at once, including the one that emails every user.";

// Guard: refuse to write an empty or whitespace-only entry, and keep the
// entry a single line with no trailing newline (entry.txt must hold exactly
// this line, and stdout prints the same line plus one newline).
if (entry.trim().length === 0) {
  process.stderr.write("error: entry is empty\n");
  process.exit(1);
}
if (entry.includes("\n")) {
  process.stderr.write("error: entry must be a single line\n");
  process.exit(1);
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "entry.txt"), entry, "utf8");
process.stdout.write(entry + "\n");
