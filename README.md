# Pixel Flow

Mobile-first real-time color puzzle with twelve validated levels. All levels are immediately available; the game stores no progress or completion history.

Open the level list from the header, or share a direct URL such as `?level=sunflower`. Unknown IDs safely fall back to the first level.

Supported viewport: `320 × 568` CSS pixels or larger. The portrait canvas scales with Phaser FIT; actionable regions remain at least `48 × 48` CSS pixels at that minimum.

## Develop

```bash
npm ci
npm run dev
```

## Verify

```bash
npm run lint
npm run typecheck
npm test
npm run levels:validate
npm run build
npm run test:e2e
```

Level authors should start with [docs/level-authoring.md](docs/level-authoring.md).

## Device QA

- Safari on a current iPhone: no scrolling, accidental zoom, clipped safe areas, or background-time jumps.
- Chrome on a current Android phone: same checks plus accurate taps on stacks, buffer slots, and all twelve selector cells.
- On both: open a direct level URL, switch levels, replay, use next-level navigation, and verify that no level is locked.

## Deploy

Enable GitHub Pages with **GitHub Actions** as the source. Push `main`; CI validates code and the generated catalog before publishing `dist/` under `/pixel-flow/`.
