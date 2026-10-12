# Obavia project context

Obavia is sales software for established agency owners earning $100,000 to $1 million per month who run their own sales team. The product connects sales-stage visibility, evidence from conversations, rep actions and owner review. The current offer candidate is $3,000/month; financial outcomes are not guaranteed.

Read docs/obavia-spec.md, docs/sales-doctrine.md, docs/obavia-positioning.md and docs/plan/roadmap.md before product work. The spec distinguishes frontend, site demonstrations and planned integrations. Read app/CLAUDE.md for application work.

- obavia-co/: public marketing site for obavia.co.
- app/: Vite/React application frontend for app.obavia.co. Current figures are seeded; integrations and authentication are not operational.
- films/: source for product films.
- auction/: Expo buyer app for the phone-first public auction (Lane, Bid sheet; local stand-in server). Read docs/plan/obavia-auction-decisions.md and docs/plan/obavia-auction-phases.md first. Payments run on Whop.
- deploy/site/: public-site deployment preserving the existing waitlist API, email sender, cron and search content.
- .claude/agents/: the company's agents, one per workstream (orchestrator, dissect, mirror, researcher-architect, onboarding, marketing, payments, admin, customers, dealers, individuals, paperwork, logistics, frontend, creative-edge, systems). Any task touching more than one area goes through the orchestrator.
- .claude/skills/emil/: Emil Kowalski's design-engineering skills (animate-expo, animate, apple-design, emil-design-eng, mobile-native, review-animations, improve-animations, find-animation-opportunities, break-ui, animation-performance), vendored under their licence. Frontend work loads taste-skill, then impeccable, then the Emil skill that fits the surface, before touching a screen; the frontend and creative-edge agents say which.
- docs/plan/growth/: the growth plan the owner is held to (obavia-growth-plan.md, model.md, scorecard.md) and the dissections of the transcripts in docs/plan/transcripts/. A new transcript is dissected first (dissect agent), then mirrored (mirror agent) into the plan; it never goes straight into code.

Accountability: the growth plan is rigid. A request that deviates from it is named as a deviation in the first line of the reply, with the plan line it conflicts with, and is not built until the plan's changelog carries a dated amendment. Missed gates are reported bluntly with the number and the days late.

Use one clear next action, deliberate details, the original Obavia mark, icy blues and cloud atmosphere. Respect reduced motion. Claims must match verified capability; inferred meanings remain hypotheses anchored to observable words. Show data provenance clearly.

The obsolete vehicle-rental project has been removed from the active tree. Git history is historical evidence, not current product direction. Do not restore rental pages or instructions.

Owner authorization on September 29 permits removing obsolete rental files and branches and publishing the current landing site and application frontend. This does not activate payment processing, external sales integrations or operational customer data.
