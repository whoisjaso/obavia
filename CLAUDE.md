# Obavia project context

Obavia is the phone-first public auction lane: a Texas dealer lets a car the lot is losing money on go to an individual on every phone in the state, with the Desk running the paperwork behind it. The buyer sees a price, a time and a name and does one thing; the dealer sets a floor and the lane finds the price. Payments run on Whop; no fee of any kind before Obavia's own GDN (43 TAC §215.85); financial outcomes are not guaranteed. Read docs/plan/obavia-auction-decisions.md, docs/plan/obavia-auction-phases.md, docs/plan/collateral.md, docs/plan/one-action.md and docs/plan/growth/obavia-growth-plan.md before product work.

Legacy, not to be expanded: the agency-owner sales product in app/ (app.obavia.co, "sales software for agency owners") and the agency pages on obavia.co (product, owners, pricing, about, team, ads). They stay in the tree until the owner says delete; no new work lands there. The public site's index.html and waitlist.html are the dealer and buyer pages and are live product.

- obavia-co/: public site for obavia.co; index.html is the dealer page, waitlist.html the sign-up; the rest is legacy.
- app/: legacy agency-owner frontend; frozen.
- films/: source for product films.
- auction/: the Expo buyer app (Lane, Bid, Car, Won through Plates, Me) and auction/worker/ (the Worker and Durable Objects, D1, R2, Whop, push). The product.
- desk/: the dealer's Desk (Let It Go, Live, Sold, pickup, the admin cockpit) and every Texas document. The product's other half.
- deploy/site/: public-site deployment preserving the existing waitlist API, email sender, cron and search content.
- .claude/agents/: the company's agents, one per workstream (orchestrator, dissect, mirror, researcher-architect, onboarding, marketing, payments, admin, customers, dealers, individuals, paperwork, logistics, frontend, creative-edge, systems). Any task touching more than one area goes through the orchestrator.
- .claude/skills/emil/: Emil Kowalski's design-engineering skills (animate-expo, animate, apple-design, emil-design-eng, mobile-native, review-animations, improve-animations, find-animation-opportunities, break-ui, animation-performance), vendored under their licence. Frontend work loads taste-skill, then impeccable, then the Emil skill that fits the surface, before touching a screen; the frontend and creative-edge agents say which.
- docs/design/cloud-system.md: the cloud system every surface implements (volume, edge, texture, drift; press physics; the cloud sound kit in assets/cloud-sfx; the layers in assets/cloud-layers). A surface that departs from it says where and why.
- Web motion: GSAP (obavia-co/, desk/) with gsap.matchMedia for reduced motion; the app (auction/) stays on Reanimated. Emil's animate skill decides whether to animate; GSAP is the how on the web.
- docs/plan/growth/: the growth plan the owner is held to (obavia-growth-plan.md, model.md, scorecard.md) and the dissections of the transcripts in docs/plan/transcripts/. A new transcript is dissected first (dissect agent), then mirrored (mirror agent) into the plan; it never goes straight into code.

Accountability: the growth plan is rigid. A request that deviates from it is named as a deviation in the first line of the reply, with the plan line it conflicts with, and is not built until the plan's changelog carries a dated amendment. Missed gates are reported bluntly with the number and the days late.

Every surface follows docs/design/cloud-system.md (the material) and docs/design/lego.md (adjacency: pieces placed next to each other, 97 percent visual, the body confirms, nothing explained). Use one clear next action, deliberate details, the original Obavia mark, icy blues and cloud atmosphere. Respect reduced motion. Claims must match verified capability; inferred meanings remain hypotheses anchored to observable words. Show data provenance clearly.

The obsolete vehicle-rental project has been removed from the active tree. Git history is historical evidence, not current product direction. Do not restore rental pages or instructions.

Owner authorization on September 29 permits removing obsolete rental files and branches and publishing the current landing site and application frontend. This does not activate payment processing, external sales integrations or operational customer data.
