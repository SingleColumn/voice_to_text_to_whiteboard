import { useRef, useState, type PointerEvent, type ChangeEvent } from 'react'
import type { TLDefaultColorStyle } from 'tldraw'
import { ComponentSelector, nearestTldrawColor, type Preset } from './ComponentSelector'
import { MicButton } from './MicButton'
import type { STTProvider } from '../config/sttProviders'

interface DraggablePanelProps {
  isListening: boolean
  isProcessing: boolean
  interimTranscript: string
  error: string | null
  provider: STTProvider
  onProviderChange: (p: STTProvider) => void
  onStart: () => void
  onStop: () => void
  onDismissError: () => void
  presets: Preset[]
  selectedPresetId: string
  onSelectPreset: (id: string) => void
  onImportPreset: (preset: Preset) => void
}

interface JsonPreset {
  name?: unknown
  shape?: unknown
  bgColor?: unknown
  color?: unknown
  size?: unknown
}

// Full set of valid tldraw geo shape values.
const VALID_GEO_SHAPES = new Set([
  'arrow-down', 'arrow-left', 'arrow-right', 'arrow-up', 'check-box',
  'cloud', 'diamond', 'ellipse', 'heart', 'hexagon', 'octagon', 'oval',
  'pentagon', 'rectangle', 'rhombus-2', 'rhombus', 'star', 'trapezoid',
  'triangle', 'x-box',
])

const BASE_W = 260

