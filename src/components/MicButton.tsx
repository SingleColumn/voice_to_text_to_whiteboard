interface MicButtonProps {
  isListening: boolean
  isProcessing: boolean
  onStart: () => void
  onStop: () => void
}

export function MicButton({ isListening, isProcessing, onStart, onStop }: MicButtonProps) {
  function handleClick() {
    if (isProcessing) return
    isListening ? onStop() : onStart()
  }

  const title = isProcessing ? 'Processing…' : isListening ? 'Stop recording' : 'Record a note'

  return (
    <button
      onClick={handleClick}
      disabled={isProcessing}
      title={title}
      aria-label={title}
      style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        border: '1px solid var(--tl-color-divider)',
        background: isListening
          ? 'var(--tl-color-danger)'
          : 'var(--tl-color-panel-contrast)',
        color: 'var(--tl-color-text)',
        cursor: isProcessing ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isProcessing ? 0.6 : 1,
        transition: 'background 0.15s, opacity 0.15s',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {isListening && (
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
      {isProcessing ? <SpinnerIcon /> : isListening ? <StopIcon /> : <MicIcon />}
    </button>
  )
}

function SpinnerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  )
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
