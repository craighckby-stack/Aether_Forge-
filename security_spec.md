# Security Specification - Kevin Mitnicks God Virus

## Data Invariants
- A world must have a valid clock, integrity, and epoch.
- Agents belong to a world and must have a valid archetype.
- Faith points and Sin accumulation are tracked globally per world.

## The Dirty Dozen Payloads
1. **Empty World**: Creating a world without required fields.
2. **Infinite Complexity**: Setting complexity to `Infinity`.
3. **Ghost Fields**: Adding unauthorized metadata to agents.
4. **Negative Population**: Setting population < 0.
5. **Epoch Injection**: Setting epoch to a non-existent value.
6. **Integrity Poisoning**: Setting integrity to 999999.
7. **Identity Theft**: Impersonating another user's session (handled by Firebase Auth).
8. **Rapid Fire Events**: Flooding the events collection.
9. **Invalid Archetype**: Spawning agents with `GOD_MODE` when not defined.
10. **Sin Erasure**: Resetting sin tokens without a miracle.
11. **Faith Inflation**: Artificially boosting faith points.
12. **System Log Spoofing**: Writing as [SYSTEM] without internal authority (if implemented).

## Tests
- All payloads above should return `PERMISSION_DENIED` based on rule constraints.
