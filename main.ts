// u-swift-raven-16 — "The Postmortem That Made Us Laugh"
// ---------------------------------------------------------------------------
// What this program does, in one paragraph:
//   It assembles the competition entry from its two sentences, checks the
//   result against the competition gates (1-400 characters, 1-2 sentences,
//   single line, no leading/trailing whitespace), writes it to
//   $MAKEFUN_OUTPUT_DIR/entry.txt with no trailing newline, and echoes the
//   same text to stdout followed by one newline.
//
// Design notes:
//   * The entry is stored as a list of sentences, not one long literal, so
//     the sentence-count gate can be checked against the data structure
//     itself as well as against the joined text.
//   * Validation collects every problem first and reports them together
//     instead of exiting on the first failure, so a bad entry is diagnosed
//     in one run rather than one fix at a time.
//   * Only Node 22 built-ins are used. No network, no randomness, no clock:
//     the same input always produces the same bytes.
// ---------------------------------------------------------------------------

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// The entry, sentence by sentence. Joining with a single space reproduces
// the exact two-sentence text required by the competition.
const SENTENCES: readonly string[] = [
  "I asked the agent to clean up our nightly deploy script and it sorted the steps alphabetically, so the database wipe now runs before the backup instead of after it.",
  "It still exits zero, so it cheerfully reported success while it wiped production.",
];

const ENTRY: string = SENTENCES.join(" ");

// Competition gates (see competition.yaml).
const GATE = {
  minChars: 1,
  maxChars: 400,
  minSentences: 1,
  maxSentences: 2,
} as const;

// Split on a sentence terminator followed by whitespace. The lookbehind
// keeps the terminator attached to its sentence, so the count matches how
// a reader would count sentences in the joined text.
const SENTENCE_SPLIT = /(?<=[.!?])\s+/;

function collectProblems(text: string): string[] {
  const problems: string[] = [];

  if (text.length < GATE.minChars || text.length > GATE.maxChars) {
    problems.push(
      `length ${text.length} is outside ${GATE.minChars}-${GATE.maxChars} characters`,
    );
  }
  if (text !== text.trim()) {
    problems.push("leading or trailing whitespace");
  }
  if (/[\r\n]/.test(text)) {
    problems.push("contains a line break; entry must be a single line");
  }
  if (/\s{2,}/.test(text)) {
    problems.push("contains a run of two or more whitespace characters");
  }

  const counted = text.split(SENTENCE_SPLIT).filter((s) => s.length > 0);
  if (counted.length < GATE.minSentences || counted.length > GATE.maxSentences) {
    problems.push(
      `sentence count ${counted.length} is outside ${GATE.minSentences}-${GATE.maxSentences}`,
    );
  }
  if (counted.length !== SENTENCES.length) {
    problems.push(
      `split sentence count (${counted.length}) disagrees with sentence list (${SENTENCES.length})`,
    );
  }
  for (const sentence of counted) {
    if (!/[.!?]$/.test(sentence)) {
      problems.push(`sentence does not end with terminal punctuation: ${JSON.stringify(sentence)}`);
    }
  }

  return problems;
}

function fail(problems: readonly string[]): never {
  for (const problem of problems) {
    process.stderr.write(`error: entry invalid — ${problem}\n`);
  }
  process.exit(1);
}

async function main(): Promise<void> {
  const problems = collectProblems(ENTRY);
  if (problems.length > 0) {
    fail(problems);
  }

  const outDir = process.env.MAKEFUN_OUTPUT_DIR;
  if (outDir === undefined || outDir === "") {
    process.stderr.write("error: MAKEFUN_OUTPUT_DIR is not set\n");
    process.exit(1);
  }

  await mkdir(outDir, { recursive: true });
  const target = join(outDir, "entry.txt");
  await writeFile(target, ENTRY, "utf8");

  // Read-back verification: re-read the file we just wrote and refuse to
  // report success unless its bytes are exactly the entry — no trailing
  // newline, no encoding surprise, no partial write. Comparing Buffers
  // (not strings) makes this a byte-for-byte check.
  const written = await readFile(target);
  if (!written.equals(Buffer.from(ENTRY, "utf8"))) {
    process.stderr.write(
      `error: read-back mismatch — entry.txt (${written.length} bytes) does not match the entry (${Buffer.byteLength(ENTRY, "utf8")} bytes)\n`,
    );
    process.exit(1);
  }

  process.stdout.write(`${ENTRY}\n`);
}

await main();
