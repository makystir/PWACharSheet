# Bugfix Requirements Document

## Introduction

When localStorage quota is exceeded (most commonly due to base64-encoded portrait images consuming up to ~2.7 MB each), the `setItem` wrapper in `local-storage.ts` catches the `QuotaExceededError` and only calls `console.error`. No signal is returned to callers, and the UI gives no indication that a save operation failed. Users can lose edits without realizing it, believing their data was persisted when it was silently discarded.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a call to `setItem` throws a `QuotaExceededError` THEN the system logs to the console and returns `void`, giving no programmatic indication of failure to the caller

1.2 WHEN a character save fails due to quota exceeded THEN the UI displays no visible feedback to the user, leaving them unaware that their edit was not persisted

1.3 WHEN localStorage is unavailable (e.g., private browsing mode) and a write is attempted THEN the system silently discards the write with no user-facing notification

### Expected Behavior (Correct)

2.1 WHEN a call to `setItem` throws a `QuotaExceededError` THEN the system SHALL return a result indicating failure so that callers can react accordingly

2.2 WHEN a character save fails due to quota exceeded THEN the system SHALL display a visible, non-modal notification (e.g., toast) informing the user that their changes could not be saved because storage is full

2.3 WHEN localStorage is unavailable and a write is attempted THEN the system SHALL display a visible notification informing the user that data cannot be saved in the current browsing context

### Unchanged Behavior (Regression Prevention)

3.1 WHEN localStorage has sufficient quota and a write is performed THEN the system SHALL CONTINUE TO persist data successfully without displaying any error notification

3.2 WHEN `getItem` is called (read operations) THEN the system SHALL CONTINUE TO return the stored value or null without triggering save-failure notifications

3.3 WHEN `removeItem` is called THEN the system SHALL CONTINUE TO remove the item without triggering save-failure notifications

3.4 WHEN the Toast component is used for other purposes (e.g., character switch confirmation) THEN the system SHALL CONTINUE TO display those messages independently of storage error notifications
