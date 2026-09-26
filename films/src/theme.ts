import { Easing } from "remotion";

export const theme = {
  colors: {
    night: "#121A2E", night2: "#1D2742", nightGlow: "rgba(125,151,199,0.35)",
    sky: "#F6F9FF", skyTop: "#D8E3FC",
    peri: "#C8D6FC", deep: "#7D97C7", navy: "#28344F", ink: "#1C2436",
    slate: "#737B8C", body: "#4B5468", line: "#DCE4FA", white: "#FFFFFF",
    dimOnNight: "rgba(214,223,247,0.62)",
  },
  font: "Manrope, 'Helvetica Neue', Arial, sans-serif",
  ease: {
    out: Easing.bezier(0.16, 1, 0.3, 1),
    inOut: Easing.bezier(0.83, 0, 0.17, 1),
    in: Easing.bezier(0.7, 0, 0.84, 0),
  },
  spring: {
    snappy: { damping: 14, stiffness: 160, mass: 0.6 },
    smooth: { damping: 20, stiffness: 90, mass: 1 },
    bouncy: { damping: 11, stiffness: 170, mass: 0.7 },
  },
} as const;
