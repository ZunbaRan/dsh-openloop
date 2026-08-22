# OpenLoop DSH Visual Plugins

Three independently installable DeepSeek Harness (`dsh`) bundles targeting
`@deepseek-ai/dsh` `0.1.0-rc.6`:

| Package | Tool | Purpose |
|---|---|---|
| `@openloop/dsh-visual-declarative` | `visualize_ui` | Native React Flow, Timeline, and Comparison surfaces from bounded JSON |
| `@openloop/dsh-show-widget` | `show_widget` | Small streaming HTML fragments in a sandboxed inline card |
| `@openloop/dsh-html-artifact` | `html_artifact` | Large static/scripted HTML canvases with fullscreen presentation |

## Build and verify

```bash
pnpm install
pnpm check
pnpm pack:all
```

Tarballs are written to `dist/`. Install one into an isolated DSH profile:

```bash
dsh plugin --profile visual-lab add ./dist/openloop-dsh-visual-declarative-0.2.0.tgz
dsh --profile visual-lab --dump-config
```

Install all three into the Desktop web profile when you are ready to try them:

```bash
dsh plugin --profile web add \
  ./dist/openloop-dsh-visual-declarative-0.2.0.tgz \
  ./dist/openloop-dsh-show-widget-0.2.0.tgz \
  ./dist/openloop-dsh-html-artifact-0.2.0.tgz
```

Restart DeepSeek Harness Desktop after changing the `web` profile. To remove
the experiment later:

```bash
dsh plugin --profile web remove \
  @openloop/dsh-visual-declarative \
  @openloop/dsh-show-widget \
  @openloop/dsh-html-artifact
```

The packages deliberately stay separate: each may be installed or removed
without changing the other two. The declarative renderer executes no generated
code. Widget and Artifact content runs in opaque-origin sandboxed iframes with
different size and presentation policies.

Version 0.2 adds **Settings → OpenLoop Visuals**. It offers the eight OpenLoop
OCIX Style v2 presets plus Follow DSH / Light / Dark appearance modes. The
Declarative bundle owns the settings page; all three client renderers subscribe
to one browser-local preference (DSH rc.6 does not expose third-party settings
namespaces through its Host API). The palettes are bundled
at build time, so users still install only these three tarballs and DSH's
global `:root` / `--dsw-*` variables remain untouched.
