# OpenLoop Declarative Visuals

Use `visualize_ui` when a bounded native visual explains structure better than prose.

## Selection

- `flow`: a process, dependency chain, lifecycle, or request path with 2–12 nodes.
- `timeline`: ordered phases, history, rollout, or roadmap with 2–16 items.
- `comparison`: 2–4 alternatives evaluated across 1–12 criteria.

Use one visual for one idea. Write one short sentence before the card telling the reader what to inspect, and continue with the conclusion after it. Do not invent live business data; label examples or estimates in the document description.

## Authoring rules

- Keep titles short and labels scannable.
- Flow node IDs and timeline item IDs must be unique.
- Every flow edge must reference an existing node.
- A comparison row must have exactly one value per column.
- Mark at most one comparison column as `recommended`.
- Prefer `mode: inline`; use `wide` only for dense side-by-side comparisons.
- Do not encode HTML, Markdown tables, CSS, JavaScript, colors, coordinates, or pixel sizes. The native renderer owns presentation.
