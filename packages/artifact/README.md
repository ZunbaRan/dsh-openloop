# @openloop/dsh-html-artifact

Registers `html_artifact`, a replayable large-canvas renderer with explicit
`static` and `scripts` policies and an outer fullscreen presentation. Remote
assets and network access are blocked. A workspace copy is written through the
active DSH filesystem and sandbox-policy seams; the HTML is also persisted in
tool-result metadata for replay.

```bash
dsh plugin --profile web add ./openloop-dsh-html-artifact-0.2.0.tgz
```
