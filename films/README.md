# Obavia films

Remotion source for the two vertical films on obavia.co (`obavia-co/ads/`).

```bash
npm install
npx remotion render src/index.ts SalesAd out/obavia-ad-sales.mp4 --codec h264 --crf 17
npx remotion render src/index.ts OwnerAd out/obavia-ad-owner.mp4 --codec h264 --crf 17
```

Copy the renders into `obavia-co/ads/`. Voice lines live in `public/vo` and are listed in `src/vo.json`.

## Obavia Desk films

`DeskFilm` (16:9) and the section loops (`LoopFind`, `LoopPaper`, `LoopSale`, `LoopSign`) are cut from real Desk screens. Capture them first (they are not committed), then render:

```bash
node capture-desk.cjs                     # writes public/desk/*.png from the running Desk
npx remotion render src/index.ts DeskFilm out/obavia-desk.mp4 --codec h264 --crf 21
npx remotion render src/index.ts LoopFind out/loop-find.mp4 --codec h264 --crf 23 --muted
```

Copy the renders and posters into `obavia-co/films/`.

## The payments film

`DeskStory` (16:9, 57 s) tells how the Desk handles payments. It's cut like an agent launch film:
- words sharpen in one at a time;
- the camera pushes into the Desk;
- each step shimmers while it runs and ticks off when done;
- cards fly in from depth;
- big caption beats sit between scenes.

Everything is drawn in Remotion, with no screen captures. All names and figures are example data, and every capability it shows exists in the Desk.

```bash
npx remotion render src/index.ts DeskStory out/obavia-desk-story.mp4 --codec h264 --crf 19
```

