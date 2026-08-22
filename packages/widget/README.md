# @openloop/dsh-show-widget

Registers `show_widget`, a small self-contained HTML-fragment renderer with a
streaming preview. Remote assets and network connections are blocked. The final
fragment runs in an opaque-origin `sandbox="allow-scripts"` iframe and is
persisted in DSH tool-result metadata for replay.

```bash
dsh plugin --profile web add ./openloop-dsh-show-widget-0.2.0.tgz
```
