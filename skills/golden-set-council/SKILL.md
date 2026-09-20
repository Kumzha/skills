---
name: golden-set-council
description: Build a golden set, meaning ground truth for evaluating an AI system, labelled by two or more agents that annotate the same corpus independently and then debate their disagreements into a written rule set. Use it to create an eval benchmark from scratch, to check or replace a gold that one LLM judge wrote, to decide whether a prompt, model or pipeline change is an improvement, to choose between models for a labelling step, to pin down a standard nobody has written down yet, or to produce annotation guidelines before paying humans to label at scale. Fits classification, extraction, retrieval relevance, agent behaviour and moderation, and any task where missing something costs more than flagging something extra. Triggers on "golden set", "gold standard", "ground truth", "eval dataset", "evaluation benchmark", "labelled data", "inter-annotator agreement", "adjudication", "LLM judge", "annotation guidelines", "agent council".
---

# Golden set by council

A golden set written by one judge is one opinion. When your system scores badly against it, you cannot tell whether the system is wrong, the gold is wrong, or the question is genuinely hard. Those three need opposite repairs.

This method separates them. Two or more agents annotate the same corpus independently from an identical brief, the disagreements get measured instead of smoothed away, and only the disputes go to a debate whose output is a set of rules. The rules are what you keep. The verdicts expire with the corpus.

The debate is usually the largest piece of work, so run this when the benchmark will decide product changes. For a throwaway sanity check, one judge is fine, as long as you never quote its absolute numbers.

## What it is for

Any evaluation where the truth is a set of things rather than a single right answer, and where you cannot simply assume the labels are correct:

- **Building an eval benchmark from scratch**, for a system that extracts fields, retrieves passages, flags content, classifies intent, or decides what an agent should do next. Nothing a score says means anything until the labels underneath it are trustworthy.
- **Checking a gold you already have.** If one model wrote your ground truth, you have been measuring agreement with that model. A second annotator tells you how much of your benchmark is opinion.
- **Deciding whether a change is an improvement.** A frozen corpus and a stable gold are what let you compare a new prompt, a new model or a rewritten pipeline against the old one and believe the difference.
- **Choosing a model for a labelling step.** Run the same prompt through candidates against the same gold. The cheap model sometimes wins, and without ground truth you cannot tell.
- **Writing down a standard that only exists in people's heads.** The council's output is a numbered rule set arguing from real examples, which is often the first precise statement of what the product is supposed to do. It outlives the corpus and the verdicts.
- **Producing annotation guidelines** before paying humans to label at scale. The rules and the disputes that produced them are the guideline, and they cost two agent runs instead of a pilot round.
- **Regression protection.** Once the gold exists, a rules change that quietly makes things worse becomes visible.

It suits work where a miss costs more than a false positive: contract clauses, obligations in correspondence, medical or billing codes, safety and policy labelling, anything where the thing you failed to surface never complains. It suits contested lines too, where two careful readers genuinely disagree, because the disagreement is the finding rather than an annoyance to average away.

Skip it when the labels are obvious and uncontested, or when the eval is a throwaway sanity check. One judge is fine there, as long as you never quote its absolute numbers.

## Vocabulary

The method is domain-free and these three words carry it.

| word | what it is | examples |
|---|---|---|
| item | the thing an annotator reads whole and judges | a conversation, a document, a ticket, a PR, a call transcript |
| element | the addressable piece inside an item | a message, a paragraph, a line, a turn, a span |
| unit | one thing being labelled, anchored to elements | an obligation, a clause, a defect, a claim, an intent, an entity |

The system under test produces units. The gold holds units. Scoring is a join between them.

## Decision zero: what makes a unit, and what the join is

Settle this before anybody annotates. It determines everything downstream.

Anchor every unit to element ids and score by set membership: the unit's `openedBy` element plus every element belonging to it. Then:

| situation | verdict |
|---|---|
| a produced unit anchored in no gold unit | noise (false positive) |
| a gold unit with no produced unit anchored in it | miss (false negative) |
| two produced units in one gold unit | duplicate |
| one produced unit spanning two gold units | over-merge |
| a produced unit still open past the gold's `settledBy` | lived too long |

Five defect families fall out of that for free, and deterministically. The same run scored twice gives the same number, so a difference between two versions of the system was caused by the change.

