# Release Notes — Version 1.0.0

## Status

Initial complete release.

## Major capabilities

Version 1.0 combines the full question system, setup wizard, gameplay engine, scoring, ties, final
results, saved-game recovery, presets, settings, browser-generated sound cues, accessibility support,
and classroom safeguards.

## Validation performed

- Strict TypeScript type checking
- Canonical question-bank validation
- Vite production build
- Package audit during dependency installation

## Known limitations

- Saved data is tied to the current browser and site origin.
- Built-in buzzers operate on the teacher's device; separate student-device networking is not included.
- Browser-generated sound depends on browser audio permissions.
- No cloud account, multi-device synchronization, or remote database is included.
