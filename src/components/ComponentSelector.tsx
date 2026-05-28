import type { TLDefaultColorStyle, TLDefaultSizeStyle } from 'tldraw'

// Hard-coded dark theme note colours extracted from DEFAULT_THEME.colors.dark.
// Used in ComponentSelector previews (which live outside the tldraw React context).
const NOTE_COLORS: Record<TLDefaultColorStyle, { noteFill: string; noteText: string }> = {
  black:          { noteFill: '#2c2c2c', noteText: '#f2f2f2' },
  grey:           { noteFill: '#56595F', noteText: '#f2f2f2' },
  blue:           { noteFill: '#2A3F98', noteText: '#f2f2f2' },
  'light-blue':   { noteFill: '#1F5495', noteText: '#f2f2f2' },
  green:          { noteFill: '#014429', noteText: '#f2f2f2' },
  'light-green':  { noteFill: '#21581D', noteText: '#f2f2f2' },
  red:            { noteFill: '#7e201f', noteText: '#f2f2f2' },
  'light-red':    { noteFill: '#7a3333', noteText: '#f2f2f2' },
  orange:         { noteFill: '#7c3905', noteText: '#f2f2f2' },
  yellow:         { noteFill: '#8a5e1c', noteText: '#f2f2f2' },
  violet:         { noteFill: '#5f1c70', noteText: '#f2f2f2' },
  'light-violet': { noteFill: '#762F8E', noteText: '#f2f2f2' },
  white:          { noteFill: '#eaeaea', noteText: '#1d1d1d' },
}

export interface Preset {
  id: string
  label: string
  shape: string
  color: TLDefaultColorStyle
  size: TLDefaultSizeStyle
}

export const DEFAULT_PRESETS: Preset[] = [
  { id: 'rectangle', label: 'Card',   shape: 'rectangle', color: 'blue',  size: 'm' },
  { id: 'ellipse',   label: 'Bubble', shape: 'ellipse',   color: 'green', size: 'm' },
]

// Maps an arbitrary hex colour to the nearest tldraw colour by RGB distance.
export function nearestTldrawColor(hex: string): TLDefaultColorStyle {
  function toRgb(h: string): [number, number, number] {
    const n = parseInt(h.replace('#', ''), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const [r1, g1, b1] = toRgb(hex)
  let best: TLDefaultColorStyle = 'blue'
  let bestDist = Infinity
  for (const [name, { noteFill }] of Object.entries(NOTE_COLORS) as [TLDefaultColorStyle, { noteFill: string }][]) {
    const [r2, g2, b2] = toRgb(noteFill)
    const dist = (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2
    if (dist < bestDist) { bestDist = dist; best = name }
  }
  return best
}

interface ComponentSelectorProps {
  presets: Preset[]
  selectedId: string
  onSelect: (id: string) => void
}

export function ComponentSelector({ presets, selectedId, onSelect }: ComponentSelectorProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {presets.map((preset) => {
        const isSelected = selectedId === preset.id
        const colors = NOTE_COLORS[preset.color]
        return (
          <button
            key={preset.id}
            onClick={() => onSelect(preset.id)}
            style={{
              background: isSelected ? 'var(--tl-color-muted-1)' : 'transparent',
              border: `1px solid ${isSelected ? 'var(--tl-color-selected)' : 'var(--tl-color-divider)'}`,
              borderRadius: 6,
              cursor: 'pointer',
              padding: '6px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
            }}
          >
            <NotePreview shape={preset.shape} noteFill={colors.noteFill} noteText={colors.noteText} />
            <span style={{ fontSize: 'inherit', color: 'var(--tl-color-text)', fontFamily: "'Syne', sans-serif" }}>
              {preset.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function NotePreview({ shape, noteFill, noteText }: { shape: string; noteFill: string; noteText: string }) {
  const w = 36, h = 24
  let shapeEl: React.ReactNode
  let textY = h / 2

  if (shape === 'ellipse') {
    shapeEl = <ellipse cx={w / 2} cy={h / 2} rx={w / 2 - 1} ry={h / 2 - 1} fill={noteFill} />
  } else if (shape === 'diamond') {
    shapeEl = <polygon points={`${w / 2},1 ${w - 1},${h / 2} ${w / 2},${h - 1} 1,${h / 2}`} fill={noteFill} />
  } else if (shape === 'triangle') {
    shapeEl = <polygon points={`${w / 2},2 ${w - 1},${h - 1} 1,${h - 1}`} fill={noteFill} />
    textY = 17
  } else if (shape === 'star') {
    const cx = w / 2, cy = h / 2, outerR = 10, innerR = 4
    const pts = Array.from({ length: 10 }, (_, i) => {
      const angle = (i * Math.PI) / 5 - Math.PI / 2
      const r = i % 2 === 0 ? outerR : innerR
      return `${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`
    }).join(' ')
    shapeEl = <polygon points={pts} fill={noteFill} />
  } else if (shape === 'hexagon') {
    const pts = [0, 1, 2, 3, 4, 5].map((i) => {
      const a = (i * Math.PI) / 3
      return `${(w / 2 + 11 * Math.cos(a)).toFixed(1)},${(h / 2 + 11 * Math.sin(a)).toFixed(1)}`
    }).join(' ')
    shapeEl = <polygon points={pts} fill={noteFill} />
  } else if (shape === 'cloud') {
    // Three overlapping circles form the bumps; a rectangle fills the flat base.
    shapeEl = (
      <g fill={noteFill}>
        <circle cx={10} cy={15} r={6} />
        <circle cx={18} cy={11} r={7} />
        <circle cx={26} cy={15} r={6} />
        <rect x={4} y={15} width={28} height={8} />
      </g>
    )
    textY = 19
  } else {
    // rectangle and all other tldraw geo shapes fall back to a rounded rect
    shapeEl = <rect x={1} y={1} width={w - 2} height={h - 2} rx={3} fill={noteFill} />
  }

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ flexShrink: 0 }}>
      {shapeEl}
      <text
        x={w / 2} y={textY}
        textAnchor="middle" dominantBaseline="middle"
        fill={noteText} fontSize={7} fontFamily="Syne, sans-serif"
      >
        Aa
      </text>
    </svg>
  )
}
