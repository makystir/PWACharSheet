# Implementation Plan

## Overview

Fix the bug where `setItem` in `local-storage.ts` silently swallows `QuotaExceededError` and other `DOMException` errors, returning `void` with no programmatic signal to callers and no UI feedback to users. The fix introduces a `StorageWriteResult` discriminated union return type so callers can detect failures, and wires up a toast notification at the app level so users are immediately informed when a save fails due to quota exceeded or storage unavailability.

## Task Dependency Graph

```json
{
  "waves": [
    {"tasks": ["1", "2"]},
    {"tasks": ["3.1", "3.2"]},
    {"tasks": ["3.3"]},
    {"tasks": ["3.4", "3.5"]},
    {"tasks": ["4"]}
  ]
}
```

## Tasks

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Silent Storage Write Failure Returns No Result
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases: mock `localStorage.setItem` to throw `QuotaExceededError` or generic `DOMException`, then call the `setItem` wrapper with random key/value pairs
  - Test that `setItem(key, value)` returns `{ ok: false, reason: 'quota-exceeded' }` when `localStorage.setItem` throws `QuotaExceededError` (from Bug Condition: `isBugCondition(input)` where `localStorage.setItem(input.key, input.value) THROWS DOMException AND exception.name == 'QuotaExceededError'`)
  - Test that `setItem(key, value)` returns `{ ok: false, reason: 'unavailable' }` when `localStorage.setItem` throws a generic `DOMException` or `SecurityError` (from Bug Condition: localStorage IS unavailable)
  - Generate random key/value string pairs, mock throwing behavior, assert result is `{ ok: false, reason }` for all generated inputs
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (the current `setItem` returns `undefined`/`void`, not a result object — this proves the bug exists)
  - Document counterexamples found (e.g., "`setItem("wfrp4e-char-abc", largeJSON)` returns `undefined` instead of `{ ok: false, reason: 'quota-exceeded' }`")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.3, 2.1, 2.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Successful Writes and Non-Write Operations Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: `setItem("testKey", "testValue")` on unfixed code when localStorage does NOT throw — data is persisted, function returns `void`/`undefined`
  - Observe: `getItem("testKey")` returns stored value or `null` with no side effects
  - Observe: `removeItem("testKey")` removes item silently with no notifications
  - Write property-based test: for all random key/value pairs where `localStorage.setItem` does NOT throw, data is persisted correctly (i.e., `localStorage.getItem(key) === value` after call)
  - Write property-based test: for all `getItem(key)` calls, behavior returns stored value or `null` with no side effects or error notifications
  - Write property-based test: for all `removeItem(key)` calls, item is removed with no error notification side effects
  - Verify tests pass on UNFIXED code (assert data persistence and read/remove behavior — the return type will change from `void` to `{ ok: true }` but the observable storage side effects remain the same)
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix for silent storage write failure

  - [x] 3.1 Define `StorageWriteResult` type and change `setItem` return type
    - Add discriminated union type to `src/storage/local-storage.ts`: `type StorageWriteResult = { ok: true } | { ok: false; reason: 'quota-exceeded' | 'unavailable' }`
    - Export the type for use by callers
    - Update `setItem` to return `StorageWriteResult` instead of `void`
    - On success: return `{ ok: true }`
    - On `QuotaExceededError` (check `error.name === 'QuotaExceededError'`): return `{ ok: false, reason: 'quota-exceeded' }`
    - On other `DOMException`/`SecurityError` (localStorage unavailable): return `{ ok: false, reason: 'unavailable' }`
    - Keep existing console logging for debugging
    - _Bug_Condition: isBugCondition(input) where localStorage.setItem(input.key, input.value) THROWS DOMException_
    - _Expected_Behavior: setItem returns { ok: false, reason: 'quota-exceeded' | 'unavailable' } for error cases, { ok: true } for success_
    - _Preservation: getItem and removeItem signatures and behavior unchanged_
    - _Requirements: 2.1, 2.3, 3.1, 3.2, 3.3_

  - [x] 3.2 Wire up toast notification at app level for storage errors
    - Create a mechanism (hook or callback at call sites) that checks `setItem` result and triggers a toast notification
    - Quota exceeded message: "Save failed — storage is full. Free up space in Settings."
    - Unavailable message: "Cannot save — storage is unavailable in this browsing mode."
    - Use existing `<Toast>` component from `src/components/shared/Toast.tsx`
    - Ensure storage error toasts do not interfere with existing undo/confirmation toasts
    - Do NOT move portraits to IndexedDB — this fix is only about surfacing failures
    - _Bug_Condition: No UI notification was displayed on write failure_
    - _Expected_Behavior: Toast notification displayed with appropriate message for each failure reason_
    - _Preservation: Existing Toast usage (undo toasts, character switch confirmations) unaffected_
    - _Requirements: 2.2, 2.3, 3.4_

  - [x] 3.3 Propagate `StorageWriteResult` through character-manager save functions
    - Update `saveCharacter`, `createCharacter`, and other functions in `src/storage/character-manager.ts` that call `setItem` to handle the result
    - At minimum: check the result and trigger the toast notification for failures
    - Optionally return the result to higher-level callers for additional handling
    - _Bug_Condition: Callers of setItem have no way to detect failure_
    - _Expected_Behavior: Save call sites check result and surface errors via toast_
    - _Preservation: Successful save behavior unchanged — data persists, no spurious notifications_
    - _Requirements: 1.1, 1.2, 2.1, 2.2_

  - [x] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Storage Write Failure Returns Result
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior (returns `{ ok: false, reason }` for error cases)
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed — `setItem` now returns proper result objects)
    - _Requirements: 2.1, 2.3_

  - [x] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Successful Writes and Non-Write Operations Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions — successful writes persist data, reads and removes unchanged, no spurious toast notifications)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite to verify no regressions across the application
  - Verify bug condition exploration test passes (Property 1)
  - Verify preservation property tests pass (Property 2)
  - Ensure existing tests (combat, layout, character management, etc.) still pass
  - Verify that no toast appears on successful saves in normal operation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- The fix does NOT move portrait data to IndexedDB — it is scoped exclusively to surfacing write failures to users and callers
- The `StorageWriteResult` type follows the discriminated union pattern common in this codebase for result types
- The existing `<Toast>` component at `src/components/shared/Toast.tsx` is reused — no new UI component needed
- Error discrimination uses `error.name === 'QuotaExceededError'` to distinguish quota errors from other `DOMException` variants (Safari private mode throws `SecurityError` or generic `DOMException`)
- Preservation tests focus on observable side effects (data persistence, item removal) rather than return type, since the return type intentionally changes from `void` to `StorageWriteResult`
- The task dependency graph allows tasks 1 and 2 (property tests) to run in parallel, then implementation tasks 3.1 and 3.2 in parallel, followed by 3.3 which depends on 3.1, then verification tasks 3.4 and 3.5 together
