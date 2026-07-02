# Storage Quota Save Failure Bugfix Design

## Overview

When `localStorage.setItem` fails due to `QuotaExceededError` or localStorage unavailability (e.g., private browsing), the current `setItem` wrapper in `local-storage.ts` swallows the error silently—logging to console at best and returning `void`. Callers have no programmatic way to detect the failure, and users receive no visual feedback that their edits were discarded. This fix changes the `setItem` wrapper to return a success/failure result and wires up a toast notification at the UI layer so users are informed immediately when a save fails.

## Glossary

- **Bug_Condition (C)**: A `setItem` call where the underlying `localStorage.setItem` throws—either `QuotaExceededError` (storage full) or any `DOMException` due to localStorage unavailability (private browsing, disabled storage)
- **Property (P)**: The `setItem` wrapper returns a result indicating failure, and the UI displays a non-modal toast notification informing the user their data was not saved
- **Preservation**: All read operations (`getItem`), remove operations (`removeItem`), and successful writes must continue to work exactly as before—no spurious notifications, no changed return values for successful paths
- **setItem**: The low-level localStorage write wrapper in `src/storage/local-storage.ts`
- **Toast**: The existing `<Toast>` component in `src/components/shared/Toast.tsx` used for transient user notifications
- **QuotaExceededError**: A `DOMException` thrown by the browser when `localStorage` has no remaining space

## Bug Details

### Bug Condition

The bug manifests when `setItem` is called and the underlying `localStorage.setItem` throws an exception. The wrapper catches the error, optionally logs it, and returns `void`—giving callers no signal that the write failed.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { key: string, value: string }
  OUTPUT: boolean
  
  RETURN localStorage.setItem(input.key, input.value) THROWS DOMException
         AND (exception.name == 'QuotaExceededError'
              OR localStorage IS unavailable)
