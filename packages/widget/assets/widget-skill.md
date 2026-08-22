# OpenLoop Show Widget

Use `show_widget` for one small, temporary, free-form interactive explanation.

Use `visualize_ui` instead for a flow, timeline, or comparison. Use `html_artifact` instead for a large multi-panel document, custom explorer, or fullscreen canvas.

## Contract

- Pass an HTML fragment only: no doctype, html, head, or body tags.
- Keep it self-contained. Remote `src` and `href` assets are rejected; network APIs are blocked.
- Inline style and script are allowed. Give the root a unique ID and query it explicitly.
- Prefer one `.surface`, one focal interaction, and a useful initial state.
- Available classes: `.surface`, `.row`, `.grid`, `.muted`, `.value`.
- Available variables: `--foreground`, `--muted`, `--surface`, `--border`, `--accent`, `--radius`.
- Use the user's language for every visible label.
- Do not imitate live enterprise data. Clearly label sample, estimated, or simulated values.
- Avoid fixed outer widths, viewport units, nested scrolling, autoplay, and decorative looping motion.
