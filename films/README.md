# Obavia films

Remotion source for the two vertical films on obavia.co (`obavia-co/ads/`).

```bash
npm install
npx remotion render src/index.ts SalesAd out/obavia-ad-sales.mp4 --codec h264 --crf 17
npx remotion render src/index.ts OwnerAd out/obavia-ad-owner.mp4 --codec h264 --crf 17
```

Copy the renders into `obavia-co/ads/`. Voice lines live in `public/vo` and are listed in `src/vo.json`.
