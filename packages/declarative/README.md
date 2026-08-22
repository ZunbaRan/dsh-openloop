# @openloop/dsh-visual-declarative

Native, replay-stable DSH visualizations from bounded JSON. It registers the
`visualize_ui` tool and the `openloop-visual-declarative` authoring skill. Version 0.2 adds the shared OpenLoop Visuals settings page with eight OCIX presets and system/light/dark appearance control for all three OpenLoop visual plugins.

Supported document kinds: `flow`, `timeline`, and `comparison`. Generated code,
HTML, CSS, and arbitrary coordinates are intentionally outside the contract.

```bash
dsh plugin --profile web add ./openloop-dsh-visual-declarative-0.2.0.tgz
```
