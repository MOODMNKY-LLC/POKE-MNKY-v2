# Jev pilot results

Generated: 2026-11-02T01:34:37.515Z

Provider: **Vercel AI Gateway** (`vercel-ai-gateway`)
Model: `typesafe-ai/jev`
Base URL: `https://ai-gateway.vercel.sh/typesafe`
Fixtures: `fixtures/s7-battle-results.anon.json` (49 messages, 38 labeled results)

## Accuracy

| Task | Metric | Value |
| --- | --- | --- |
| Message class (result vs other) | accuracy | 98.0% (48/49) |
| Organizer review (result rows) | accuracy vs non-OK flags | 84.2% (32/38) |
| Score/winner consistency (result rows with expected score) | model yes-rate | 97.4% (37/38) |

## Confusion (result vs other)

| actual\pred | result | other |
|---|---|---|
| result | 38 | 0 |
| other | 1 | 10 |

## Per-fixture

| fixture_id | is_result | predicted_class | needs_review (noul) | score_consistent (noul) | gold flag |
| --- | --- | --- | --- | --- | --- |
| s7-f0495ff053 | false | other | 0.10 | 0.98 | — |
| s7-949b4f1586 | false | other | 0.27 | 0.87 | — |
| s7-ded1a62427 | true | result | 0.24 | 0.95 | OK |
| s7-d0988a20ca | true | result | 0.22 | 0.97 | OK |
| s7-f0e33fcf3a | true | result | 0.35 | 0.90 | OK |
| s7-873bf4b6a0 | true | result | 0.49 | 0.39 | OK |
| s7-9394265163 | false | other | 0.19 | 0.74 | — |
| s7-c17aa46d15 | true | result | 0.46 | 0.72 | OK |
| s7-f057740cf9 | true | result | 0.17 | 0.93 | OK |
| s7-102240fcaa | true | result | 0.25 | 0.97 | OK |
| s7-b343a30ee1 | true | result | 0.24 | 0.97 | OK |
| s7-eecfd279a0 | true | result | 0.31 | 0.94 | OK |
| s7-62b7056648 | true | result | 0.28 | 0.96 | OK |
| s7-449507525d | true | result | 0.21 | 0.94 | OK |
| s7-944d7dab7a | true | result | 0.23 | 0.97 | OK |
| s7-cf985bda05 | true | result | 0.22 | 0.97 | OK |
| s7-a93bb8a756 | false | question | 0.88 | 0.98 | — |
| s7-1020732ab8 | false | other | 0.08 | 0.86 | — |
| s7-65b88be902 | true | result | 0.77 | 0.93 | OK |
| s7-7f385838bb | true | result | 0.14 | 0.98 | OK |
| s7-f38004f065 | true | result | 0.26 | 0.96 | OK |
| s7-81de4bf176 | true | result | 0.21 | 0.97 | OK |
| s7-0f2faaf6d3 | true | result | 0.15 | 0.97 | OK |
| s7-8f63a7cbe6 | true | result | 0.53 | 0.88 | OK_MARGIN_ADVISORY |
| s7-ff4c0b1ab7 | false | result | 0.41 | 0.76 | — |
| s7-0ebca6489c | true | result | 0.44 | 0.84 | OK |
| s7-4070ff33b5 | true | result | 0.39 | 0.61 | OK |
| s7-556b08f93f | true | result | 0.34 | 0.87 | OK |
| s7-8ca706ca5a | true | result | 0.30 | 0.81 | OK |
| s7-890cff705d | false | other | 0.18 | 0.84 | — |
| s7-6167affb27 | false | other | 0.31 | 0.76 | — |
| s7-167b5fa48c | true | result | 0.27 | 0.90 | OK |
| s7-cbe001e463 | true | result | 0.13 | 0.97 | OK |
| s7-28500320c3 | true | result | 0.28 | 0.98 | OK |
| s7-fa8f8758d8 | false | question | 0.59 | 0.98 | — |
| s7-7cdb1ab7fe | true | result | 0.30 | 0.90 | OK |
| s7-18b92b458d | true | result | 0.20 | 0.95 | OK |
| s7-9b20bae561 | true | result | 0.21 | 0.97 | OK |
| s7-f8a84a13d3 | true | result | 0.15 | 0.96 | KNOWN_MISS |
| s7-971ba27fd6 | true | result | 0.35 | 0.97 | OK |
| s7-3646e42566 | true | result | 0.34 | 0.85 | OK |
| s7-8aa33923f8 | false | other | 0.28 | 0.90 | — |
| s7-a32dd93358 | true | result | 0.77 | 0.55 | OK |
| s7-8fad308cf3 | true | result | 0.55 | 0.86 | OK |
| s7-84fec42945 | true | result | 0.20 | 0.96 | OK |
| s7-114cf6e96c | true | result | 0.22 | 0.96 | OK |
| s7-9af4a05aa2 | true | result | 0.25 | 0.95 | OK |
| s7-9d65471e2b | false | other | 0.08 | 0.94 | — |
| s7-950e9ee6bf | true | result | 0.22 | 0.96 | IN_DISCORD_NOT_SHEET |

## Notes

- Gold class is only `is_result` boolean → collapsed to result/other for the confusion table.
- Organizer-review gold treats flags other than `OK` / `OK_MARGIN_ADVISORY` as needing review.
- This report is offline pilot output; nothing is wired into live Discord parse.
