# Obavia Premium Frontend (original research note; deferred by ADR-0005)

## Executive summary
For Apple-quality iOS, make **SwiftUI the reference client** and keep web separate. Use React Native + Expo when shared iOS/Android velocity outweighs maximum iOS fidelity; RN maps to native primitives and Expo is its recommended framework.

## Main risks
Codex output needs human QA for visual drift, duplicated components, generic navigation, accessibility, loading/error states, motion, gestures and haptics. Apple treats accessibility, motion and haptics as core UX concerns.

## Stack
**Premium iOS:** SwiftUI + selective UIKit.
**Shared mobile:** RN + Expo/Fabric.
**Alternative:** Flutter.
**PWA/Capacitor:** web companion, not the iOS quality benchmark.

## Team
Priority: **product/UI designer → SwiftUI/design engineer → accessibility/QA → motion designer → RN/web engineer**.

## Quality system
Tokens → primitives → components → screens. Require visual regression/pixel-diff, interaction tests, real-device/TestFlight QA, profiling, dark mode, reduced motion, English/Spanish and secure credential storage. Storybook supports visual and interaction regression.

## Codex contract
> “Implement from approved tokens/mockups; reuse components; preserve native navigation; include empty/loading/error states, accessibility, reduced-motion behavior, tests, screenshots and profiler evidence. Do not invent UI patterns.”
