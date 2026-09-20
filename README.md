# skills

Claude Code skills, installable one at a time.

```bash
npx @kumzha/skills                            # see what is here
npx @kumzha/skills add golden-set-council     # install one
npx @kumzha/skills add --all --project        # install everything, into this repo
```

Skills land in `~/.claude/skills/`, or in `./.claude/skills/` with `--project`. Start a new Claude Code session afterwards and they are available. No dependencies, and the skills ship inside the package, so installing is a local copy rather than a second download.

Prefer the whole collection, kept updated by Claude Code itself? This repo is also a plugin marketplace:

```
/plugin marketplace add Kumzha/skills
/plugin install kumzha-skills@kumzha-skills
```

## What is here

### golden-set-council

Build eval ground truth with two or more agents that annotate independently and then debate their disagreements into rules.

A golden set written by one judge is one opinion. When your system scores badly against it, you cannot tell whether the system is wrong, the gold is wrong, or the question is genuinely hard, and those three need opposite repairs. Two annotators separate them: their agreement rate is the honest ceiling on any single-judge gold of the same task, and it is invisible until the second annotator exists. On the run this was built from, two capable models reading the same material from the same brief agreed on **40%** of what they found.

The skill covers the corpus freeze, a brief that deliberately states no criteria, blinding, dispute packing, a three-round council (propose rules, reconcile the rule sets, apply and check), the merge, and validating the gold itself. It ships `council.mjs`, which runs the mechanical steps: `check`, `blind`, `diff`, `pack`, `merge`.

Verified against a real council rather than a fixture. Replaying two annotator sets reproduces that project's shipped gold exactly: 84 agreed, 126 disputed, 190 final units, 0 of 366 items differing.

[Read the skill](skills/golden-set-council/SKILL.md)

## CLI

```
npx @kumzha/skills                    list the skills in this collection
npx @kumzha/skills add <name...>      install them
npx @kumzha/skills add --all          install everything
npx @kumzha/skills remove <name...>   delete them again

  --project, -p     install into ./.claude/skills instead of ~/.claude/skills
  --dir <path>      install somewhere else entirely
  --force, -f       replace a skill that is already there
```

Before the npm package exists, or to run the version on `main` rather than the published one:

```bash
npx github:Kumzha/skills add golden-set-council
```

## Adding a skill to this collection

1. Make `skills/<name>/SKILL.md` with YAML frontmatter carrying `name` and `description`. The description is what a model reads to decide whether the skill applies, so write it for that job: say what it does and name the phrases that should trigger it.
2. Put anything else the skill needs beside it. `references/` for documents it loads on demand, `scripts/` for tools it runs.
3. Bump `version` in `package.json`, and mention the skill in this README and in `.claude-plugin/marketplace.json`.

The CLI needs no registry or index. It lists whatever directories under `skills/` contain a `SKILL.md`, so a new skill is picked up as soon as it exists.

## Licence

MIT.