export function DraggablePanel({
  isListening,
  isProcessing,
  interimTranscript,
  error,
  provider,
  onProviderChange,
  onStart,
  onStop,
  onDismissError,
  presets,
  selectedPresetId,
  onSelectPreset,
  onImportPreset,
}: DraggablePanelProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [panelW, setPanelW] = useState(BASE_W)
  const [panelH, setPanelH] = useState<number | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)
  const [importError, setImportError] = useState<string | null>(null)

  const panelRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Separate refs for each drag operation so they don't conflict.
  const moveOrigin = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null)
  const wResizeOrigin = useRef<{ sx: number; ow: number } | null>(null)
  const hResizeOrigin = useRef<{ sy: number; oh: number } | null>(null)

  // Typography scales linearly with panel width.
  const scale = Math.max(0.8, Math.min(2.0, panelW / BASE_W))
  const fs = {
    title:  Math.round(11 * scale),
    label:  Math.round(10 * scale),
    body:   Math.round(12 * scale),
    status: Math.round(13 * scale),
    hint:   Math.round(10 * scale),
  }

  // ── Move (header only) ──────────────────────────────────────────────────
  function onHeaderPD(e: PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('button')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const r = panelRef.current!.getBoundingClientRect()
    moveOrigin.current = { sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top }
  }
  function onHeaderPM(e: PointerEvent<HTMLDivElement>) {
    if (!moveOrigin.current) return
    setPos({ x: moveOrigin.current.ox + (e.clientX - moveOrigin.current.sx), y: moveOrigin.current.oy + (e.clientY - moveOrigin.current.sy) })
  }
  function onHeaderPU() { moveOrigin.current = null }

  // ── Width resize (bottom-right corner grip) ─────────────────────────────
  function onWResizePD(e: PointerEvent<HTMLDivElement>) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    wResizeOrigin.current = { sx: e.clientX, ow: panelW }
  }
  function onWResizePM(e: PointerEvent<HTMLDivElement>) {
    if (!wResizeOrigin.current) return
    setPanelW(Math.max(200, wResizeOrigin.current.ow + (e.clientX - wResizeOrigin.current.sx)))
  }
  function onWResizePU() { wResizeOrigin.current = null }

  // ── Height resize (bottom-centre handle) ───────────────────────────────
  function onHResizePD(e: PointerEvent<HTMLDivElement>) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    hResizeOrigin.current = { sy: e.clientY, oh: panelRef.current!.getBoundingClientRect().height }
  }
  function onHResizePM(e: PointerEvent<HTMLDivElement>) {
    if (!hResizeOrigin.current) return
    setPanelH(Math.max(120, hResizeOrigin.current.oh + (e.clientY - hResizeOrigin.current.sy)))
  }
  function onHResizePU() { hResizeOrigin.current = null }

  // ── JSON import ─────────────────────────────────────────────────────────
  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string) as JsonPreset
        if (typeof json.name !== 'string') {
          setImportError('Missing "name" field')
          return
        }
        if (typeof json.shape !== 'string' || !VALID_GEO_SHAPES.has(json.shape)) {
          setImportError('"shape" must be a valid tldraw geo shape (e.g. "rectangle", "diamond", "cloud")')
          return
        }
        // Accept either a native tldraw color or a hex bgColor (mapped to nearest).
        let color: TLDefaultColorStyle = 'blue'
        if (typeof json.color === 'string') {
          color = json.color as TLDefaultColorStyle
        } else if (typeof json.bgColor === 'string') {
          color = nearestTldrawColor(json.bgColor)
        }

        const preset: Preset = {
          id: `custom-${Date.now()}`,
          label: json.name,
          shape: json.shape,
          color,
          size: (json.size as Preset['size']) ?? 'm',
        }
        setImportError(null)
        onImportPreset(preset)
      } catch {
        setImportError('Could not read file — make sure it is valid JSON')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const posStyle = pos
    ? { left: pos.x, top: pos.y, right: 'auto' as const }
    : { right: 16, top: 300 }

  const statusColor = isListening
    ? 'var(--tl-color-danger)'
    : isProcessing
      ? 'var(--tl-color-warning)'
      : '#555'
  const statusLabel = isListening
    ? 'Listening…'
    : isProcessing
      ? provider === 'whisper' ? 'Transcribing…' : 'Processing…'
      : 'Ready'

  return (
    // tl-theme__light resolves tldraw CSS variables to the light palette
    // (white panel background, dark text). The border is pinned to solid black.
    <div
      ref={panelRef}
      className="tl-theme__light"
      style={{
        position: 'absolute',
        ...posStyle,
        zIndex: 300,
        width: panelW,
        height: panelH ?? undefined,
        background: 'var(--tl-color-panel)',
        border: '2px solid #000',
        borderRadius: 10,
        fontFamily: "'Syne', sans-serif",
        fontSize: fs.body,
        userSelect: 'none',
        boxShadow: 'var(--tl-shadow-2)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Header ───────────────────────────────────────────────── */}
      <div
        onPointerDown={onHeaderPD}
        onPointerMove={onHeaderPM}
        onPointerUp={onHeaderPU}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '9px 12px',
          cursor: 'grab',
          borderBottom: isExpanded ? '1px solid var(--tl-color-divider)' : 'none',
          borderRadius: isExpanded ? '10px 10px 0 0' : 10,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GripIcon />
          <span style={{ fontSize: fs.title, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--tl-color-text-3)', textTransform: 'uppercase' }}>
            Voice to Text Controls
          </span>
        </div>
        <button
          onClick={() => setIsExpanded((v) => !v)}
          title={isExpanded ? 'Collapse panel' : 'Expand panel'}
          style={{ background: 'none', border: 'none', color: 'var(--tl-color-text-3)', cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center' }}
        >
          <ChevronIcon up={isExpanded} />
        </button>
      </div>

      {/* ── Body (collapsible) ────────────────────────────────────── */}
      {isExpanded && (
        <div style={{ flex: 1, overflowY: panelH !== null ? 'auto' : undefined, display: 'flex', flexDirection: 'column' }}>

          {/* Section 1 — Voice */}
          <Section label="Voice" fs={fs.label}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>

              {/* Provider toggle */}
              <div style={{ display: 'flex', width: '100%', border: '1px solid var(--tl-color-divider)', borderRadius: 6, overflow: 'hidden' }}>
                {(['deepgram', 'whisper'] as STTProvider[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => { if (!isListening && !isProcessing) onProviderChange(p) }}
                    disabled={isListening || isProcessing}
                    style={{
                      flex: 1,
                      padding: '5px 0',
                      fontSize: fs.hint,
                      fontFamily: "'Syne', sans-serif",
                      fontWeight: provider === p ? 700 : 400,
                      background: provider === p ? 'var(--tl-color-muted-1)' : 'transparent',
                      color: provider === p ? 'var(--tl-color-text)' : 'var(--tl-color-text-3)',
                      border: 'none',
                      borderRight: p === 'deepgram' ? '1px solid var(--tl-color-divider)' : 'none',
                      cursor: isListening || isProcessing ? 'default' : 'pointer',
                      textTransform: 'capitalize',
                      letterSpacing: '0.03em',
                      transition: 'background 0.1s, color 0.1s',
                    }}
                  >
                    {p === 'deepgram' ? 'Deepgram' : 'Whisper'}
                  </button>
                ))}
              </div>

              <MicButton
                isListening={isListening}
                isProcessing={isProcessing}
                onStart={onStart}
                onStop={onStop}
              />
              <span style={{ fontSize: fs.status, color: statusColor, fontWeight: 600, letterSpacing: '0.04em' }}>
                {statusLabel}
              </span>

              {/* Live transcript preview while listening or draining */}
              {(isListening || isProcessing) && interimTranscript && (
                <div style={{
                  fontSize: fs.hint,
                  color: 'var(--tl-color-text-2)',
                  background: 'var(--tl-color-muted-1)',
                  border: '1px solid var(--tl-color-divider)',
                  borderRadius: 4,
                  padding: '4px 8px',
                  width: '100%',
                  lineHeight: 1.4,
                  textAlign: 'center',
                  fontStyle: 'italic',
                }}>
                  {interimTranscript}
                </div>
              )}

              {/* Error message */}
              {error && (
                <div
                  onClick={onDismissError}
                  style={{
                    fontSize: fs.hint,
                    color: 'var(--tl-color-danger)',
                    background: 'var(--tl-color-muted-1)',
                    border: '1px solid var(--tl-color-danger)',
                    borderRadius: 4,
                    padding: '4px 8px',
                    cursor: 'pointer',
                    lineHeight: 1.4,
                    textAlign: 'center',
                    width: '100%',
                  }}
                >
                  {error}
                </div>
              )}
            </div>
          </Section>

          <Divider />

          {/* Section 2 — Note Style */}
          <Section label="Note Style" fs={fs.label}>
            <ComponentSelector
              presets={presets}
              selectedId={selectedPresetId}
              onSelect={onSelectPreset}
            />
          </Section>

          <Divider />

          {/* Section 3 — Import */}
          <Section label="Import Style" fs={fs.label}>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} style={{ display: 'none' }} />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '100%',
                background: 'var(--tl-color-low)',
                border: '1px solid var(--tl-color-divider)',
                borderRadius: 6,
                color: 'var(--tl-color-text)',
                fontSize: fs.body,
                padding: '7px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <UploadIcon />
              Import JSON
            </button>
            {importError && (
              <div style={{ fontSize: fs.hint, color: 'var(--tl-color-danger)', lineHeight: 1.4, marginTop: 6 }}>
                {importError}
              </div>
            )}
            <div style={{ fontSize: fs.hint, color: 'var(--tl-color-text-3)', lineHeight: 1.6, marginTop: 6 }}>
              Fields: <code style={{ color: 'var(--tl-color-primary)' }}>name</code>,{' '}
              <code style={{ color: 'var(--tl-color-primary)' }}>shape</code> (rectangle, ellipse, diamond, cloud, triangle…),{' '}
              <code style={{ color: 'var(--tl-color-primary)' }}>color</code> (tldraw color name){' '}
              or <code style={{ color: 'var(--tl-color-primary)' }}>bgColor</code> (hex, mapped to nearest),{' '}
              <code style={{ color: 'var(--tl-color-primary)' }}>size</code> (s | m | l | xl)
            </div>
          </Section>

          {/* ── Resize handles ─────────────────────────────────────── */}

          {/* Bottom-centre: height resize */}
          <div
            onPointerDown={onHResizePD}
            onPointerMove={onHResizePM}
            onPointerUp={onHResizePU}
            title="Drag to resize height"
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '6px 0 4px',
              cursor: 'ns-resize',
              flexShrink: 0,
            }}
          >
            <div style={{ width: 28, height: 3, borderRadius: 2, background: 'var(--tl-color-divider)', opacity: 0.6 }} />
          </div>

          {/* Bottom-right corner: width resize */}
          <div
            onPointerDown={onWResizePD}
            onPointerMove={onWResizePM}
            onPointerUp={onWResizePU}
            title="Drag to resize width"
            style={{
              position: 'absolute',
              bottom: 4,
              right: 4,
              width: 16,
              height: 16,
              cursor: 'nwse-resize',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.5,
            }}
          >
            <ResizeIcon />
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ label, children, fs }: { label: string; children: React.ReactNode; fs: number }) {
  return (
    <div style={{ padding: '12px 14px 14px' }}>
      <div style={{ fontSize: fs, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tl-color-text-3)', marginBottom: 10 }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--tl-color-divider)', margin: '0 12px' }} />
}

function GripIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="var(--tl-color-text-3)">
      {[0, 4, 8].map((x) => [0, 4, 8].map((y) => (
        <circle key={`${x}-${y}`} cx={x + 2} cy={y + 2} r={1.2} />
      )))}
    </svg>
  )
}

function ChevronIcon({ up }: { up: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      {up ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
    </svg>
  )
}

function ResizeIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" stroke="var(--tl-color-text-3)" strokeWidth="1.5" strokeLinecap="round">
      <line x1="9" y1="3" x2="3" y2="9" />
      <line x1="9" y1="6" x2="6" y2="9" />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}
