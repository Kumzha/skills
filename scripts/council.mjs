#!/usr/bin/env node
/**
 * The agent council, mechanised: two annotators' sets in, one consensus gold out.
 *
 *   node council.mjs check  a.ndjson --elements corpus.ndjson
 *   node council.mjs blind  a.ndjson b.ndjson --out ./consensus
 *   node council.mjs diff   --out ./consensus
 *   node council.mjs pack   --out ./consensus --elements corpus.ndjson
 *   node council.mjs merge  --out ./consensus --verdicts verdicts.ndjson [--dupes dupes.json]
 *
 * Shapes. One JSON object per line, one line per ITEM (a conversation, a
 * document, a ticket — whatever the annotators read whole):
 *
 *   {"itemId": "…", "units": [{ label, party, direction, elementIds[],
 *                               openedBy, settledBy, confidence, why }]}
 *
 * `threadId`/`topics`/`what`/`who`/`messageIds` are accepted as aliases, so a
 * set written against a domain brief that used those words needs no rewriting.
 *
 * The ELEMENTS file (optional, needed by `check` and `pack`) is the frozen
 * corpus: one line per element with `id`, `itemId`, `at`, `who`, `text`,
 * `isFromOwner`  (aliases: threadId, sentAt, senderName, isFromUser).
 *
 * Every step's reasoning is in the skill's SKILL.md; the comments here mark
 * only the places where an innocent-looking change silently corrupts the gold.
 */

import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { basename, join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const [mode = 'diff', ...rest] = argv.filter((a) => !a.startsWith('--'));
const flag = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const has = (k) => argv.includes(`--${k}`);

const OUT = resolve(flag('out', './consensus'));
/* Which half of a two-sided task the council argues about. Unset = every
   direction is packed, which is right for a one-sided task; a two-sided task
   names the half being adjudicated, and merge then reports the other half as
   unreviewed rather than passing it off as consensus. */
const DISPUTED = flag('direction', null);
const disputed = (d) => DISPUTED === null || d === DISPUTED;
const DIRLABEL = DISPUTED ?? 'all';
mkdirSync(OUT, { recursive: true });

async function eachLine(file, fn) {
  if (!existsSync(file)) return;
  const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let row;
    /* Tolerate ONLY a bad line — a crashed annotator's last, half-written row.
       Wrapping fn() in here too silently eats real errors: an earlier version
       did, and a corpus that never loaded looked exactly like a corpus with no
       timestamps in it. */
    try { row = JSON.parse(line); } catch { continue; }
    fn(row);
  }
}

/* ── the canonical shape, and the aliases real briefs produce ───────────── */

const itemIdOf = (r) => String(r.itemId ?? r.threadId ?? '');
const unitsOf = (r) => r.units ?? r.topics ?? [];
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z ]/g, '').trim();
const unit = (u) => ({
  label: u.label ?? u.what ?? '',
  party: u.party ?? u.who,
  direction: u.direction,
  elementIds: u.elementIds ?? u.messageIds ?? [],
  openedBy: u.openedBy,
  settledBy: u.settledBy ?? null,
  confidence: u.confidence ?? 0,
  why: u.why ?? '',
});

async function loadSet(file) {
  const out = new Map();
  await eachLine(file, (o) => {
    const id = itemIdOf(o);
    if (id) out.set(id, { itemId: id, units: unitsOf(o).map(unit) });
  });
  return out;
}

/* ── the corpus ─────────────────────────────────────────────────────────── */

