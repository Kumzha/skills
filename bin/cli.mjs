#!/usr/bin/env node
/**
 * Copy skills out of this package into a Claude Code skills directory.
 *
 *   npx @kumzha/skills                    list
 *   npx @kumzha/skills add <name...>      into ~/.claude/skills
 *   npx @kumzha/skills add --all -p       into ./.claude/skills
 *
 * The skills ship inside the package, so `add` is a local copy: no second
 * download, and the listing cannot disagree with what gets installed.
 */

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = join(ROOT, 'skills');
const argv = process.argv.slice(2);
const has = (...f) => f.some((n) => argv.includes(n));
const words = argv.filter((a) => !a.startsWith('-'));
const dest = has('--project', '-p') ? resolve('.claude/skills') : join(homedir(), '.claude', 'skills');

const skills = readdirSync(SKILLS)
  .filter((n) => statSync(join(SKILLS, n)).isDirectory() && existsSync(join(SKILLS, n, 'SKILL.md')))
  .sort();

/** The first sentence of the frontmatter description, for the listing. */
function summary(name) {
  const text = readFileSync(join(SKILLS, name, 'SKILL.md'), 'utf8');
  const line = /^description:\s*(.*)$/m.exec(text.slice(0, text.indexOf('\n---', 3)))?.[1] ?? '';
  const end = line.indexOf('. ');
  return end > 0 ? line.slice(0, end + 1) : line;
}

if (words[0] !== 'add') {
  console.log('\nSkills in this package:\n');
  for (const name of skills) console.log(`  ${name}\n    ${summary(name)}\n`);
  console.log(`  npx @kumzha/skills add ${skills[0]}`);
  console.log(`  installs into ${dest}, or ./.claude/skills with --project\n`);
  process.exit(0);
}

const wanted = has('--all') ? skills : words.slice(1);
if (!wanted.length) {
  console.error('\n  Name a skill, or pass --all.\n');
  process.exit(1);
}

mkdirSync(dest, { recursive: true });
let n = 0;
console.log('');
for (const name of wanted) {
  /* A name is a directory under skills/ and nothing else: no traversal, no
     absolute paths, no reaching outside the package. */
  if (basename(name) !== name || !skills.includes(name)) {
    console.log(`  ${name}: not in this package`);
    continue;
  }
  const into = join(dest, name);
  if (existsSync(into) && !has('--force', '-f')) {
    console.log(`  ${name}: already there, pass --force to replace`);
    continue;
  }
  rmSync(into, { recursive: true, force: true });
  cpSync(join(SKILLS, name), into, { recursive: true });
  console.log(`  ${name} -> ${into}`);
  n++;
}
console.log(n ? `\n  ${n} installed. Start a new Claude Code session to pick up.\n` : '\n  Nothing installed.\n');
