import type { RecorderState } from '../hooks/useVoiceRecorder'

interface MicButtonProps {
  state: RecorderState
  onStart: () => void
  onStop: () => void
  onDismissError: () => void
}

const TOOLTIP: Record<RecorderState, string> = {
  idle: 'Record a note',
  recording: 'Stop recording',
  transcribing: 'Transcribing…',
  error: 'Transcription failed — click to retry',
}

// Background uses tldraw CSS variables (resolved by the parent .tl-theme__dark wrapper).
const BG: Record<RecorderState, string> = {
  idle:        'var(--tl-color-panel-contrast)',
  recording:   'var(--tl-color-danger)',
  transcribing:'var(--tl-color-panel-contrast)',
  error:       'var(--tl-color-warning)',
}

export function MicButton({ state, onStart, onStop, onDismissError }: MicButtonProps) {
  const isRecording = state === 'recording'
  const isBusy = state === 'transcribing'

  function handleClick() {
    if (isBusy) return
    if (state === 'error') { onDismissError(); return }
    isRecording ? onStop() : onStart()
  }

  return (
    <button
      onClick={handleClick}
      disabled={isBusy}
      title={TOOLTIP[state]}
      aria-label={TOOLTIP[state]}
      style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        border: '1px solid var(--tl-color-divider)',
        background: BG[state],
        color: 'var(--tl-color-text)',
        cursor: isBusy ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isBusy ? 0.6 : 1,
        transition: 'background 0.15s, opacity 0.15s',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {isRecording && (
        <span
          style={{
            position: 'absolute',
            inset: -4,
            borderRadius: '50%',
            border: '2px solid var(--tl-color-danger)',
            animation: 'pulse-ring 1.2s ease-out infinite',
            pointerEvents: 'none',
          }}
        />
      )}
      <MicIcon state={state} />
    </button>
  )
}

function MicIcon({ state }: { state: RecorderState }) {
  if (state === 'transcribing') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10">
          <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite" />
        </circle>
      </svg>
    )
  }
  if (state === 'recording') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="6" width="12" height="12" rx="2" />
      </svg>
    )
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
