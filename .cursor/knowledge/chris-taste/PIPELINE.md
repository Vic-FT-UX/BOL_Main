# SpecKit → Design → Dev — one flow (HARD RULE)

**Source:** Chris, Oct 2026.

Outside repos and agents use **the same SpecKit flow**. There is not a parallel “design-only” process. Design Agent owns the middle of the pipe; we do **not** own production engineering.

## The pipe

```
BRD (SpecKit specify)
  → Design Agent mock / refine (this desk + preview URL)
  → Chris sign-off
  → Dev delivery handoff
  → Dev agents implement
```

1. **SpecKit / BRD** — Spec is created with SpecKit (`specify` → plan/tasks as needed). Intake may be another agent, another repo, or upload into `/designagent`. Same `specs/<slug>/` artifact shape.
2. **Design** — Our job only: make the experience **perfect** before handoff.
   - Lumen tokens + Storybook/approved components (constitution Principle I) — Storybook stays the component gate; desk links it under Site
   - Chris taste (shell, cards, claims, carousels, copy, confirmation states, Daily Spin, etc.)
   - Correct motion / animations
   - Unique pre-prod / preview URL for refine (`:3001/prototype/<slug>` — **not** demo `:3000`; see `PROTOTYPE_LANE.md`)
   - **Refine loop on the desk:** Requester pastes/attaches screenshots + issue notes in chat → logged on the job → iterate until **Request Chris sign-off**
3. **Dev delivery** — Only after **Chris Final sign-off**, package what the requester / dev agents need (spec, screens, component/token map, **hover/motion/transitions**, **prototype URL**, acceptance). Then **hand off**. Chris can **Back to refine** anytime before Merge. We do not stay as the implementers of production code unless Chris explicitly says so.

## Roles

| Who | Owns |
| --- | --- |
| SpecKit + any intake agent | BRD / spec artifacts |
| **Design Agent (us)** | Mock, refine, Lumen correctness, animations, preview |
| Chris | Taste sign-off on the desk |
| Dev agents | Production implementation from **dev delivery** |

## Desk visibility

Every stage of this one flow is visible on `/designagent`: initiative, inbox questions, chat, screens, preview, and eventually the **dev delivery** artifact. External agents posting into the pipe must land on the same job — you always see it here.

## Anti-patterns

- Separate “non-SpecKit” design track for outside agents
- Design Agent building production features past handoff
- Handoff without Lumen/token/component map or preview URL
- Fake “live” before dev has shipped from the delivery package