The obvious alternative is to show a model a produced unit and a gold unit and ask whether they are the same thing. It handles paraphrase, but it costs a model call per unit and makes the scoreboard non-reproducible, so two runs of an unchanged system disagree and somebody loses a day to it. Take the id join. Its known weakness is under [Facts that bite](#facts-that-bite).

The gold's shape, one JSON object per line, one line per item:

```jsonc
{"itemId": "…", "units": [{
  "label":      "under 12 words",            // what the unit is
  "party":      "who it involves",           // optional, domain's own word
  "direction":  "a | b",                     // the halves, if the task has two
  "elementIds": ["…", "…"],                  // every element belonging to it
  "openedBy":   "…",                         // the element that started it; must be in elementIds
  "settledBy":  "… | null",                  // where it ended, if visible
  "confidence": 0.85,
  "why":        "one sentence, quoting the words that decided it"
}]}
```

`"units": []` must be a normal, common answer. An item with nothing in it is data.

## The phases

### 1. Freeze the corpus

Copy it to an immutable directory and never write to it again. Every number the bench prints is against that snapshot. A corpus that moves makes two runs incomparable and you will not notice.

Freeze it as a read. Never drive the production ingest path to build it, or you put the corpus's contents into the live system and change the behaviour you are trying to measure.

If the source ages data out, freeze early. Every day of delay costs a day of history.

### 2. Write the brief, and state no criteria

`references/annotator-brief.md` is the template. The rule that matters:

> The brief must not say where the line is. That is the thing being discovered, and an annotator told where the line is can only demonstrate that it follows instructions.

What the brief does state:

- What the labelled thing is for, concretely. An annotator needs the stakes to judge a borderline case.
- The cost asymmetry, as a ratio ("one miss is worth about four false positives"), and which way a genuine tie goes.
- The closing rule: what evidence ends a unit, and that a topic going quiet is not evidence of anything.
- The limits of the record, and that silence there is not proof.
- The exact output shape, the scope, and where to write.
- Write incrementally, appending per item. A long annotation run will be interrupted, and a crash must not cost the lot.

It ends by asking for a method note, written afterwards rather than during, on the method rather than the entries. A theory formed halfway through steers the second half, and independence is the point. Those notes are where the shape's real failures surface, as they did in the run at the bottom of this file.

### 3. Run the annotators independently

Use different models, or at minimum separate sessions with no shared context. Two runs of one model on one prompt measure that prompt's variance, which is worth knowing and is covered under validation, but it is not a second opinion.

No communication, no peeking at each other's output, and neither is told which set will be whose. Same brief file byte for byte, same scope, same window.

Let each annotator choose its own working method. One may read directly while another builds a paging harness. That difference is not contamination. A shared criterion is.

### 4. Check, blind, diff

```bash
node scripts/council.mjs check a.ndjson --elements corpus.ndjson --scope items.txt
node scripts/council.mjs check b.ndjson --elements corpus.ndjson --scope items.txt
node scripts/council.mjs blind a.ndjson b.ndjson --out ./consensus
node scripts/council.mjs diff  --out ./consensus --direction <the half to dispute>
```

Run `check` first, always. A fabricated element id, an `openedBy` outside its own unit, an item silently skipped: each one becomes a phantom disagreement later, and by then it looks like a difference of opinion. Fix them before blinding.

`blind` shuffles the two sets into `set_1` and `set_2` and writes the mapping somewhere nothing else reads. Authorship bias is the one contaminant a consensus process cannot survive. An annotator who knows which set is its own defends rather than judges, and every close call goes the same way.

`diff` pairs units across the sets and prints the agreement rate. Treat that number as a finding. It is the honest ceiling on any single-judge gold of the same task. Pairing is by shared anchor or by near-identical wording, because two readings of one unit routinely blame a different element for it, and anchor-only matching would charge them for a difference they do not have.

### 5. The council: three rounds

`references/council-protocol.md` is the template to hand both agents.

```bash
node scripts/council.mjs pack --out ./consensus --elements corpus.ndjson --context 12
```

`pack` renders each dispute legibly: the surrounding elements, names resolved, the claim one side made, and what the other side found in that same item. It randomises the A/B label per dispute. Blinding by filename does not survive a hundred items, because an annotator recognises its own phrasing once and then knows which column is itself for all the rest. Shuffling per item removes the thread to follow.

Both agents write into one shared file, alternating, each reading what is already there before writing.

**Round 1, rules.** Read the disputes and do not adjudicate them one by one. A hundred arguments is not a method and will not generalise. Work out what the disagreements are about instead. Where does one reading consistently see a unit and the other consistently not? Name those patterns as rules, sharp enough that somebody else applying them to an unseen item would get the same answer. Each rule lists the disputes it settles and which way.

**Round 2, reconcile.** Two rule sets written blind will contradict each other. Start by listing every pair of rules that conflict: a pair conflicts when there is a real dispute they decide differently, and if you cannot name one, you are inventing a disagreement. Each conflict lands on exactly one of four outcomes. Adopt theirs, saying what changed your mind. Adopt yours, saying why theirs fails on a specific item. Write a third rule that covers both sets of cases, in full. Or record it unresolved, with the precise question that would settle it.

"Both are valid in different contexts" is not an outcome unless the boundary is sharp enough to sort every affected dispute by it. That phrasing is how two readers agree without agreeing, and it produces a rule set that decides nothing when Round 3 applies it. Argue from the material and quote it.

End the round with one consolidated numbered rule set, ratified by both, superseding every earlier version. Round 3 is applied mechanically from that list, so a stale copy sitting in the file propagates straight into the verdicts.

**Round 3, apply and check.** One agent writes the verdicts and the other reads them against the agreed rules, flagging every one it would have decided differently. The checker is checking the application, not the argument. Wanting to re-litigate a rule means that rule was never agreed and belongs in the unresolved list.

```jsonc
{"id": "d001", "verdict": "yes", "rule": "C3", "note": "state — one line, quoting the evidence"}
```

Ask for `rule: "none"` where an item needed no rule and was simply obvious. A rule set that only covers the hard cases is worth knowing about, and roughly a tenth of the disputes usually need no rule at all.

Keep `verdict` and `note` separate. `verdict` is inclusion in the gold; `note` carries the state (open, completed, conditional, transferred, elapsed, cancelled) and the evidence for it. One nullable pointer cannot hold three different reasons a unit ended.

An honest unresolved beats a false agreement. Unresolved items go to whoever owns the domain and are cheap for them to settle. A rule both agents nodded at and neither believes is not.

### 6. Merge

```bash
node scripts/council.mjs merge --out ./consensus --elements corpus.ndjson \
  --scope items.txt --verdicts verdicts.ndjson [--dupes dupes.json]
```

Seven things are load-bearing. `references/merge-and-validate.md` has the argument for each.

1. Every scoped item gets a row, `units: []` included. A scorer builds its judged set from the rows present, so an item left out does not read as an invented unit. It quietly removes a false-positive opportunity and makes the noise rate look better than it is.
2. An agreed pair's element ids are unioned. Both readings read the same item and the pairing has already ruled them one unit, so the union is strictly the more forgiving set.
3. `openedBy` is the earlier of the two, and `settledBy` drops to `null` when the readings disagree about whether it ever closed. That is the brief's asymmetry applied.
4. Verdict ids are positions in `disputes.json`, so `diff` and `merge` must share one pairing function. Re-pair the sets any other way and every verdict silently lands on a different unit.
5. Only the disputed half was adjudicated. Whatever `diff --direction` did not pack is one annotator's unreviewed opinion. Emit it only behind a flag, and say so wherever the numbers are quoted.
6. Duplicates inside an item are merged mechanically. Duplicates across items are applied only from a file somebody ratified, each group quoting the sentence that ratified it, with a `notGroups` list recording the pairs the council explicitly keeps apart. A wording matcher cannot tell one unit in three items from three units, and it is blind to dates, so two occurrences of a recurring thing look identical to it.
7. Anchors are protected. The union can put one unit's anchor inside a neighbour's context list, and a scorer then finds two gold units for one produced unit and books an over-merge plus a miss for something the system got right. The anchor wins and the neighbour gives the id up. Whatever survives that, an element genuinely belonging to two units, is real ambiguity and gets reported as the ceiling on the join rather than fudged.

### 7. Validate the gold before trusting a number off it

Four checks, cheapest first. Detail in `references/merge-and-validate.md`.

**Self-agreement.** Re-run one annotator over the same corpus with the same prompt. Whatever the two passes disagree about is irreducible: it is the annotator's own variance, it is in the gold already, and no system can score above it. Measure the instrument before believing what it measures.

**Calibration against a real human signal.** Find an action in production that means "this was wrong", such as a dismissal, an undo or a rejected suggestion, and check the gold agrees with it. Where this was done, the gold and the users landed within five points of each other, which is what made everything else the bench said believable.

**An independent validator.** A third agent, a brief that again states no criteria, and one closing question: would you use this dataset to decide whether a change to the product was an improvement? Ask it to state its sampling method, because a sample drawn only from the entries that look wrong cannot say how often the gold is right.

**The strictness offset.** A model judge usually runs stricter than a human auditor. Where both exist, measure the gap, then trust the deltas and discount the absolute. Both arms share the judge, so a difference between them is real even when the level is not.

## More than two annotators

Everything above except the tooling generalises. With N:

- Agreement is pairwise. Report the matrix rather than one number. The agreed core is what all N found, and anything short of unanimous is a dispute.
- Disputes multiply. Three annotators on the measured task would have produced roughly twice the pack. Budget the debate, not the annotation.
- Do not resolve by majority. A vote produces answers, and the council produces rules, which is what outlives the corpus. Majority also hides a systematic blind spot that two models share.
- Seat two debaters rather than N. Rounds 1 and 2 collapse under many voices. Either run the council pairwise and reconcile the rule sets afterwards, or seat two and give the rest a Round 3 checking role.
- The bundled script is pairwise. For N, run `diff` on each pair and union the disputes before packing, then re-key the verdict ids once against the combined pack.

## Facts that bite

- A brief that states criteria measures instruction-following. This is the method's hinge.
- Check before blinding. Structural faults masquerade as disagreements.
- Blind per item, not per file. One recognised phrase otherwise unblinds the rest.
- Match by anchor or by wording. Anchor-only overstates disagreement, and counting units per item matches two different things merely because each side found two.
- The scoring join has a known weakness: when the system opens a unit from a later element than the one the annotator anchored to, the same unit scores as noise and as a miss. That is why the gold lists every element belonging to a unit rather than just its ends, and why the near-miss examples must be printed. If those examples are full of produced units whose opening element is plainly part of a gold unit, widen the gold rather than fixing the system.
- Method notes come after the dataset. Written during, they steer the second half.
- Ask what the annotators disagreed about, not who was right. A tenth of the disputes in one run were not a disagreement at all: the brief never said whether to record units that existed and were then discharged, so one annotator kept them and the other left them out. Look for that class first. It is a brief defect, and one rule settles all of them.
- A "settled" field is sparser than the prose notes. Annotators record discharge in `note` more often than they fill `settledBy`, so any metric keyed on it reads conservative. Do not synthesise the id: a settlement nobody wrote down is not evidence.
- Closure often lands outside the item that opened it, which breaks the implied one-item-one-unit shape. Expect ids pointing elsewhere, and expect to miss some.
- One opening element can open several units, and units can span items. The one-unit-per-opening shape can be wrong a third of the time. Split independently actionable units, and say so in the brief.
- Run the script. A clean typecheck is not a working script. While this skill's own tool was being built, a constant was declared below the loop that read it, and the temporal-dead-zone error was swallowed by a parse-tolerant `try/catch`. The corpus loaded silently empty, every headline number still came out right, and two anchors came out wrong. Tolerate only a bad input line, and never wrap the callback.

## Where this came from

The method and every rule of thumb here were paid for on one real corpus: a fortnight of one person's messages, two annotators working blind, and a live product whose benchmark until then had been a single judge.

The number worth carrying away is that the two readings agreed on **40%** of what they found. Two capable models, one brief, the same material. That is the honest ceiling on any single-judge gold of a comparable task, and it is invisible until a second annotator exists. Expect your own figure to be lower than feels reasonable.

The council settled the rest into twelve rules, and the gold that came out was half as large again as the single judge's. The units it added were real work the old benchmark had been scoring as noise. Expect that shape: a more complete gold moves your noise rate down and your miss rate up, and neither number moves in the direction anybody hoped.

Each annotator got exactly one of the two hardest rules wrong at the start, in opposite directions. Neither would have found its own error alone.