END FUNCTION
```

### Examples

- **Quota exceeded**: User edits a character portrait (base64 ~2.7 MB). `setItem("wfrp4e-char-abc", largeJSON)` throws `QuotaExceededError`. Currently: console log, no UI feedback, user believes save succeeded. Expected: toast "Save failed — storage is full", `setItem` returns `{ ok: false, reason: 'quota-exceeded' }`.
- **Private browsing**: User opens the app in Safari private mode and creates a character. `setItem` throws immediately. Currently: silent no-op. Expected: toast "Cannot save — storage unavailable in this browsing mode", `setItem` returns `{ ok: false, reason: 'unavailable' }`.
- **Successful write (not a bug)**: User edits a skill value, storage has space. `setItem` succeeds. No notification shown. Returns `{ ok: true }`.
- **Edge case — repeated failures**: User saves repeatedly with quota full. Each failed write shows a toast (or re-triggers the existing toast), ensuring the user always has visibility.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- `getItem(key)` continues to return `string | null` with no change in signature or behavior
- `removeItem(key)` continues to silently remove items with no notifications
- Successful `setItem` calls continue to persist data without any notification or changed caller behavior
- Existing Toast usage (undo toasts on character deletion, endeavour removal, etc.) must remain independent and unaffected

**Scope:**
All inputs where `localStorage.setItem` does NOT throw should be completely unaffected by this fix. This includes:
- All read operations via `getItem`
- All remove operations via `removeItem`
- All successful write operations via `setItem`
- Non-storage-related toast messages

## Hypothesized Root Cause

Based on the bug description, the root cause is straightforward:

1. **Missing return value**: `setItem` returns `void`. Callers have no mechanism to detect failure. The function signature must change to return a discriminated result type.

2. **No UI notification path**: Even if callers could detect failure, there is currently no centralized mechanism to surface storage errors to the user. The Toast component exists but is only wired per-page for undo operations—there is no app-level toast for storage failures.

3. **Incomplete error discrimination**: The catch block only identifies `QuotaExceededError` specifically. Other `DOMException` cases (private browsing throws a generic `DOMException` or `SecurityError` depending on browser) are silently swallowed without even a console log.

## Correctness Properties

Property 1: Bug Condition - Failed writes return failure result and trigger notification

_For any_ `setItem(key, value)` call where the underlying `localStorage.setItem` throws a `DOMException` (quota exceeded or storage unavailable), the fixed `setItem` function SHALL return a result object `{ ok: false, reason: 'quota-exceeded' | 'unavailable' }` so callers can react, and the UI layer SHALL display a visible, non-modal toast notification describing the failure.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Successful writes and non-write operations unchanged

_For any_ input where `localStorage.setItem` does NOT throw (successful write), the fixed `setItem` SHALL return `{ ok: true }` and no error notification SHALL be displayed. For all `getItem` and `removeItem` calls, behavior SHALL remain identical to the original implementation regardless of the fix.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

**File**: `src/storage/local-storage.ts`

**Function**: `setItem`

**Specific Changes**:
1. **Define result type**: Add a discriminated union type `StorageWriteResult` with variants `{ ok: true }` and `{ ok: false; reason: 'quota-exceeded' | 'unavailable' }`.
2. **Change return type**: Update `setItem` to return `StorageWriteResult` instead of `void`.
3. **Discriminate error causes**: In the catch block, differentiate `QuotaExceededError` from other `DOMException` types (the latter indicating localStorage unavailability).
4. **Return appropriate result**: Return `{ ok: true }` on success, `{ ok: false, reason: 'quota-exceeded' }` for quota errors, `{ ok: false, reason: 'unavailable' }` for other exceptions.

**File**: `src/storage/local-storage.ts` (new export)

5. **Add notification callback registration**: Export a `onStorageError` callback setter so the UI layer can register a handler without creating a circular dependency between storage and React components. Alternatively, export a simple event-based approach or have callers check the result.

**File**: `src/App.tsx` (or a new hook `src/hooks/useStorageErrorToast.ts`)

6. **Wire up toast for storage errors**: Create a mechanism at the app level (or in a shared hook used by save call sites) that checks the `setItem` result and triggers a toast notification with an appropriate message:
   - Quota exceeded: "Save failed — storage is full. Free up space in Settings."
   - Unavailable: "Cannot save — storage is unavailable in this browsing mode."

**File**: `src/storage/character-manager.ts`

7. **Propagate results (optional)**: The character-manager functions (`saveCharacter`, `createCharacter`, etc.) may optionally propagate the `StorageWriteResult` so higher-level callers can take additional action. At minimum, the toast notification must fire regardless of whether callers inspect the result.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that mock `localStorage.setItem` to throw `QuotaExceededError` or `DOMException`, then call the `setItem` wrapper and observe that it returns `void` (confirming the bug) and that no notification mechanism fires.

**Test Cases**:
1. **Quota Exceeded Test**: Mock `localStorage.setItem` to throw `QuotaExceededError`, call `setItem("key", "value")`, assert return is `undefined` (will confirm bug on unfixed code)
2. **Unavailable Storage Test**: Mock `localStorage` to throw generic `DOMException` on any setItem, call `setItem("key", "value")`, assert return is `undefined` (will confirm bug on unfixed code)
3. **SecurityError Test**: Mock `localStorage.setItem` to throw `SecurityError` (Safari private mode), call `setItem`, assert return is `undefined` (will confirm bug on unfixed code)
4. **Large Value Test**: Attempt to write a string exceeding 5 MB quota, observe silent failure (may confirm bug on unfixed code in real browser environment)

**Expected Counterexamples**:
- `setItem` returns `undefined` for all error cases, giving callers no signal
- No toast or notification mechanism is triggered
- Possible causes confirmed: missing return type, no error callback/event

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := setItem_fixed(input.key, input.value)
  ASSERT result.ok == false
  ASSERT result.reason IN ['quota-exceeded', 'unavailable']
  ASSERT toastNotificationWasDisplayed(result.reason)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT setItem_fixed(input.key, input.value).ok == true
  ASSERT localStorage.getItem(input.key) == input.value
  ASSERT noErrorToastDisplayed()
END FOR

FOR ALL key WHERE getItem is called DO
  ASSERT getItem_fixed(key) == getItem_original(key)
END FOR

FOR ALL key WHERE removeItem is called DO
  ASSERT removeItem_fixed(key) behaves identically to removeItem_original(key)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many random key/value pairs to verify successful writes remain unaffected
- It catches edge cases (empty strings, very long keys, special characters) that manual tests might miss
- It provides strong guarantees that non-error paths are unchanged

**Test Plan**: Observe behavior on UNFIXED code first for successful writes, reads, and removes, then write property-based tests capturing that behavior continues after the fix.

**Test Cases**:
1. **Successful Write Preservation**: Verify that for arbitrary key/value pairs where no exception is thrown, data is persisted correctly and no toast appears
2. **Read Preservation**: Verify that `getItem` behavior is unchanged—returns stored value or null, no side effects
3. **Remove Preservation**: Verify that `removeItem` behavior is unchanged—item is removed, no toast appears
4. **Existing Toast Independence**: Verify that undo toasts and other app toasts continue to function independently of storage error toasts

### Unit Tests

- Test `setItem` returns `{ ok: false, reason: 'quota-exceeded' }` when `QuotaExceededError` is thrown
- Test `setItem` returns `{ ok: false, reason: 'unavailable' }` when other `DOMException` is thrown
- Test `setItem` returns `{ ok: true }` when write succeeds
- Test `getItem` signature and behavior are unchanged
- Test `removeItem` signature and behavior are unchanged
- Test toast notification displays correct message for quota exceeded
- Test toast notification displays correct message for unavailable storage
- Test no toast appears on successful write

### Property-Based Tests

- Generate random key/value string pairs, mock successful `localStorage.setItem`, verify `setItem` always returns `{ ok: true }` and persists data
- Generate random key/value pairs, randomly mock either `QuotaExceededError` or generic `DOMException`, verify `setItem` always returns appropriate `{ ok: false, reason }` and never persists data
- Generate random sequences of get/set/remove operations, verify `getItem` and `removeItem` behavior is identical before and after fix

### Integration Tests

- Test full character save flow when quota is exceeded: user edits character → save triggers → toast appears with storage-full message
- Test character creation in private browsing mode: create character → toast appears with unavailable message
- Test that successful saves in normal conditions show no error toast
- Test that storage error toast does not interfere with undo toasts on the same page