const FROM = flag('from');
const TO = flag('to');
const elementsFile = flag('elements');
const byItem = new Map();
const elemById = new Map();
if (elementsFile) {
  await eachLine(resolve(elementsFile), (raw) => {
    const e = {
      id: String(raw.id ?? ''),
      itemId: String(raw.itemId ?? raw.threadId ?? ''),
      at: String(raw.at ?? raw.sentAt ?? ''),
      who: raw.who ?? raw.senderName ?? raw.senderId ?? '',
      text: raw.text ?? '',
      isFromOwner: Boolean(raw.isFromOwner ?? raw.isFromUser),
      quoted: raw.quoted,
    };
    if (!e.id || !e.itemId) return;
    if (FROM && e.at.slice(0, 10) < FROM) return;
    if (TO && e.at.slice(0, 10) >= TO) return;
    byItem.set(e.itemId, [...(byItem.get(e.itemId) ?? []), e]);
    elemById.set(e.id, e);
  });
  for (const l of byItem.values()) l.sort((a, b) => a.at.localeCompare(b.at));
}
const at = (id) => (id ? (elemById.get(id)?.at ?? '') : '');

/** The items that MUST carry a row. Anything outside it is out of scope; */
/** anything inside it and absent is an item somebody silently skipped.   */
function scopeIds(sets) {
  const f = flag('scope');
  if (f) return new Set(readFileSync(resolve(f), 'utf8').split('\n').map((s) => s.trim()).filter(Boolean));
  if (byItem.size) return new Set(byItem.keys());
  return new Set(sets.flatMap((s) => [...s.keys()]));
}

/* ── matching: one obligation, however each reading worded it ───────────── */

/** Longest-common-subsequence ratio, difflib's shape. */
function ratio(a, b) {
  if (!a.length || !b.length) return 0;
  let prev = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    prev = cur;
  }
  return (2 * prev[b.length]) / (a.length + b.length);
}
const bigrams = (s) => {
  const w = s.split(/\s+/).filter(Boolean);
  return new Set(w.length < 2 ? w : w.slice(0, -1).map((t, i) => `${t} ${w[i + 1]}`));
};
/** Anchor OR near-identical wording. Two readings of one obligation routinely */
/** blame a different line for it; anchor-only counts that as disagreement.    */
function sameThing(a, b) {
  if (a.openedBy && a.openedBy === b.openedBy) return true;
  const x = norm(a.label), y = norm(b.label);
  if (!x || !y) return false;
  const gx = bigrams(x), gy = bigrams(y);
  let hit = 0;
  for (const g of gx) if (gy.has(g)) hit++;
  if ((2 * hit) / (gx.size + gy.size) >= 0.5) return true;
  /* Bigrams miss a paraphrase that keeps the nouns and rewrites around them. */
  return ratio(x, y) >= 0.55;
}

/**
 * Pair one item's units across the two readings.
 * `diff` and `merge` MUST call this same function: the verdict ids are
 * POSITIONS in disputes.json, so re-pairing any other way lands every verdict
 * on a different obligation, silently.
 */
function pairUnits(t1, t2) {
  const taken = new Set();
  const pairs = [], only1 = [];
  for (const x of t1) {
    const i = t2.findIndex((y, j) => !taken.has(j) && sameThing(x, y));
    if (i >= 0) { taken.add(i); pairs.push({ a: x, b: t2[i] }); } else only1.push(x);
  }
  return { pairs, only1, only2: t2.filter((_, j) => !taken.has(j)) };
}

/* ── check ──────────────────────────────────────────────────────────────── */

