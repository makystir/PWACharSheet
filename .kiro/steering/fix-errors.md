# Fix Errors While Working

## Rule

If you encounter an error while working — a failing test, a type error, a lint failure, a broken build, or a runtime error — fix it as part of the current task. Do not leave a known error behind or defer it, even if it is not the thing you were originally asked to change.

## Guidelines

1. **Fix on sight**: When a command surfaces an error (test failure, `tsc` error, build failure, lint error, console/runtime error), resolve it before considering the work done.
2. **Includes pre-existing errors**: If a change reveals or is blocked by an error that already existed, fix it too rather than working around it or restoring the broken state.
3. **Fix the root cause**: Prefer correcting the underlying problem over silencing it. Do not disable tests, add broad `try/catch` swallows, `@ts-ignore`, `eslint-disable`, or skip verification just to make an error disappear. If a targeted suppression is genuinely warranted, explain why.
4. **Keep fixes in scope and safe**: Make the smallest change that correctly resolves the error. If the fix is large, risky, or changes intended behaviour, or if it deviates from the user's original intent, pause and flag it before proceeding.
5. **Comply with the rulebook**: Any fix touching game mechanics must follow the rules-compliance steering rule (verify against the WFRP4e rulebooks; do not invent mechanics).
6. **Verify the fix**: Re-run the relevant build/test/lint after fixing to confirm the error is gone and nothing else broke.
7. **Distinguish flaky from real**: If an error looks intermittent (e.g. a timeout under parallel load), re-run to confirm before treating it as a real regression. Report genuinely flaky, pre-existing failures rather than forcing a fix.
8. **Report what you fixed**: Note the errors you found and how you resolved them so the change is reviewable.
