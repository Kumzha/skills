# Merging the council's output, and validating the gold itself

## Part 1: the merge

`scripts/council.mjs merge` produces the gold file. Here is what it does and why each choice is load-bearing. The comments in the script repeat the short form; this is the argument.

### Every scoped item gets a row

Including `units: []`. A scorer builds its set of judged items from the rows present and files anything produced in an unlisted item as unscorable. An item left out of the gold therefore does not read as "the system invented something here". It silently removes a false-positive opportunity and makes the noise rate look better than it is. Pass the scope explicitly with `--scope` rather than deriving it from whatever the annotators happened to write.

### An agreed pair becomes one unit carrying the union of both element lists

The scoring join is set membership: a produced unit matches a gold unit when its opening element is in the gold unit's ids. The known weakness is a system that opens from a later element than the annotator anchored to, which scores one thing as noise and as a miss. Both readings read the same item and the pairing has already ruled them one unit, so the union is strictly the more forgiving set, and it cannot merge two units the pairing kept apart.

### `openedBy` is the earlier, and `settledBy` drops to null on disagreement

Earlier anchor, because a unit begins when it begins. Where one reading saw closure and the other did not, the merged unit is open: the brief's asymmetry applied, since closing something still live costs the thing itself while keeping something already finished costs a glance. Where both saw closure but on different elements, take the later one, which is the earliest moment both readings accept it was done.

### Verdict ids are positions, so `diff` and `merge` share one pairing function

`d001` is "the first dispute `disputes.json` lists" and nothing more. Any change to the pairing has to be checked by re-running `diff` and comparing the list item for item. Re-pair the sets another way and every verdict silently lands on a different unit, with no error anywhere. The script keys each dispute by item, side, `openedBy` and normalised label, so a verdict can only ever land on the unit it was cast about, and it reports any one-sided unit that matches no dispute as the pairing having drifted.

### Only the disputed half was adjudicated

`diff --direction` packs one half of a two-sided task. The other half's agreed pairs are real, since both readings found them, but its one-sided units are one annotator's unreviewed opinion and stay withheld unless `--include-unpaired-other` says otherwise. Whatever gets read off that half is a single opinion, and every number quoted from it has to say so.

### Duplicates: mechanical inside an item, ratified across items

Inside an item, two emitted units the pairing itself would call one unit get merged. Left as two, a produced unit can anchor in only one and the other scores as a miss nothing could have avoided.

Across items, no matcher can find them. Measured: one unit reached three items with three different counterparts, and two distinct units sat under two people with the same name. Grouping by counterpart missed the real ones. Dropping the grouping put 94 pairs on the list, nearly all of them nothing. And wording matching is blind to dates, so two occurrences of a recurring thing look identical, and merging those deletes a real unit.

So cross-item groups come from a hand-written file whose every group quotes the sentence that ratified it, and whose `notGroups` records the pairs the council explicitly keeps apart so nobody merges them later:

```jsonc
{
  "groups": [
    {"ids": ["d104", "d106"], "why": "ANNOTATOR-2, Round 2: 'd104/d106 are one <X>'. Same <date>, two items."}
  ],
  "notGroups": [
    {"ids": ["d095", "d096"], "why": "Two occurrences; identical wording apart from the date."}
  ]
}
```

The script still reports candidates as a list to check by hand, requiring both matching wording and a shared date or amount. It never acts on them.

### Anchors are protected, and what is left is reported

Bringing two readings into one file puts units side by side that were never together, and the union widens what each one holds, so an element that one unit opened on can end up inside its neighbour's context list. A scorer then finds two gold units for one produced unit and books an over-merge plus a miss for something the system got right. Measured: 5 such collisions inside either reading, and 28 once they were merged.

An anchor is the strongest claim a unit has on an element, so it wins and the neighbour gives the id up. What remains is an element genuinely belonging to two units, which is real ambiguity. The script prints the count, and that number is the ceiling on the join.

## Part 2: validating the gold