function check(file, set, scope) {
  const problems = [];
  const missing = [...scope].filter((t) => !set.has(t));
  const extra = [...set.keys()].filter((t) => !scope.has(t));
  if (missing.length) problems.push(`${missing.length} items not judged at all`);
  if (extra.length) problems.push(`${extra.length} items outside the scope`);

  let units = 0, badId = 0, wrongItem = 0, anchorOutside = 0, badDirection = 0;
  for (const [id, r] of set) {
    for (const u of r.units) {
      units++;
      if (elemById.size) {
        for (const e of [...u.elementIds, u.openedBy, ...(u.settledBy ? [u.settledBy] : [])]) {
          if (!e) continue;
          if (!elemById.has(e)) badId++;
          else if (elemById.get(e).itemId !== id) wrongItem++;
        }
      }
      if (u.openedBy && u.elementIds.length && !u.elementIds.includes(u.openedBy)) anchorOutside++;
      if (!u.direction) badDirection++;
    }
  }
  if (badId) problems.push(`${badId} element ids that do not exist in the corpus`);
  if (wrongItem) problems.push(`${wrongItem} ids belonging to a different item`);
  if (anchorOutside) problems.push(`${anchorOutside} units whose openedBy is not in their own elementIds`);
  if (badDirection) problems.push(`${badDirection} units with no direction`);

  const owed = [...set.values()].flatMap((r) => r.units).filter((u) => disputed(u.direction)).length;
  console.log(`\n${basename(file)}\n  ${set.size} items · ${units} units (${owed} ${DIRLABEL})\n` +
    `  ${[...set.values()].filter((r) => r.units.length).length} items hold at least one\n`);
  if (problems.length) {
    console.log('  PROBLEMS');
    for (const p of problems) console.log(`    · ${p}`);
    console.log('\n  Fix these before blinding: every one becomes a phantom disagreement later.\n');
  } else console.log('  No structural problems.\n');
  return problems;
}

/* ── run ────────────────────────────────────────────────────────────────── */

if (mode === 'check') {
  const file = resolve(rest[0] ?? '');
  if (!existsSync(file)) { console.error(`No such file: ${file}`); process.exit(1); }
  const set = await loadSet(file);
  process.exit(check(file, set, scopeIds([set])).length ? 1 : 0);
}

if (mode === 'blind') {
  const [a, b] = rest.map((p) => resolve(p));
  if (!a || !b || !existsSync(a) || !existsSync(b)) { console.error('blind needs two existing files'); process.exit(1); }
  const [setA, setB] = [await loadSet(a), await loadSet(b)];
  const scope = scopeIds([setA, setB]);
  check(a, setA, scope); check(b, setB, scope);
  const flip = Math.random() < 0.5;
  writeFileSync(join(OUT, 'set_1.ndjson'), readFileSync(flip ? a : b));
  writeFileSync(join(OUT, 'set_2.ndjson'), readFileSync(flip ? b : a));
  writeFileSync(join(OUT, 'authorship.json'),
    JSON.stringify({ at: new Date().toISOString(), set_1: flip ? a : b, set_2: flip ? b : a }, null, 2));
  console.log(`Blinded.\n  ${join(OUT, 'set_1.ndjson')}\n  ${join(OUT, 'set_2.ndjson')}\n` +
    `  mapping → ${join(OUT, 'authorship.json')} (never show this to either annotator)\n`);
  process.exit(0);
}

if (mode === 'pack') {
  const disputesFile = join(OUT, 'disputes.json');
  if (!existsSync(disputesFile)) { console.error('Run "diff" first.'); process.exit(1); }
  const { disputes } = JSON.parse(readFileSync(disputesFile, 'utf8'));
  const namesFile = flag('names');
  const names = namesFile && existsSync(resolve(namesFile)) ? JSON.parse(readFileSync(resolve(namesFile), 'utf8')) : {};
  const nameOf = (id) => names[(id || '').split('@')[0]] ?? id;
  const legible = (t) => (t || '').replace(/@(\d{6,})/g, (_, d) => `@${names[d] ?? d}`);
  const CONTEXT = Number(flag('context', '12'));
  const OWNER = flag('owner-label', 'the owner');

  const out = disputes.map((d, i) => {
    const list = byItem.get(d.itemId) ?? [];
    const idx = list.findIndex((e) => e.id === d.openedBy);
    const from = Math.max(0, idx - CONTEXT);
    const lines = list.slice(from, Math.min(list.length, idx + 6)).map((e) => ({
      when: e.at.slice(0, 16).replace('T', ' '),
      who: e.isFromOwner ? OWNER : nameOf(e.who) || 'someone',
      text: legible(e.text) || '(no text)',
      replyingTo: e.quoted?.text ? legible(e.quoted.text).slice(0, 120) : undefined,
      isAnchor: e.id === d.openedBy,
    }));
    /* ONE COIN FLIP PER DISPUTE. Blinding by filename does not survive 126
       items — an annotator recognises its own phrasing once and then knows
       which column is itself for all the rest. */
    const flip = Math.random() < 0.5;
    return {
      id: `d${String(i + 1).padStart(3, '0')}`,
      about: d.party,
      ...(d.where ? { where: d.where } : {}),
      claim: { side: flip ? 'A' : 'B', unit: d.label, direction: d.direction, reasoning: d.why, confidence: d.confidence },
      otherSide: { side: flip ? 'B' : 'A', foundInThisItem: d.otherSaw.length ? d.otherSaw : ['nothing'] },
      context: lines,
    };
  });
  writeFileSync(join(OUT, 'pack.json'), JSON.stringify({ at: new Date().toISOString(), disputes: out }, null, 2));
  console.log(`\nWrote ${join(OUT, 'pack.json')} — ${out.length} disputes, sides randomised per item\n`);
  process.exit(0);
}

