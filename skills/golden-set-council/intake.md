# Intake: build the profile before anything else

The method in `SKILL.md` is domain-free. The artefacts are not — the unit shape,
the pairing policy, the cost asymmetry and the live defect families all differ per
domain, and getting one wrong wastes the whole run.

So run this interview first. Six questions. Ask them, recommend an answer to each,
and write `profile.json`. Then echo the profile back and get it confirmed before a
single item is annotated.

Do not skip to the method because the domain "looks like" an earlier one. The two
tasks that look most alike — obligations in a thread and matching records across
sources — want opposite pairing policies.

---

## Question 0, and it is a gate

**What change will this benchmark greenlight or block?**

If that cannot be answered in one sentence, stop. The council is the expensive
part of this method and it is only worth it when a real decision waits on the
number. For a throwaway sanity check, one judge is fine, as long as nobody quotes
its absolute numbers.

Write the answer into `outcome`. Every later argument about a borderline case gets
settled by pointing at it.

---

## The six

**1. What does the system emit, and what would you hold it against?**

This is decision zero and everything else follows from it.

| the system emits | shape | what a unit is |
|---|---|---|
| pieces found inside an item | `extraction` | one found thing, anchored to elements |
| a choice from a candidate set | `entity-resolution` | the chosen candidate |
| a label for the whole item | `classification` | the label, anchored to the item |
| free text | — | **this method does not fit.** Use pairwise preference instead. |

→ sets `shape` and `unitSchema`.

**2. Is the anchor the answer, or a pointer to the answer?**

The highest-leverage question here, and the one most likely to be answered on
autopilot.

If the anchor *is* the answer — the chosen record, the retrieved document, the
predicted class — then two annotators who chose different anchors **disagree, by
definition**, and the policy is `anchor`.

If the anchor merely points at something two readers might blame on different
elements — an obligation one reader attributes to message 41 and the other to
message 43 — then `anchor-or-wording`.

If boundaries are genuinely fuzzy and partially overlapping, `overlap`.

→ sets `pairing`. Getting this wrong does not degrade gracefully: `anchor-or-wording`
on an entity-resolution task records real disagreements as agreement, inflating the
agreement rate and dropping the near-miss cases the council most needs.

**3. Can one annotator see every candidate at once?**

If no, the task is pool-bounded. Freeze a candidate pool as part of the corpus,
share it byte-identically between annotators, and denominate recall against it —
it is recall@K and must be quoted that way. An annotator who builds its own pool
has broken independence exactly where the headline number lives.

→ sets `pool`.

**4. Which error is worse, and roughly by how much?**

Both slots are free. Do not assume a miss is worse; in a system that acts on its
output, a false positive can be catastrophic and a miss merely costly. Ask what
each error does downstream, and whether either one is *self-correcting* — an error
that poisons future runs is worth far more than its immediate cost.

→ sets `errorCost`, which the brief quotes verbatim and the council uses to settle
genuine ties.

**5. In this domain, what is a definition and what is a judgement?**

The brief must not say where the line is — that is the thing being discovered.
But that rule applies to **judgements**, not to **definitions**. Withhold what
counts as a borderline case; state the terms of art. Withhold the definition of a
word the domain already fixes and Round 1 burns itself rediscovering a dictionary,
which is noise, not discovery.

→ sets what the brief states versus withholds.

**6. Is there an action in production that means "this was wrong"?**

A dismissal, an undo, a rejected suggestion, a reassignment. If one exists, the
calibration check in `merge-and-validate.md` can run against real human signal.

If none exists, record that — `"calibration": {"signal": null, "reason": "…"}` —
and drop the check rather than substituting something that looks like it. A missing
calibration signal is also a product finding: it usually means nobody can tell you
how often the system is wrong today.

→ sets `calibration`.

---

## Before you finish: name three pairs that must not pair

Every domain has near-misses that a careless policy collapses. Ask for three, with
one line each on why they differ, plus one pair that must pair despite differing
wording. Put them in `mustPair` / `mustNotPair` and run:

```bash
node scripts/council.mjs verify --profile ./profile.json
```

It exits non-zero if the policy disagrees with any of them. This costs a minute and
catches the class of error that otherwise surfaces as a suspiciously high agreement
rate three days later.

---

## The profile

```jsonc
{
  "name":        "…",
  "outcome":     "the change this benchmark decides",
  "shape":       "extraction | entity-resolution | classification",
  "unitSchema":  { "core": [...], "extensions": [...], "unused": [...] },
  "pairing":     "anchor | anchor-or-wording | overlap",
  "pool":        { "required": true, "k": 50 },
  "errorCost":   { "worse": "false-positive", "ratio": 10, "tieGoesTo": "exclude" },
  "liveDefects": ["noise", "miss", "duplicate", "over-merge"],
  "calibration": { "signal": null, "reason": "…" },
  "mustPair":    [ { "a": {...}, "b": {...}, "note": "…" } ],
  "mustNotPair": [ { "a": {...}, "b": {...}, "note": "…" } ]
}
```

`profiles/` holds worked examples: `extraction.json` (the original obligations run),
`entity-resolution.json`, `classification.json`. Start from the nearest and change
what the interview disagrees with — do not adopt one wholesale.

Every command takes `--profile`. Without one you get the extraction defaults, which
is the right behaviour for the task this method was first built on and the wrong
behaviour for yours.
