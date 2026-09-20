# Template: the three-round council

This is the file both agents write into. Fill in the placeholders, paste the round headings at the bottom, and start one agent as `ANNOTATOR-1` and the other as `ANNOTATOR-2`. Delete this header block before sending.

Both agents read the whole file before writing. They alternate. Neither is told which reading is its own.

---

# Two readings disagree. Work out which is right, and why.

<N> annotators read the same <N> items from the same brief and wrote down <THE UNIT>. They agreed on <N> and disagreed about <N>.

You are one of them. The other will read this same file. Neither of you is told which reading is yours, and in `pack.json` the two sides are labelled A and B with the labels reshuffled on every single dispute, so recognising your own phrasing on one item tells you nothing about the next.

That is deliberate. The question is not whose reading was better. It is what the right answer is.

---

## What you are deciding

For each disputed item: <THE QUESTION, IDENTICAL TO THE BRIEF'S>?

Not <THE NEIGHBOURING QUESTIONS>. Only whether <THE TEST>.

The two errors are not equal. <The asymmetry, in the brief's own terms.> Roughly: one <MISS> is worth about <N> <FALSE POSITIVES>. Genuine ties <GO WHICH WAY>.

<The thing that looks like closure and is not.> And the record is <WHAT IT HOLDS> only, so <what happens off it> is never written down. Where the record does not show <CLOSURE>, it did not happen.

## The files

- `pack.json`, the <N> disputes. Each one carries the material around it, rendered legibly, the claim one reading made, and what the other reading found in that same item, which is sometimes nothing.
- `corpus/`, the full frozen harvest, if you want to look wider than the excerpt.
- `<ANY MAPPING FILE>`

## How this runs

Three rounds. You and the other annotator alternate, and each of you writes your turn into this file under the heading for that round, signed `ANNOTATOR-1` or `ANNOTATOR-2`, whichever you are told you are when you are started.

Read what is already in this file before writing. If the other annotator has already had a turn in the round you are in, you are responding to it.

### Round 1: what rules would settle these?

Read the disputes. Do not adjudicate them one by one, because <N> arguments is not a method and it will not generalise.

Work out what the disagreements are about instead. Where does one reading consistently see a unit and the other consistently not? Name those patterns as rules, sharp enough that somebody else applying them to an item you have not seen would get the same answer you would.

Write your rules, each with the disputes it would settle and which way.

### Round 2: reconcile

Two rule sets written blind will contradict each other. Find where, and settle it. Agreement is not the goal. A correct rule set is, and the fastest way to get a wrong one is for both of you to be agreeable.

Start by listing every pair of rules that conflict. A pair conflicts when there is a dispute in `pack.json` they would decide differently. If you cannot name such a dispute, they do not conflict and you are inventing a disagreement. If you can, name it.

For each conflicting pair, land on one of exactly four outcomes:

- Adopt theirs, and say what changed your mind.
- Adopt yours, and say why theirs fails on a specific item.
- Write a third rule that covers both sets of cases, stated in full.
- Record it unresolved, with the precise question that would settle it.

"Both are valid in different contexts" is not an outcome unless you state the boundary sharply enough to sort every affected dispute by it. That phrasing is how two readers agree without agreeing, and it produces a rule set that decides nothing when it is applied in Round 3.

Argue from the material. Quote it. A rule that survives because it sounds principled and was never tested against a disputed item is worth nothing.

Where you genuinely cannot resolve something, say so plainly and say what the open question is. A clearly stated disagreement is a better outcome than a false agreement. Those go to <WHOEVER OWNS THE DOMAIN> and are cheap for them to settle, while a rule you both nodded at and neither believes is not.

End Round 2 with one consolidated, numbered rule set, ratified by both, that supersedes both Round 1 proposals and every intermediate version. Round 3 is applied mechanically from it, so a stale list sitting in the file propagates straight into the verdicts.

### Round 3: apply

One of you applies and the other checks. Whoever is asked to go first writes the verdicts, and the other then reads them against the agreed rules and flags every one it would have decided differently. Do not both write the file. When you are checking, you are checking the application rather than reopening the argument: if you find yourself wanting to re-litigate a rule, that rule was not actually agreed in Round 2 and belongs in the unresolved list instead.

Take the agreed rules and go through all <N> disputes. For each one, record `yes` if it belongs in the gold, `no` if it does not, or `unresolved` where the rules genuinely do not decide it.

Write them to `verdicts.ndjson`, one per line:

```jsonc
{"id": "d001", "verdict": "yes", "rule": "C3", "note": "state — one line, quoting the evidence"}
```

`rule` is which of the agreed rules decided it. If an item needs no rule and was just obvious, say so with `"rule": "none"`. A rule set that only covers the hard cases is worth knowing about.

`verdict` means inclusion. `note` carries the state, one of <open, completed, conditional, transferred, elapsed, cancelled>, and the evidence for it. One flag cannot hold three different reasons a unit ended.

## One thing to keep hold of

You are looking for the rules, not the answers. The <N> verdicts are worth something until this corpus goes stale. The rules are worth something permanently, because they are what the product should be doing, written down. If you find yourself settling an item in a way no rule could have predicted, that is a signal the rule set is incomplete rather than that the item is special.

---

## <IF THE BRIEF WAS AMBIGUOUS, NAME IT HERE AND SAVE A ROUND>

<Before Round 1, read a sample of the disputes yourself. Where the two readings answered subtly different questions because the brief did not say which was wanted, say so here and say how many disputes it accounts for. In the measured run this was 14 of 126: one reading recorded every unit that existed during the window and marked the ones it saw close, while the other recorded only what was still open at the end. That is not a disagreement about whether the thing qualified, and left unnamed it eats a whole round.>

Which shape is right is worth one of your rules. Decide it, say so, and apply it consistently to those <N>.

---

## ROUND 1: proposed rules

<!-- ANNOTATOR-1 then ANNOTATOR-2 -->

## ROUND 2: reconciliation

<!-- alternating until both ratify one consolidated rule set -->

## ROUND 3: applied

<!-- one applies and writes verdicts.ndjson; the other checks the application -->

## FINAL STATE: authoritative summary

<!-- Written after closure. Changes no verdict and reopens no rule. Where any count
     earlier in this file differs, this section governs; in-thread tallies are left in
     place as the audit trail. Record the verdict file's checksum, verified by both,
     the rule set and where it was ratified, the counts by state, the items that needed
     no rule, and the limits carried deliberately. -->
