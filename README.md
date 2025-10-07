# Ada Demo

Live demo of Ada — the Adaptive Deterministic Agent — to be shipped alongside Eden.

## What this demo shows
- Smooth, FigJam‑style connectors with exactly two rounded “knots” and orthogonal entry into node anchors
- Auto‑reanchoring to nearest side/top/bottom anchors as nodes move (always enters anchors straight‑in)
- Long‑press “wiggle” move mode on nodes; connector paths recompute live
- Dotted marching animation along connector paths (directional flow)

## Tech
- React + TypeScript + Vite
- Lightweight, local geometry utils: `connector/utils/geometry.ts`, `update-path.ts`, `anchor-point.ts`

## Run locally
```bash
npm install
npm run dev
```

## Branch
- Default branch: `ada-demo`
