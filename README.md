# Golden set by council

A method and a tool for building eval ground truth with two or more agents that annotate independently and then debate their disagreements into rules.

Packaged as a [Claude Code skill](https://docs.claude.com/en/docs/claude-code/skills), but the method is plain enough to run by hand with any model.

## The problem it solves

A golden set written by one judge is one opinion. When your system scores badly against it, you cannot tell whether the system is wrong, the gold is wrong, or the question is genuinely hard. Those three need opposite repairs, and nothing in a single-judge setup separates them.

Two annotators separate them. Their agreement rate is the honest ceiling on any single-judge gold of the same task, and it is invisible until the second annotator exists. On the run this was built from, two capable models reading the same material from the same brief agreed on **40%** of what they found.

## How it works

1. **Freeze the corpus.** Nothing writes to it again.
2. **Write a brief that states no criteria.** Where the line falls is the thing being discovered. Two annotators handed the same criteria only measure whether they can follow instructions.
3. **Run the annotators independently.** Different models, no shared context, neither told which set will be whose.
4. **Check, blind, diff.** Validate structure first, shuffle the sets so nobody knows which is theirs, then measure agreement and extract the disputes.
5. **Convene the council.** Three rounds: propose rules, reconcile the two rule sets, apply them. One agent applies, the other checks the application. The output is rules, not a hundred individual arguments.
6. **Merge.** Agreed units plus the disputes the council ruled in, with seven merge decisions that each exist because getting them wrong corrupts the gold silently.
7. **Validate the gold itself** before quoting a number off it.

`SKILL.md` is the full method. The three files in `references/` are the templates you hand the agents, plus the merge and validation detail.

## Install

As a user-level skill, available in every project:

```bash
git clone https://github.com/Kumzha/golden-set-council.git ~/.claude/skills/golden-set-council
```

Or project-level, checked in with the repo it serves:

```bash
git clone https://github.com/Kumzha/golden-set-council.git .claude/skills/golden-set-council
```

Update with `git pull` from wherever you put it.

## The tool

`scripts/council.mjs` runs the mechanical steps. Node 18 or later, no dependencies.

```bash
node scripts/council.mjs check a.ndjson --elements corpus.ndjson --scope items.txt
node scripts/council.mjs blind a.ndjson b.ndjson --out ./consensus
node scripts/council.mjs diff  --out ./consensus --direction user_owes
node scripts/council.mjs pack  --out ./consensus --elements corpus.ndjson --context 12
node scripts/council.mjs merge --out ./consensus --verdicts verdicts.ndjson --dupes dupes.json
```

It is domain-free. Items, elements and units are whatever your task labels: conversations and messages and obligations, documents and paragraphs and clauses, tickets and turns and promises. Field aliases mean a set written against a brief that used your domain's own words needs no rewriting.

## Is it verified

Yes, against a real council rather than a fixture. Replaying the two annotator sets from the run described above reproduces that project's shipped gold exactly: 84 agreed, 126 disputed, 40% agreement, 190 final units, and 0 of 366 items differing on label, anchor, element ids or closure.

Building it also produced one instructive bug, now a line in the skill's own "facts that bite": a constant declared below the loop that read it threw a temporal-dead-zone error that a parse-tolerant `try/catch` swallowed. The corpus loaded silently empty, every headline number still came out right, and two anchors came out wrong. Run the script. A clean typecheck is not a working script.

## Credit

The method came out of building a surfacing benchmark for a real product, where a single-judge gold had been quietly deciding whether changes were improvements. The numbers quoted throughout are from that run. No message content, names or private data are included anywhere in this repo.

MIT licensed.
