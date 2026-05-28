import { Tldraw, createShapeId, toRichText } from 'tldraw'
import type { Editor, TLDefaultColorStyle, TLDefaultSizeStyle } from 'tldraw'

// All valid values for the tldraw geo shape's `geo` prop (from TLGeoShapeProps).
type GeoShape = 'arrow-down' | 'arrow-left' | 'arrow-right' | 'arrow-up' | 'check-box' |
  'cloud' | 'diamond' | 'ellipse' | 'heart' | 'hexagon' | 'octagon' | 'oval' | 'pentagon' |
  'rectangle' | 'rhombus-2' | 'rhombus' | 'star' | 'trapezoid' | 'triangle' | 'x-box'

const NOTE_W = 220
const NOTE_H = 140
const NOTE_GAP = 24
const NOTES_PER_ROW = 4
const ORIGIN_X = 64
const ORIGIN_Y = 64

function notePosition(index: number) {
  const col = index % NOTES_PER_ROW
  const row = Math.floor(index / NOTES_PER_ROW)
  return {
    x: ORIGIN_X + col * (NOTE_W + NOTE_GAP),
    y: ORIGIN_Y + row * (NOTE_H + NOTE_GAP),
  }
}

interface VoiceCanvasProps {
  onEditorReady: (editor: Editor) => void
}

export function VoiceCanvas({ onEditorReady }: VoiceCanvasProps) {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Tldraw
        persistenceKey="voice-whiteboard"
        onMount={(editor) => { onEditorReady(editor) }}
      />
    </div>
  )
}

export function addNoteToCanvas(
  editor: Editor,
  text: string,
  style: string,
  color: TLDefaultColorStyle,
  size: TLDefaultSizeStyle,
  noteIndex: number
) {
  const { x, y } = notePosition(noteIndex)
  const id = createShapeId()
  editor.createShape({
    id,
    type: 'geo',
    x,
    y,
    props: {
      geo: style as GeoShape,
      richText: toRichText(text),
      color,
      fill: 'solid',
      size,
      font: 'sans',
      align: 'middle',
      verticalAlign: 'middle',
      w: NOTE_W,
      h: NOTE_H,
    },
  })
  editor.centerOnPoint({ x: x + NOTE_W / 2, y: y + NOTE_H / 2 })
}
