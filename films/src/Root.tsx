import React from "react";
import { Composition } from "remotion";
import { SalesAd } from "./SalesAd";
import { OwnerAd } from "./OwnerAd";

export const Root: React.FC = () => (
  <>
    <Composition id="SalesAd" component={SalesAd} durationInFrames={1098} fps={30} width={1080} height={1920} />
    <Composition id="OwnerAd" component={OwnerAd} durationInFrames={1035} fps={30} width={1080} height={1920} />
  </>
);
