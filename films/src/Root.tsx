import React from "react";
import { Composition } from "remotion";
import { SalesAd } from "./SalesAd";
import { DeskStory, STORY_FRAMES } from "./story";
import { OwnerAd } from "./OwnerAd";
import { Evening } from "./evening/Evening";
import { FRAMES as EVENING_FRAMES, FPS as EVENING_FPS } from "./evening/timeline";
import { DESK_FILM_FRAMES, DeskFilm, FIND, LoopFind, LoopPaper, LoopSale, LoopSign, PAPER, SALE, SIGN, loopFrames } from "./DeskFilm";

export const Root: React.FC = () => (
  <>
    <Composition id="DeskStory" component={DeskStory} durationInFrames={STORY_FRAMES} fps={30} width={1920} height={1080} />
    <Composition id="DeskFilm" component={DeskFilm} durationInFrames={DESK_FILM_FRAMES} fps={30} width={1920} height={1080} />
    <Composition id="LoopFind" component={LoopFind} durationInFrames={loopFrames(FIND)} fps={30} width={1000} height={1100} />
    <Composition id="LoopPaper" component={LoopPaper} durationInFrames={loopFrames(PAPER)} fps={30} width={1000} height={1100} />
    <Composition id="LoopSale" component={LoopSale} durationInFrames={loopFrames(SALE)} fps={30} width={1000} height={1100} />
    <Composition id="LoopSign" component={LoopSign} durationInFrames={loopFrames(SIGN)} fps={30} width={1000} height={1100} />
    <Composition id="SalesAd" component={SalesAd} durationInFrames={1098} fps={30} width={1080} height={1920} />
    <Composition id="OwnerAd" component={OwnerAd} durationInFrames={1035} fps={30} width={1080} height={1920} />
    <Composition id="Evening" component={Evening} durationInFrames={EVENING_FRAMES} fps={EVENING_FPS} width={1080} height={1920} />
  </>
);
