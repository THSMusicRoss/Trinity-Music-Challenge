# Trinity Music Challenge — Release 1.0

Trinity Music Challenge is a browser-based classroom music trivia game designed for projected use,
teacher-led play, and optional built-in team buzzers.

## Release features

- Canonical 500-question music bank
- Manual Classroom and Built-in Buzzer modes
- Two to six teams
- Multiple-choice, True/False, and open-response questions
- Category, difficulty, and question-type filters
- Balanced 30% Easy / 50% Medium / 20% Challenging distribution
- Random question order without repeats
- Timer controls
- Difficulty-based, fixed, and custom scoring
- Incorrect-answer penalties, steals, passing, and tie rules
- Live rankings and score corrections
- Sudden death, shared victory, and teacher-decides ties
- Saved session presets
- Automatic browser saving and refresh recovery
- Theme and New Game preferences
- Sound cues generated in the browser
- Keyboard shortcuts and screen-reader announcements
- Reduced-motion and increased-contrast support
- Confirmation safeguards when leaving an active game
- Final winner and standings presentation

## Quick start

1. Install Node.js 20 or newer.
2. Open a terminal in this folder.
3. Run:

```bash
npm install
npm run dev
```

4. Open the local address shown by Vite.

## Production build

```bash
npm run build
npm run preview
```

The deployable output is generated in `dist/`.

## Validation

```bash
npm run typecheck
npm run validate:questions
npm run build
```

## Browser data

Games, presets, and preferences use browser local storage. They remain available on the same browser
and site origin until the browser's site data is cleared.

## Version

`1.0.0`
