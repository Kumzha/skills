# Template: the annotator brief

Hand this file, filled in and byte-identical, to each annotator. Placeholders are in `<ANGLE BRACKETS>`. Delete this header block before sending.

Do not add criteria. Every instinct while filling this in will be to help by saying what counts. Resist it. Where the line falls is the thing being discovered, and an annotator told where it is can only demonstrate that it follows instructions.

---

# Build a golden set: <THE QUESTION, AS A SENTENCE>

You are one of <N> independent annotators. The other is a different model working from this same file, and neither of you will be told which set is whose. Your job is to read <THE ITEMS> and write down, for each one, <THE UNIT, what is being labelled>.

Nothing here tells you where the line is. That is the thing being discovered, and <N> annotators handed the same criteria would only be measuring whether they can follow instructions.

---

## What this is for

<WHAT THE SYSTEM DOES, CONCRETELY, AND WHO USES IT. An annotator needs the stakes to judge a borderline case. Two paragraphs, plain.>

The promise is <THE ONE THING IT MUST NOT FAIL AT>. <Why a miss is invisible to the user and therefore worse than it looks.>

<Why the opposite error is not free either: what it costs, and by what route it kills the product.>

So the two errors are not symmetric. Roughly: one <MISS> is worth about <N> <FALSE POSITIVES>. When a case is genuinely balanced, <WHICH WAY IT GOES>.

## The question, and the one it is not

For each item: <THE QUESTION>?

It is not <THE NEIGHBOURING QUESTION THAT WILL BE CONFUSED WITH IT>. <Name what gets decided elsewhere, whether that is importance, ranking, urgency or routing, and say that something small and dull qualifies exactly as much as something large.>

So <THE WRONG REASON> is never a reason to leave something out. The only reason is that <THE ACTUAL TEST FAILS>.

## Closing

A unit stops belonging on the list when it is <DISCHARGED / RESOLVED / SATISFIED>, meaning <what that concretely means here>.

<The thing that looks like closure and is not.> People <stop, move on, go quiet> for every reason under the sun, and almost none of them is <the one you would infer>.

<Which error to prefer when closure is uncertain, and what each one costs.>

One limit of this method you should know: the corpus is <WHAT IT HOLDS> and nothing else. <What happens off the record.> The <RECORD> is the only evidence there is, so where it does not show <CLOSURE>, treat it as <STILL OPEN> rather than guessing from silence.

---

## The data

`<PATH>` is a frozen harvest of <WHAT>. It does not change.

- `elements.ndjson`, one element per line: `id`, `itemId`, `at`, `who`, `text`, `<OWNER FLAG>`
- `items.ndjson`: `id`, `<GROUPING FIELDS>`, `kind`
- `<ANY MAPPING FILE: ids to names, and so on>`

Judge only <THE SCOPE>, between <FROM> and <TO>. That is <N> items and about <N> elements. Find them by <HOW TO SELECT THEM>.

<If the material is private, real, or in more than one language, say so here: read it, quote short fragments in your reasoning where they make the point, and do not reproduce whole items anywhere.>

## What to write

One JSON object per line, one line per item, including the ones where there is nothing, which will be most of them.

```jsonc
{
  "itemId": "…",
  "units": [
    {
      "label": "<THE UNIT>",                  // under 12 words
      "party": "<WHO IT INVOLVES>",
      "direction": "<A>",                     // or "<B>"
      "elementIds": ["…", "…"],               // every element that is part of it
      "openedBy": "…",                        // the element that started it
      "settledBy": "…",                       // where it closed, or null
      "confidence": 0.85,                     // 0 to 1, your own
      "why": "one sentence, quoting the words that decided it"
    }
  ]
}
```

`"units": []` is a normal answer and the commonest correct one.

`direction` is `<A>` when <…> and `<B>` when <…>.

Every id must be real, copied from the corpus rather than invented. `openedBy` must appear in `elementIds`.

Write to `<PATH>/<THE FILENAME YOU WERE GIVEN>.ndjson`. Append as you go rather than holding everything in memory: <N> items is more than one pass of attention, and a crash should not cost the lot.

## Afterwards, briefly

Write a short note in `method-note.md`, half a page rather than an essay, on the method rather than the entries:

- Is `settledBy` a sound idea, or does it force a call the material does not support?
- Does one unit per opening element match how these things actually behave, or is the shape wrong?
- Anything that would make somebody distrust a benchmark built this way.

Do this after the dataset, not while building it. A theory formed halfway through will quietly steer the second half, and the whole point of there being <N> of you is that your readings are independent, including of your own conclusions.
