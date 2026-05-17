# Security Specification for Strata_OS

## Data Invariants
1. A user can only access and modify their own save data.
2. Save data must follow a strict schema to prevent tampering with credits, reputation, or inventory.
3. Global activity events are write-only by the creator and read-only for all authenticated users.
4. Timestamps must always be server-generated.
5. Usernames in the activity feed must be derived correctly (no spoofing).

## The "Dirty Dozen" Payloads (Attacks)

### Saves Collection Attacks
1. **The Credit Inflation**: `{"userId": "my_uid", "credits": 9999999, ...}` (Missing server timestamp or incorrect userId)
2. **The Identity Theft**: Attempting to write to `saves/another_uid` as `my_uid`.
3. **The Shadow Field**: Adding `{"isAdmin": true}` to the user profile or save.
4. **The Time Travel**: Providing a client-side `updatedAt` instead of `serverTimestamp()`.
5. **The Type Injection**: Sending `credits: "lots"` as a string.
6. **The Resource Bomb**: Sending a 1MB string in `activeMissionId`.

### Activity Collection Attacks
7. **The Impersonator**: Sending `{"userId": "another_uid", "username": "ADMIN", ...}`.
8. **The Ghost Event**: Sending an event without a `target`.
9. **The History Eraser**: Attempting to delete or update an existing activity document.
10. **The Spam Bot**: Sending activity with an extremely long event name.
11. **The Future Broadcast**: Sending a `timestamp` in the future.
12. **The Anonymous Breach**: Attempting to read activity without authentication.

## Test Strategy
- Verify `saves/{userId}` restricts all access to the owner.
- Verify `activity` allows `list` for all signed-in users but `get` only for the same.
- Verify `activity` allows `create` only with matching `userId`.
- Verify `activity` blocks `update` and `delete` for everyone.
