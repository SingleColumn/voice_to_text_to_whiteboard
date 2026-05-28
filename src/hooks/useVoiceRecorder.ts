import { useCallback, useRef, useState } from 'react'

export type RecorderState = 'idle' | 'recording' | 'transcribing' | 'error'

interface UseVoiceRecorderOptions {
  onCommit: (transcript: string) => void
}

// Pick the best supported audio format for Whisper
function getSupportedMimeType(): string {
  const candidates = ['audio/webm', 'audio/mp4', 'audio/ogg']
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? ''
}

async function transcribeWithWhisper(blob: Blob, mimeType: string): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set in the environment')

  const ext = mimeType.split('/')[1]?.split(';')[0] ?? 'webm'
  const formData = new FormData()
  formData.append('file', blob, `recording.${ext}`)
  formData.append('model', 'whisper-1')

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Whisper API error ${res.status}: ${body}`)
  }

  const json = await res.json()
  return json.text as string
}

export function useVoiceRecorder({ onCommit }: UseVoiceRecorderOptions) {
  const [state, setState] = useState<RecorderState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const onCommitRef = useRef(onCommit)
  onCommitRef.current = onCommit

  const startRecording = useCallback(async () => {
    if (state !== 'idle') return
    setErrorMessage(null)

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setState('error')
      setErrorMessage('Microphone access was denied.')
      return
    }

    const mimeType = getSupportedMimeType()
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    chunksRef.current = []

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = async () => {
      // Stop all mic tracks so the browser releases the microphone
      stream.getTracks().forEach((t) => t.stop())

      const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
      setState('transcribing')

      try {
        const text = await transcribeWithWhisper(blob, mimeType)
        if (text.trim()) onCommitRef.current(text.trim())
        setState('idle')
      } catch (err) {
        setState('error')
        setErrorMessage(err instanceof Error ? err.message : 'Transcription failed.')
      }
    }

    recorder.start()
    mediaRecorderRef.current = recorder
    setState('recording')
  }, [state])

  const stopRecording = useCallback(() => {
    if (state !== 'recording' || !mediaRecorderRef.current) return
    mediaRecorderRef.current.stop()
    mediaRecorderRef.current = null
    // state transitions to 'transcribing' inside onstop
  }, [state])

  const dismissError = useCallback(() => {
    setState('idle')
    setErrorMessage(null)
  }, [])

  return { state, errorMessage, startRecording, stopRecording, dismissError }
}