if (mode === 'merge') {
  const verdictsFile = resolve(flag('verdicts', join(OUT, 'verdicts.ndjson')));
  const disputesFile = join(OUT, 'disputes.json');
  const goldOut = resolve(flag('gold-out', join(OUT, 'gold.ndjson')));
  const includeUnpaired = has('include-unpaired-other');
  if (!existsSync(disputesFile)) { console.error('Run "diff" first — no disputes.json to key the verdicts against.'); process.exit(1); }
  if (!existsSync(verdictsFile)) { console.error(`No verdicts at ${verdictsFile}.`); process.exit(1); }

  const verdicts = new Map();
  await eachLine(verdictsFile, (v) => { if (v.id) verdicts.set(v.id, v); });

  const { disputes } = JSON.parse(readFileSync(disputesFile, 'utf8'));
  const dkey = (item, side, openedBy, label) => `${item} ${side} ${openedBy} ${norm(label)}`;
  const idOfDispute = new Map();
  disputes.forEach((d, i) => idOfDispute.set(dkey(d.itemId, d.foundBy, d.openedBy, d.label), `d${String(i + 1).padStart(3, '0')}`));

  const one = await loadSet(join(OUT, 'set_1.ndjson'));
  const two = await loadSet(join(OUT, 'set_2.ndjson'));
  if (!one.size || !two.size) { console.error(`No sets in ${OUT} — run "blind" first.`); process.exit(1); }

  const STATE_WORDS = ['elapsed', 'transferred', 'cancelled', 'conditional', 'completed', 'open'];
  const stateOfNote = (note) => {
    const head = (note || '').toLowerCase().split(/[—:]/)[0] ?? '';
    return STATE_WORDS.find((w) => head.includes(w.slice(0, 6)));
  };

  const settleDropped = [], ruledUnresolved = [], missingVerdict = [];
  const emittedById = new Map();
  let ruledNo = 0, unkeyed = 0, otherPaired = 0, otherOneSided = 0, statelessAdjudicated = 0;

  const mergePair = (a, b, item) => {
    const lead = b.elementIds.length > a.elementIds.length ? b : a;
    const openedBy = at(a.openedBy) && at(b.openedBy)
      ? (at(a.openedBy) <= at(b.openedBy) ? a.openedBy : b.openedBy)
      : a.openedBy || b.openedBy;
    /* Disagreement about discharge resolves to STILL OWED — the brief's
       asymmetry: keeping a finished thing costs a glance, closing a live one
       costs the thing itself. */
    let settledBy = null;
    if (a.settledBy && b.settledBy) settledBy = at(a.settledBy) >= at(b.settledBy) ? a.settledBy : b.settledBy;
    else if (a.settledBy || b.settledBy) settleDropped.push(`${item.slice(-14)} · ${lead.label}`);
    const ids = [...new Set([...a.elementIds, ...b.elementIds, openedBy, ...(settledBy ? [settledBy] : [])].filter(Boolean))];
    return {
      party: lead.party, label: lead.label, direction: lead.direction,
      elementIds: ids, openedBy, settledBy,
      confidence: Math.max(a.confidence, b.confidence), confidences: [a.confidence, b.confidence],
      why: lead.why, source: 'both',
    };
  };

  const scope = scopeIds([one, two]);
  const rows = [];
  for (const item of scope) {
    const row = { itemId: item, units: [] };
    const directions = new Set([...(one.get(item)?.units ?? []), ...(two.get(item)?.units ?? [])].map((u) => u.direction));
    for (const direction of directions) {
      const t1 = (one.get(item)?.units ?? []).filter((u) => u.direction === direction);
      const t2 = (two.get(item)?.units ?? []).filter((u) => u.direction === direction);
      const { pairs, only1, only2 } = pairUnits(t1, t2);
      for (const { a, b } of pairs) {
        row.units.push(mergePair(a, b, item));
        if (!disputed(direction)) otherPaired++;
      }
      const lone = [...only1.map((u) => [u, '1']), ...only2.map((u) => [u, '2'])];
      if (!disputed(direction)) {
        /* Never disputed, so never adjudicated: `diff` packs one direction. */
        otherOneSided += lone.length;
        if (includeUnpaired) for (const [u] of lone) row.units.push({ ...u, source: 'unadjudicated' });
        continue;
      }
      for (const [u, side] of lone) {
        const id = idOfDispute.get(dkey(item, side, u.openedBy, u.label));
        if (!id) { unkeyed++; continue; }
        const v = verdicts.get(id);
        if (!v) { missingVerdict.push(id); continue; }
        if (v.verdict === 'no') { ruledNo++; continue; }
        if (v.verdict !== 'yes') { ruledUnresolved.push(id); continue; }
        const state = stateOfNote(v.note ?? '');
        if (!state) statelessAdjudicated++;
        const emitted = {
          ...u,
          elementIds: [...new Set([...u.elementIds, u.openedBy, ...(u.settledBy ? [u.settledBy] : [])])],
          source: 'adjudicated', disputeId: id, rule: v.rule, note: v.note, ...(state ? { state } : {}),
        };
        row.units.push(emitted);
        emittedById.set(id, { row, unit: emitted });
      }
    }
    rows.push(row);
  }

  /* Dedupe INSIDE an item: two emitted units the pairing itself would call one
     obligation are one gold unit. Left as two, an engine can anchor in only
     one and the other scores as a miss nothing could have avoided. */
  let mergedInItem = 0;
  for (const row of rows) {
    const keep = [];
    for (const u of row.units) {
      const into = keep.find((k) => k.direction === u.direction && sameThing(k, u));
      if (!into) { keep.push(u); continue; }
      into.elementIds = [...new Set([...into.elementIds, ...u.elementIds])];
      if (at(u.openedBy) && at(u.openedBy) < at(into.openedBy)) into.openedBy = u.openedBy;
      if (!u.settledBy) into.settledBy = null;
      mergedInItem++;
    }
    row.units = keep;
  }

  /* An ANCHOR is the strongest claim a unit has on an element, so when the
     union puts a neighbour's anchor inside this unit's context, the neighbour
     wins and this unit gives the id up. Otherwise a scorer looks up the
     engine's opening element, finds two units, and books an over-merge plus a
     miss for something the engine got right. */
  let anchorsProtected = 0;
  for (const row of rows) {
    const anchors = new Set(row.units.map((u) => u.openedBy));
    for (const u of row.units) {
      const before = u.elementIds.length;
      u.elementIds = u.elementIds.filter((i) => i === u.openedBy || !anchors.has(i));
      anchorsProtected += before - u.elementIds.length;
    }
  }

  /* Cross-ITEM duplicates are applied only from a file somebody ratified —
     a wording matcher cannot tell one obligation in three conversations from
     three obligations. */
  let mergedAcross = 0;
  const groupsApplied = [];
  const dupesFile = flag('dupes');
  if (dupesFile) {
    const raw = JSON.parse(readFileSync(resolve(dupesFile), 'utf8'));
    const groups = Array.isArray(raw) ? raw : raw.groups.map((g) => g.ids);
    groupsApplied.push(...groups);
    for (const group of groups) {
      const hits = group.map((id) => emittedById.get(id)).filter(Boolean);
      if (hits.length < 2) continue;
      hits.sort((x, y) => at(x.unit.openedBy).localeCompare(at(y.unit.openedBy)));
      const survivor = hits[0];
      for (const h of hits.slice(1)) {
        survivor.unit.elementIds = [...new Set([...survivor.unit.elementIds, ...h.unit.elementIds])];
        if (!h.unit.settledBy) survivor.unit.settledBy = null;
        h.row.units = h.row.units.filter((x) => x !== h.unit);
        mergedAcross++;
      }
    }
  }

  /* Candidates are REPORTED, never acted on. Matching wording alone put 94
     pairs on this list, most of them nothing; and the matcher is blind to
     dates, so two occurrences of one weekly meeting look identical. Both must
     name a date or an amount, and they must agree. */
  const DATE = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(?:\s+\d{1,2})?|\b\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*|[€$]\s?\d[\d.,]*/gi;
  const marksIn = (s) => [...new Set((s.match(DATE) ?? []).map((d) => d.toLowerCase().replace(/\s+/g, ' ')))].sort();
  const wordedAlike = (a, b) => {
    const [x, y] = [bigrams(norm(a)), bigrams(norm(b))];
    if (!x.size || !y.size) return false;
    let hit = 0;
    for (const g of x) if (y.has(g)) hit++;
    return (2 * hit) / (x.size + y.size) >= 0.5;
  };
  const candidates = [];
  const already = new Set(groupsApplied.flat());
  const owedAll = rows.flatMap((r) => r.units.filter((u) => disputed(u.direction)).map((u) => ({ item: r.itemId, u })));
  for (let i = 0; i < owedAll.length; i++) {
    for (let j = i + 1; j < owedAll.length; j++) {
      const [a, b] = [owedAll[i], owedAll[j]];
      if (a.item === b.item || !wordedAlike(a.u.label, b.u.label)) continue;
      const [ma, mb] = [marksIn(a.u.label), marksIn(b.u.label)];
      if (!ma.length || !mb.length || !ma.some((x) => mb.includes(x))) continue;
      if (a.u.disputeId && b.u.disputeId && already.has(a.u.disputeId) && already.has(b.u.disputeId)) continue;
      candidates.push(`${a.u.disputeId ?? 'agreed'} + ${b.u.disputeId ?? 'agreed'}  ${a.u.label.slice(0, 44)}  |  ${b.u.label.slice(0, 44)}`);
    }
  }

  const stamp = new Date().toISOString();
  writeFileSync(goldOut, `${rows.map((r) => JSON.stringify({ ...r, judgedAt: stamp, model: 'consensus:two-annotator-round3' })).join('\n')}\n`);

  const all = rows.flatMap((r) => r.units);
  const owed = all.filter((u) => disputed(u.direction));
  const count = (s) => owed.filter((u) => u.source === s).length;
  console.log(`\n${'═'.repeat(70)}\n  THE CONSENSUS GOLD\n${'═'.repeat(70)}\n`);
  console.log(`  ${rows.length} items written, ${rows.filter((r) => r.units.length).length} holding a unit`);
  console.log(`  verdicts read from ${verdictsFile}\n`);
  console.log(`  ${owed.length} ${DIRLABEL} units`);
  console.log(`    ${count('both')} both readings found`);
  console.log(`    ${count('adjudicated')} disputed, the council ruled yes`);
  console.log(`    ${ruledNo} disputed, ruled no — dropped`);
  if (ruledUnresolved.length) console.log(`    ${ruledUnresolved.length} unresolved, dropped: ${ruledUnresolved.join(', ')}`);
  console.log(`\n  ${otherPaired} other-direction, both readings found`);
  console.log(`  ${otherOneSided} other-direction from one reading only — ${includeUnpaired ? 'INCLUDED, unadjudicated' : 'withheld (--include-unpaired-other)'}`);
  console.log(`\n  ${mergedInItem} duplicates merged inside an item` + (dupesFile ? `, ${mergedAcross} across items from ${dupesFile}` : ''));
  const ambiguous = rows.reduce((n, r) => {
    const seen = new Map();
    for (const u of r.units) if (disputed(u.direction)) for (const i of u.elementIds) seen.set(i, (seen.get(i) ?? 0) + 1);
    return n + [...seen.values()].filter((v) => v > 1).length;
  }, 0);
  console.log(`  ${anchorsProtected} context ids given up to a neighbour's anchor`);
  console.log(`  ${ambiguous} elements still belonging to two units — real ambiguity, and the ceiling on the join`);
  if (settleDropped.length) {
    console.log(`\n  ${settleDropped.length} where the readings differ on discharge, kept OPEN:`);
    for (const s of settleDropped.slice(0, 10)) console.log(`    · ${s}`);
  }
  if (statelessAdjudicated) console.log(`\n  ${statelessAdjudicated} adjudicated notes name no state — those carry no \`state\``);
  if (missingVerdict.length) console.log(`\n  NO VERDICT for ${missingVerdict.length}: ${missingVerdict.join(', ')}`);
  if (unkeyed) console.log(`\n  ${unkeyed} one-sided units matched no dispute — the pairing has drifted from disputes.json`);
  if (candidates.length) {
    console.log(`\n  ${candidates.length} cross-item duplicate CANDIDATES — same wording, same date or amount.`);
    for (const c of candidates.slice(0, 15)) console.log(`    · ${c}`);
  }
  console.log(`\n  ${owed.filter((u) => u.settledBy).length} of the ${owed.length} were discharged inside the window`);
  console.log(`\nWrote ${goldOut}\n`);
  process.exit(0);
}

