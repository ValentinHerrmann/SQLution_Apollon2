import {
  ApollonEditor,
  UMLDiagramType,
  importDiagram,
  type UMLModel,
} from "@tumaet/apollon"
import "@tumaet/apollon/style.css"
import resvgWasmUrl from "@resvg/resvg-wasm/index_bg.wasm?url"

/**
 * Bridge between the Apollon editor and SQLution's page script
 * (`apollon-page.js`). The shape of `editor`, `model`, `loadModel` and
 * `exportSvg` is kept identical to the bridge of the previous fork so the
 * page script keeps working; everything else is additive.
 */
export type Apollon2Bridge = {
  editor: ApollonEditor
  /** Snapshot of the current diagram (v4 wire format). */
  model: () => UMLModel
  /** Replace the diagram. Accepts Apollon v2, v3 and v4 JSON. */
  loadModel: (model: unknown) => void
  /** Normalise Apollon v2/v3/v4 JSON to the current v4 model. */
  importDiagram: (model: unknown) => UMLModel
  /** Self-contained SVG (theme colors and fonts inlined). */
  exportSvg: () => Promise<Blob>
  exportPng: (options?: {
    scale?: number
    background?: string | null
  }) => Promise<Blob>
  exportPdf: () => Promise<Blob>
  /** Calls `callback` on every model change; returns an unsubscribe function. */
  onModelChange: (callback: (model: UMLModel) => void) => () => void
}

declare global {
  interface Window {
    apollon2?: Apollon2Bridge
    apollon2Ready?: Promise<Apollon2Bridge>
    _apollon2ReadyResolve?: (bridge: Apollon2Bridge) => void
  }
}

const EXPORT_MARGIN = 10

const findContainer = (): HTMLElement => {
  const container =
    document.querySelector<HTMLElement>("[data-apollon-sqlution]") ??
    document.getElementById("root")
  if (!container) {
    throw new Error(
      "Apollon: no mount element found (expected [data-apollon-sqlution] or #root)"
    )
  }
  return container
}

const createBridge = (editor: ApollonEditor): Apollon2Bridge => {
  const exportCompatSvg = () =>
    editor.exportAsSVG({ svgMode: "compat", margin: EXPORT_MARGIN })

  return {
    editor,
    model: () => editor.model,
    loadModel: (model) => {
      editor.model = importDiagram(model)
      // Frame the loaded diagram clear of the palette and zoom controls.
      editor.fitView({ duration: 0 })
    },
    importDiagram: (model) => importDiagram(model),
    exportSvg: async () => {
      const { svg } = await exportCompatSvg()
      return new Blob([svg], { type: "image/svg+xml" })
    },
    exportPng: async ({ scale = 2, background = "#ffffff" } = {}) => {
      const [{ svg, clip }, { svgToPng }] = await Promise.all([
        exportCompatSvg(),
        import("@tumaet/apollon/export"),
      ])
      const { blob } = await svgToPng(svg, clip, {
        scale,
        background,
        wasmInput: fetch(resvgWasmUrl),
      })
      return blob
    },
    exportPdf: async () => {
      const [{ svg, clip }, { svgToPdf }] = await Promise.all([
        exportCompatSvg(),
        import("@tumaet/apollon/export"),
      ])
      return svgToPdf(svg, clip, { title: editor.model.title })
    },
    onModelChange: (callback) => {
      const id = editor.subscribeToModelChange(callback)
      return () => editor.unsubscribe(id)
    },
  }
}

const mount = () => {
  // No `dataTheme`: the editor inherits SQLution's `<html data-theme>`, so the
  // site's light/dark toggle restyles it without any extra wiring.
  const editor = new ApollonEditor(findContainer(), {
    type: UMLDiagramType.ClassDiagram,
  })
  const bridge = createBridge(editor)

  window.apollon2 = bridge
  // The page script may have created the ready promise before this module ran.
  window._apollon2ReadyResolve?.(bridge)
  window.apollon2Ready = Promise.resolve(bridge)
  window.addEventListener("pagehide", () => editor.destroy(), { once: true })
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount, { once: true })
} else {
  mount()
}
