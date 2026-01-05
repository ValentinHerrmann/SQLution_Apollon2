import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { useEditorContext } from "@/contexts"
import { ApollonEditor, UMLDiagramType } from "@tumaet/apollon"
import React, { useEffect, useRef } from "react"
import { useLocation } from "react-router"
import { log } from "@/logger"

type Apollon2Bridge = {
  editor: ApollonEditor
  loadModel: (model: ApollonEditor["model"]) => void
  model: () => ApollonEditor["model"]
  exportSvg: () => Promise<Blob>
}

declare global {
  interface Window {
    apollon2?: Apollon2Bridge
    apollon2Ready?: Promise<Apollon2Bridge>
    _apollon2ReadyResolve?: (bridge: Apollon2Bridge) => void
  }
}

export const ApollonLocal: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const { setEditor } = useEditorContext()
  const { state } = useLocation()

  const currentModelId = usePersistenceModelStore(
    (store) => store.currentModelId
  )
  const diagram = usePersistenceModelStore((store) =>
    currentModelId ? store.models[currentModelId] : null
  )
  const createModelByTitleAndType = usePersistenceModelStore(
    (store) => store.createModelByTitleAndType
  )
  const updateModel = usePersistenceModelStore((store) => store.updateModel)

  useEffect(() => {
    if (!diagram) {
      createModelByTitleAndType("Class Diagram", UMLDiagramType.ClassDiagram)
      return
    }

    if (!containerRef.current || !diagram) return

    const instance = new ApollonEditor(containerRef.current, {
      model: diagram.model,
    })

    instance.subscribeToModelChange((model) => {
      updateModel(model)
    })

    setEditor(instance)

    const bridge: Apollon2Bridge = {
      editor: instance,
      loadModel: (model) => {
        instance.model = model
      },
      model: () => instance.model,
      exportSvg: async () => {
        const { svg } = await instance.exportAsSVG()
        return new Blob([svg], { type: "image/svg+xml" })
      },
    }

    if (!window.apollon2Ready) {
      window.apollon2Ready = new Promise((resolve) => {
        window._apollon2ReadyResolve = resolve
      })
    }

    window.apollon2 = bridge
    window._apollon2ReadyResolve?.(bridge)
    // Keep the global promise resolved for external consumers
    window.apollon2Ready = Promise.resolve(bridge)

    return () => {
      log.debug("Cleaning up Apollon2 instance")
      instance.destroy()
    }
  }, [diagram?.id, state?.timeStapToCreate])

  return (
    <div
      style={{ display: "flex", flexGrow: 1, height: "100%" }}
      ref={containerRef}
    />
  )
}
