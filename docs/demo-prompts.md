# Demo prompts for AI Synthesis

Type a question in the search bar, then tap the sparkle button. Every sentence in the answer ends with the transcript time it came from. All of these are checked by `tests/acceptance.spec.ts` ("AI synthesis answers").

| Ask | You get |
|---|---|
| What did we agree about the feature? | Five-step checklist, CSV import in step two, SSO postponed, new empty-state headline |
| When is the deadline we decided to? | The headline dates in order: scope freeze 6 Oct, Kestrel contract 16 Oct, beta start 21 Oct, CSV fixes 23 Oct, go/no-go 5 Nov, launch 14 Nov |
| Why was SSO postponed? | It would blow the 14 November launch date; also not mentioned in the launch communication |
| Why did we replace the word workspace? | Replaced by "account" because Brightside Dental was confused |
| Why is the launch date fixed? | Marketing cannot plan around a moving date |
| Who is responsible for the CSV import? | Jonas: estimate, hardening (one sprint), fixes by 23 October |
| Who is on call during launch? | Jonas, with extended support hours in launch week |
| How much does Kestrel cost? | 1,200 per month for up to two million events, 15 percent off annually |
| What did Brightside say about pricing? | The price matters to a small clinic; would pay extra for an onboarding call |
| What did we decide about the onboarding call price? | Thirty minutes for 99 euros, free on annual plans |
| What is our onboarding completion target? | 70 percent of new customers (baseline today is 38 percent) |
| How long does onboarding take today? | Median 26 minutes to the first invoice, target 15 |
| How many beta customers do we have? | About twelve |
| When does the beta start? | 21 October (runs until 4 November) |
| How will the beta be rolled out? | Feature flag: 25 percent from 21 Oct, 50 percent from 28 Oct, everyone on 14 Nov |
| What are the go or no-go criteria? | 70 percent finish onboarding, 95 percent CSV import success, 99.5 percent crash-free |
| When is the go or no-go meeting? | 5 November |
| What are the risks for the launch? | CSV import, support capacity, SSO requests, open items before the go/no-go |
| What did customers complain about? | Excel to CSV, the VAT step, the setup call, SSO |
| What did Karin think about the CSV import? | Unsure which columns; wants an example file and a preview |
| What did Maja say about Excel? | Had to export to CSV, would rather upload Excel directly |
| Is Kestrel data stored in the EU? | Yes, Frankfurt; the DPA is fine |
| What are the Q4 priorities? | Lantern, then the reporting dashboard, then invoice reminders |
| When will invoice reminders be ready? | Late December |
| What is the status of the CSV import? | Step two, Excel feedback, one sprint of hardening, 23 Oct, 5,000 row limit in the beta |
| What happened in the Kestrel call? / Summarize the retro | The meeting summary |
| What is the weather today? | "Can't help you with that." |

Also useful in the normal search: `CSV`, `SSO`, `Kestrel`, `Frankfurt`, `Excel`, `VAT`, `crash`, `webinar`, `02.10.26`, `2026`.
