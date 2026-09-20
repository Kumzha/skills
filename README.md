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

- build an eval benchmark from scratch, for anything that extracts fields, retrieves passages, flags content, classifies intent or decides what an agent does next
- check a gold that one LLM judge wrote, which otherwise means your benchmark measures agreement with that model
- decide whether a prompt, model or pipeline change is actually an improvement
- choose between models for a labelling step
- write down a standard that until now only existed in people's heads, since the council's output is a numbered rule set argued from real examples
- produce annotation guidelines before paying humans to label at scale

It suits work where a miss costs more than a false positive, and contested lines where two careful readers genuinely disagree, because there the disagreement is the finding rather than noise to average away.

The skill covers the corpus freeze, a brief that deliberately states no criteria, blinding, dispute packing, the three-round council, the merge, and validating the gold itself. It ships `council.mjs` for the mechanical steps: `check`, `blind`, `diff`, `pack`, `merge`.

It came out of a real benchmark, where two capable models reading the same material from the same brief agreed on 40% of what they found. That number is the ceiling on any single-judge gold of a comparable task, and it is invisible until a second annotator exists.

[Read it](skills/golden-set-council/SKILL.md)

## Adding one

Drop `skills/<name>/SKILL.md` in, with `name` and `description` in the frontmatter, and put anything it needs beside it. The CLI lists whatever directory under `skills/` has a `SKILL.md`, so there is no index to keep in sync.

MIT.
