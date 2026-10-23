# SQLution embed

Builds the Apollon class-diagram editor as a static bundle for
[SQLution](https://github.com/ValentinHerrmann/SQLution)'s Django page
(`tutorial/myapp/templates/apollon.html`).

## Build

```sh
pnpm install
pnpm run build:sqlution   # builds the library, then this bundle
```

Output in `standalone/sqlution-embed/dist/`:

| File                   | Purpose                                        |
| ---------------------- | ---------------------------------------------- |
| `apollon-sqlution.js`  | Entry module (`<script type="module">`)        |
| `apollon-sqlution.css` | Editor stylesheet                              |
| `chunks/`, `assets/`   | Lazy chunks: PNG/PDF export, edge worker, wasm |

The build uses a relative base, so copy the **whole** `dist/` folder into
SQLution's `tutorial/myapp/staticfiles/apollon/`; the entry names never change
between builds.

## Mounting

The script mounts the editor into `[data-apollon-sqlution]`, falling back to
`#root`. The element needs an explicit height. The editor has no own theme: it
follows `data-theme="light|dark"` on any ancestor (SQLution sets it on
`<html>`), and can be restyled with the `--apollon-*` CSS variables.

## Bridge (`window.apollon2`)

`window.apollon2Ready` resolves with the bridge once the editor is mounted. If
the page creates that promise first, it may store its resolver in
`window._apollon2ReadyResolve`.

| Member                | Description                                              |
| --------------------- | -------------------------------------------------------- |
| `editor`              | The `ApollonEditor` instance                             |
| `model()`             | Current diagram (v4 wire format)                         |
| `loadModel(json)`     | Replace the diagram; accepts Apollon v2, v3 and v4 JSON  |
| `importDiagram(json)` | Normalise v2/v3/v4 JSON to the current v4 model          |
| `exportSvg()`         | `Promise<Blob>`, self-contained SVG                      |
| `exportPng(options?)` | `Promise<Blob>`, `{ scale = 2, background = "#ffffff" }` |
| `exportPdf()`         | `Promise<Blob>`, vector PDF                              |
| `onModelChange(cb)`   | Subscribe to model changes; returns an unsubscribe fn    |

## SQLution patches to the library

All marked with `SQLution:` comments, so they are easy to carry across
upstream merges:

- `library/lib/constants.ts`: the class-diagram palette offers only a
  "Tabelle" element.
- `library/lib/components/Sidebar.tsx`: no color-description element in class
  diagrams.
- `library/lib/nodes/classDiagram/Class.tsx`: class nodes also shrink when
  attributes are removed.
