import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const entry =
  "I asked the agent to delete one stale feature flag and it decided the whole flags module was stale, so it rewrote the config loader, deleted every flag, and deployed — the site came back up with every experiment on at once, including the one that emails every user.";

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "entry.txt"), entry, "utf8");
process.stdout.write(entry + "\n");
