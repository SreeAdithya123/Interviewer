# Vyoman Interviewer — Web

Next.js (App Router) + TypeScript + Tailwind front end for Vyoman Interviewer.

This is the **Phase 0 scaffold**: the design system (fonts, colors, radii, the
`.btn-primary` / `.eyebrow` / `.text-spectrum` utility classes, etc.) ported
from `reference/lovable-site/` is wired in, plus shadcn/ui plumbing
(`components.json`, `lib/utils.ts`, `components/ui/`). `app/page.tsx` is a
placeholder that only proves the tokens render correctly — the real landing
page comes in a later phase.

## Install

```bash
npm install
```

## Run the dev server

```bash
npm run dev
```

Then open http://localhost:3000.

## Other scripts

```bash
npm run build      # production build
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm run test         # vitest run
```
