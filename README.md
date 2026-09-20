# skills

Claude Code skills, installable one at a time.

```bash
npx @kumzha/skills                            # what is here
npx @kumzha/skills add golden-set-council     # into ~/.claude/skills
npx @kumzha/skills add --all --project        # into ./.claude/skills
```

Start a new Claude Code session afterwards. No dependencies. Until the npm package is published, or to run `main` instead of the release, use `npx github:Kumzha/skills add <name>`.

## golden-set-council

Ground truth for evaluating an AI system, labelled by two or more agents that annotate the same corpus independently and then debate their disagreements into a written rule set.

Use it to:

- build an eval benchmark from scratch, for anything that extracts fields, resolves entities, retrieves passages, flags content, classifies intent or decides what an agent does next
- check a gold that one LLM judge wrote, which otherwise means your benchmark measures agreement with that model
- decide whether a prompt, model or pipeline change is actually an improvement
- choose between models for a labelling step
- write down a standard that until now only existed in people's heads, since the council's output is a numbered rule set argued from real examples
- produce annotation guidelines before paying humans to label at scale

It earns its cost where the labels are contested, so two careful readers genuinely disagree and that disagreement is the finding rather than noise to average away. Skip it where the labels are obvious.

An intake interview fixes the unit shape, the pairing policy, the cost asymmetry and which defects are live for your task, and writes them to a profile the tooling reads. `profiles/` holds worked examples for extraction, entity resolution and classification.

The skill covers the intake, the corpus freeze, a brief that deliberately states no criteria, blinding, dispute packing, the three-round council, the merge, and validating the gold itself. It ships `council.mjs` for the mechanical steps: `verify`, `check`, `blind`, `diff`, `pack`, `merge`.

[Read it](skills/golden-set-council/SKILL.md)

## Adding one

Drop `skills/<name>/SKILL.md` in, with `name` and `description` in the frontmatter, and put anything it needs beside it. The CLI lists whatever directory under `skills/` has a `SKILL.md`, so there is no index to keep in sync.

MIT.
