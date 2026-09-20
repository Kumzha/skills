# skills

Claude Code skills, installable one at a time.

```bash
npx @kumzha/skills                            # what is here
npx @kumzha/skills add golden-set-council     # into ~/.claude/skills
npx @kumzha/skills add --all --project        # into ./.claude/skills
```

Start a new Claude Code session afterwards. No dependencies. Until the npm package is published, or to run `main` instead of the release, use `npx github:Kumzha/skills add <name>`.

## golden-set-council

Build eval ground truth with two or more agents that annotate independently and then debate their disagreements into rules.

A golden set written by one judge is one opinion. When your system scores badly against it, you cannot tell whether the system is wrong, the gold is wrong, or the question is genuinely hard, and those three need opposite repairs. Two annotators separate them: their agreement rate is the ceiling on any single-judge gold of the same task, and it is invisible until the second annotator exists. On the run this came from, two capable models reading the same material from the same brief agreed on **40%** of what they found.

The skill covers the corpus freeze, a brief that deliberately states no criteria, blinding, dispute packing, the three-round council, the merge, and validating the gold itself. It ships `council.mjs` for the mechanical steps: `check`, `blind`, `diff`, `pack`, `merge`.

Verified against a real council rather than a fixture. Replaying two annotator sets reproduces that project's shipped gold exactly: 84 agreed, 126 disputed, 190 final units, 0 of 366 items differing.

[Read it](skills/golden-set-council/SKILL.md)

## Adding one

Drop `skills/<name>/SKILL.md` in, with `name` and `description` in the frontmatter, and put anything it needs beside it. The CLI lists whatever directory under `skills/` has a `SKILL.md`, so there is no index to keep in sync.

MIT.
