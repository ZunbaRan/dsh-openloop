# OpenLoop HTML Artifact

Use `html_artifact` for a large, coordinated visual document: multi-panel explorer, parameterized simulation, custom topology, or fullscreen teaching surface.

Use `visualize_ui` for bounded flows, timelines, and comparisons. Use `show_widget` for one small temporary interaction.

## Runtime choice

- `static`: default. HTML, CSS, SVG, tables, and layouts; scripts and inline event handlers are rejected.
- `scripts`: choose only when controls, simulation, animation, or coordinated local state requires JavaScript.

## Contract

- Pass body content only; no doctype, html, head, or body tags.
- Keep everything self-contained. Remote src/href resources and network calls are blocked.
- Available classes: `.artifact-grid`, `.artifact-panel`, `.artifact-toolbar`, `.artifact-muted`, `.artifact-value`.
- Available variables: `--background`, `--foreground`, `--muted`, `--surface`, `--elevated`, `--border`, `--accent`, `--radius`.
- Use responsive grid/flex layouts. Avoid fixed viewport sizes; fullscreen is provided by the host.
- Use the user's language for visible labels and make the initial state useful.
- In scripts mode, query a unique root ID, honor reduced motion, and ensure every control visibly changes the output.
- Never represent sample or inferred values as live enterprise data.
