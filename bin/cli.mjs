#!/usr/bin/env node
/**
 * Install skills from this collection into a Claude Code skills directory.
 *
 *   npx @kumzha/skills                       list what is here
 *   npx @kumzha/skills add <name...>         install into ~/.claude/skills
 *   npx @kumzha/skills add --all --project   install all into ./.claude/skills
 *   npx @kumzha/skills remove <name>
 *
 * The skills ship inside the package, so `add` is a local copy: no network, no
 * git, and nothing that can go stale between the listing and the install.
 */

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = join(ROOT, 'skills');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

const argv = process.argv.slice(2);
const has = (...names) => names.some((n) => argv.includes(n));
const flagValue = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
/* Bare words, minus anything that is the value of --dir. */
const words = argv.filter((a, i) => !a.startsWith('-') && argv[i - 1] !== '--dir');

/* ── where skills go ────────────────────────────────────────────────────── */

function target() {
  const dir = flagValue('--dir');
  if (dir) return resolve(dir);
  if (has('--project', '-p')) return resolve('.claude/skills');
  return join(homedir(), '.claude', 'skills');
}

/* ── what is in the box ─────────────────────────────────────────────────── */

function available() {
  if (!existsSync(SKILLS)) return [];
  return readdirSync(SKILLS)
    .filter((n) => !n.startsWith('.') && statSync(join(SKILLS, n)).isDirectory())
    .filter((n) => existsSync(join(SKILLS, n, 'SKILL.md')))
    .sort()
    .map((name) => ({ name, ...frontmatter(join(SKILLS, name, 'SKILL.md')) }));
}

/** Enough YAML for `name:` and `description:`; a description may be long and folded. */
function frontmatter(file) {
  const text = readFileSync(file, 'utf8');
  if (!text.startsWith('---')) return {};
  const end = text.indexOf('\n---', 3);
  if (end < 0) return {};
  const out = {};
  let key = null;
  for (const line of text.slice(3, end).split('\n')) {
    const m = /^([a-zA-Z_-]+):\s*(.*)$/.exec(line);
    if (m) {
      key = m[1];
      out[key] = m[2].trim();
    } else if (key && line.trim()) out[key] += ` ${line.trim()}`;
  }
  return out;
}

const firstSentence = (s = '') => {
  const t = s.replace(/^["']|["']$/g, '');
  const cut = t.indexOf('. ');
  return cut > 0 ? t.slice(0, cut + 1) : t;
};

function wrap(text, width, indent) {
  const out = [];
  let line = '';
  for (const word of (text || '').split(/\s+/)) {
    if ((line + word).length > width) {
      out.push(line.trimEnd());
      line = '';
    }
    line += `${word} `;
  }
  if (line.trim()) out.push(line.trimEnd());
  return out.join(`\n${indent}`);
}

/* ── commands ───────────────────────────────────────────────────────────── */

function list() {
  const skills = available();
  console.log(`\n${pkg.name} v${pkg.version}\n`);
  if (!skills.length) {
    console.log('  No skills in this package.\n');
    return;
  }
  const where = target();
  for (const s of skills) {
    console.log(`  ${s.name}${existsSync(join(where, s.name)) ? '   (installed)' : ''}`);
    console.log(`    ${wrap(firstSentence(s.description), 74, '    ')}\n`);
  }
  console.log(`  installs into ${where}\n`);
  console.log(`    npx ${pkg.name} add ${skills[0].name}`);
  console.log(`    npx ${pkg.name} add --all --project\n`);
}

function add(names) {
  const skills = available();
  const wanted = has('--all') ? skills.map((s) => s.name) : names;
  if (!wanted.length) {
    console.error('\n  Name a skill, or pass --all.');
    list();
    process.exit(1);
  }
  const where = target();
  mkdirSync(where, { recursive: true });

  let installed = 0;
  let skipped = 0;
  console.log('');
  for (const name of wanted) {
    /* A name is a directory under skills/ and nothing else: no traversal, no
       absolute path, no reaching outside the package. */
    if (basename(name) !== name || !skills.some((s) => s.name === name)) {
      console.log(`  ${name}: not in this collection`);
      skipped++;
      continue;
    }
    const dest = join(where, name);
    if (existsSync(dest) && !has('--force', '-f')) {
      const managed = existsSync(join(dest, '.git'));
      console.log(`  ${name}: already there${managed ? ' (a git checkout)' : ''}, pass --force to replace`);
      skipped++;
      continue;
    }
    if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
    cpSync(join(SKILLS, name), dest, { recursive: true });
    console.log(`  ${name} -> ${dest}`);
    installed++;
  }
  if (installed) {
    const it = installed > 1 ? 'them' : 'it';
    console.log(`\n  ${installed} installed. Start a new Claude Code session to pick ${it} up.\n`);
  } else {
    console.log(`\n  Nothing installed${skipped ? ` (${skipped} skipped)` : ''}.\n`);
  }
}

function remove(names) {
  if (!names.length) {
    console.error('\n  Name a skill to remove.\n');
    process.exit(1);
  }
  const where = target();
  console.log('');
  for (const name of names) {
    if (basename(name) !== name) {
      console.log(`  ${name}: not a skill name`);
      continue;
    }
    const dest = join(where, name);
    if (!existsSync(dest)) {
      console.log(`  ${name}: not installed in ${where}`);
      continue;
    }
    rmSync(dest, { recursive: true, force: true });
    console.log(`  removed ${dest}`);
  }
  console.log('');
}

function help() {
  const repo = /github\.com\/([^/.]+\/[^/.]+)/.exec(pkg.repository?.url ?? '')?.[1] ?? 'Kumzha/skills';
  console.log(`
${pkg.name} v${pkg.version}
${pkg.description}

  npx ${pkg.name}                    list the skills in this collection
  npx ${pkg.name} add <name...>      install them
  npx ${pkg.name} add --all          install everything
  npx ${pkg.name} remove <name...>   delete them again

Options
  --project, -p     install into ./.claude/skills instead of ~/.claude/skills
  --dir <path>      install somewhere else entirely
  --force, -f       replace a skill that is already there
  --help, -h        this
  --version, -v

This repo is also a Claude Code plugin marketplace, if you would rather take the
whole collection at once and let Claude Code keep it updated:

  /plugin marketplace add ${repo}
`);
}

const cmd = words[0];
if (has('--help', '-h')) help();
else if (has('--version', '-v')) console.log(pkg.version);
else if (!cmd || cmd === 'list' || cmd === 'ls') list();
else if (cmd === 'add' || cmd === 'install' || cmd === 'i') add(words.slice(1));
else if (cmd === 'remove' || cmd === 'rm' || cmd === 'uninstall') remove(words.slice(1));
else {
  console.error(`\n  Unknown command: ${cmd}`);
  help();
  process.exit(1);
}
