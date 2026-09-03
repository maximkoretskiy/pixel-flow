# Pixel Flow

One-level mobile-first real-time color puzzle prototype.

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
npm run build
npm run test:e2e
```

## Device QA

- Safari on a current iPhone: no page scroll, pull-to-refresh, accidental zoom, clipped safe areas, or background-time jumps.
- Chrome on a current Android phone: same checks plus accurate taps on all four stacks and five buffer slots.
- On both devices: complete the scripted level, force five buffered containers to see danger styling, and verify a sixth return loses.

## Deploy

Enable GitHub Pages with **GitHub Actions** as the source. Push `main`; the workflow verifies and publishes `dist/` under `/pixel-flow/`.
