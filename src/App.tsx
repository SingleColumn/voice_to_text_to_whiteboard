import { useCallback, useRef, useState } from 'react'
import type { Editor } from 'tldraw'
import { DraggablePanel } from './components/DraggablePanel'
import { DEFAULT_PRESETS, type Preset } from './components/ComponentSelector'
import { addNoteToCanvas, VoiceCanvas } from './canvas/VoiceCanvas'
import { useVoiceRecorder } from './hooks/useVoiceRecorder'

export default function App() {
  const editorRef = useRef<Editor | null>(null)
  const noteCountRef = useRef(0)
  const [presets, setPresets] = useState<Preset[]>(DEFAULT_PRESETS)
  const [selectedPresetId, setSelectedPresetId] = useState(DEFAULT_PRESETS[0].id)

  const selectedPreset = presets.find((p) => p.id === selectedPresetId) ?? presets[0]

  const handleCommit = useCallback(
    (text: string) => {
      if (!editorRef.current) return
      addNoteToCanvas(
        editorRef.current,
        text,
        selectedPreset.shape,
        selectedPreset.color,
        selectedPreset.size,
        noteCountRef.current
      )
      noteCountRef.current += 1
    },
    [selectedPreset]
  )

  const recorder = useVoiceRecorder({ onCommit: handleCommit })

  function handleImportPreset(preset: Preset) {
    setPresets((prev) => [...prev, preset])
    setSelectedPresetId(preset.id)
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <VoiceCanvas
        onEditorReady={(editor) => { editorRef.current = editor }}
      />

      <DraggablePanel
        recorderState={recorder.state}
        errorMessage={recorder.errorMessage}
        onStart={recorder.startRecording}
        onStop={recorder.stopRecording}
        onDismissError={recorder.dismissError}
        presets={presets}
        selectedPresetId={selectedPresetId}
        onSelectPreset={setSelectedPresetId}
        onImportPreset={handleImportPreset}
      />

    </div>
  )
}