A gold nobody checked is a gold that will be optimised towards. Four checks.

### 1. Self-agreement, or measuring the instrument

Re-run one annotator over the same corpus with the same prompt and compare the two passes. Whatever they disagree about is irreducible: it is the annotator's own variance, it is in the gold already, and no system can score above it.

This is what separates "the gold is poor" from "the question is genuinely hard", which have opposite repairs and are otherwise indistinguishable. If the two passes agree 95% of the time, a 68% agreement with a human auditor is about the human. If they agree 70%, the benchmark is soft and every delta under thirty points is weather.

Compare by anchor or by near-identical wording rather than by anchor alone, because two passes over the same unit often blame a different element for it. State the similarity threshold alongside the number: it moves the answer a few points, and hiding it makes the figure unreproducible.

### 2. Calibration against a real human signal

Find an action real users take that means "this was wrong", such as a dismissal, an undo, a rejection or a deletion, and check the gold against it. Those are the highest-precision human labels available and they cost nothing to collect.

Two cautions, both paid for. The join must be sharp: a structural join, matching on the same item, the same counterpart and a few days, asks "does this item contain a unit", which is not the question. An item can hold a real unit and a wrong output about something else, and a coarse join calls that agreement. In the measured run, sharpening the join changed 122 of 315 verdicts, and the same signal read 29% coarse against 77% sharp. Second, say what the join cannot do: where production ids and gold ids cannot be joined exactly, the headline number should be the narrow, high-confidence subset, with the wide number underneath as a sanity check rather than as the result.

A disagreement rate here is not a failure. It is the width of the error bar on everything else the bench says.

### 3. An independent validator

A third agent, a brief that again states no criteria, and the raw corpus. Ask it to form its own view of what belongs, compare that against the gold, and answer:

1. Where is the gold wrong, and in which direction? Does it invent units, miss them, or both? Quantified on its sample.
2. Is it wrong in a pattern? A randomly noisy benchmark and a systematically biased one need different repairs. If there is a pattern, name it precisely enough that somebody could write a rule against it.
3. Where is the gold ambiguous rather than wrong? Those cases are the ceiling on what any system can score and must not be counted as product defects.
4. Is the closure field reliable?
5. Anything else that would make a person distrust this benchmark.

Then, plainly: would you use this dataset to decide whether a change to the product was an improvement? If not, what would have to change first.

Make it state its sampling method and why, because a sample drawn only from entries that look wrong cannot say how often the gold is right. Say explicitly that finding problems is not more useful than finding none, and is only more useful if the problems are real.

### 4. The strictness offset

A model judge usually runs stricter than a human auditor doing the same job. Where both exist, measure the gap and quote it. In the measured run the judge was about 13 points stricter over 287 matched cases, with the disagreement lopsided at 67 one way against 29 the other, and correcting for it brought the bench's estimate within one point of an independent hand audit.

Two independent instruments landing in the same place is the strongest evidence a benchmark can offer. Until then, trust the deltas, since both arms share the judge and a difference between them is real, and discount the absolute, quoting the hand audit wherever the absolute matters.

## Part 3: reporting a number off this gold

- Every rate carries an interval. A miss rate resting on nine judged elements is not a number, and it will be quoted as one.
- Report a per-stratum breakout rather than only a total. Different slices of a corpus fail in different ways, and a total hides one of them getting worse.
- If the sample was stratified, weight it. Sampling 150 of 1,146 positives and 150 of 9,121 negatives at the same rate overstates precision roughly eightfold. Scope the population to what the sample was drawn from, too: a shared cache that grows mid-session moves every rate on the page with zero new judgements.
- Run a noise-floor arm, meaning the unchanged system measured again. Any delta smaller than that floor is the measurement moving rather than the change. In the measured run the floor was 8 points.
- Cache keys have to cover the inputs as well as the prompt. If facts are fed alongside the prompt, a changed fact file leaves the prompt hash identical while changing every prompt's content, and the run silently measures as having done nothing.