/* ── diff ───────────────────────────────────────────────────────────────── */

const one = await loadSet(join(OUT, 'set_1.ndjson'));
const two = await loadSet(join(OUT, 'set_2.ndjson'));
if (!one.size || !two.size) { console.error(`Run "blind" first — no sets in ${OUT}`); process.exit(1); }

const disputes = [];
let both = 0, settleDiffer = 0;
for (const item of new Set([...one.keys(), ...two.keys()])) {
  const t1 = (one.get(item)?.units ?? []).filter((u) => disputed(u.direction));
  const t2 = (two.get(item)?.units ?? []).filter((u) => disputed(u.direction));
  const { pairs, only1, only2 } = pairUnits(t1, t2);
  both += pairs.length;
  for (const { a, b } of pairs) if (Boolean(a.settledBy) !== Boolean(b.settledBy)) settleDiffer++;
  const add = (u, side, other) => disputes.push({
    itemId: item, foundBy: side, party: u.party, where: '',
    label: u.label, direction: u.direction, why: u.why, confidence: u.confidence,
    openedBy: u.openedBy, otherSaw: other.map((x) => x.label),
  });
  for (const x of only1) add(x, '1', t2);
  for (const y of only2) add(y, '2', t1);
}
const union = both + disputes.length;
const pc = (x) => `${Math.round(x * 100)}%`;
console.log(`\n${'═'.repeat(70)}\n  TWO ANNOTATORS, ONE BRIEF\n${'═'.repeat(70)}\n`);
console.log(`  ${both} units both found`);
console.log(`  ${disputes.filter((d) => d.foundBy === '1').length} only in set_1`);
console.log(`  ${disputes.filter((d) => d.foundBy === '2').length} only in set_2`);
console.log(`\n  AGREEMENT ${pc(union ? both / union : 0)}`);
console.log(`  of the ${both} they agree on, ${settleDiffer} differ on whether it was ever discharged\n`);
writeFileSync(join(OUT, 'disputes.json'), JSON.stringify({ at: new Date().toISOString(), both, settleDiffer, disputes }, null, 2));
console.log(`Wrote ${join(OUT, 'disputes.json')} — ${disputes.length} disputed units\n`);
