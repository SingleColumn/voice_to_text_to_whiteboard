import { useCallback, useRef, useState } from 'react'
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk'
import { STT_PROVIDERS, type STTProvider } from '../config/sttProviders'

type DeepgramConnection = ReturnType<ReturnType<typeof createClient>['listen']['live']>

interface UseSpeechRecognitionOptions {
  provider: STTProvider
  onTranscript: (text: string) => void
}

// ── Whisper helpers (outside component — no closure concerns) ────────────────

function getSupportedMimeType(): string {
  const candidates = ['audio/webm', 'audio/mp4', 'audio/ogg']
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? ''
}

async function transcribeWithWhisper(blob: Blob, mimeType: string): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set in the environment')

  const whisperConfig = STT_PROVIDERS.whisper
  const ext = mimeType.split('/')[1]?.split(';')[0] ?? 'webm'
  const formData = new FormData()
  formData.append('file', blob, `recording.${ext}`)
  formData.append('model', whisperConfig.model)

  const res = await fetch(whisperConfig.endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Whisper API error ${res.status}: ${body}`)
  }

  const data = await res.json()
  return data.text as string
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useSpeechRecognition({ provider, onTranscript }: UseSpeechRecognitionOptions) {
  const [isListening, setIsListening]   = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Refs — stable across renders, safe to capture in useCallback with [] deps.
  const connectionRef    = useRef<DeepgramConnection | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef        = useRef<MediaStream | null>(null)
  const chunksRef        = useRef<Blob[]>([])       // Whisper: raw audio chunks
  const mimeTypeRef      = useRef('')               // Whisper: chosen mime type
  const finalTextRef     = useRef('')               // Deepgram: committed segments
  const bestTextRef      = useRef('')               // Deepgram: final + current interim
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onTranscriptRef  = useRef(onTranscript)
  onTranscriptRef.current = onTranscript

  // ── Shared helpers ──────────────────────────────────────────────────────────

  function releaseMic() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  function commit(text: string) {
    if (text) onTranscriptRef.current(text)
    setInterimTranscript('')
    finalTextRef.current = ''
    bestTextRef.current  = ''
    setIsProcessing(false)
  }

  // ── Whisper path ────────────────────────────────────────────────────────────

  const startWhisper = useCallback(async () => {
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('Microphone access was denied.')
      return
    }
    streamRef.current = stream

    const mimeType = getSupportedMimeType()
    mimeTypeRef.current = mimeType
    chunksRef.current   = []

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    // onstop fires after stopWhisper() — all chunks collected, now transcribe.
    recorder.onstop = async () => {
      releaseMic()
      const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current || 'audio/webm' })
      chunksRef.current = []
      setIsListening(false)
      setIsProcessing(true)
      try {
        const text = await transcribeWithWhisper(blob, mimeTypeRef.current)
        commit(text.trim())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Transcription failed.')
        setIsProcessing(false)
      }
    }

    recorder.start()
    mediaRecorderRef.current = recorder
    setIsListening(true)
  }, []) // refs and state setters are stable — empty deps is safe

  const stopWhisper = useCallback(() => {
    // Stopping the recorder triggers recorder.onstop, which handles the rest.
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop()
    }
    mediaRecorderRef.current = null
  }, [])

  // ── Deepgram path ───────────────────────────────────────────────────────────

  const startDeepgram = useCallback(async () => {
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('Microphone access was denied.')
      return
    }
    streamRef.current = stream

    const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY
    if (!apiKey) {
      setError('DEEPGRAM_API_KEY is not set in the environment.')
      releaseMic()
      return
    }

    finalTextRef.current = ''
    bestTextRef.current  = ''

    const deepgramConfig = STT_PROVIDERS.deepgram
    const deepgram   = createClient(apiKey)
    const connection = deepgram.listen.live({
      model: deepgramConfig.model,
      ...deepgramConfig.params,
    })
    connectionRef.current = connection

    const recorder = new MediaRecorder(stream)
    mediaRecorderRef.current = recorder

    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0 && connection.getReadyState() === 1) {
        connection.send(event.data)
      }
    })

    // Start sending audio only once the WebSocket handshake completes.
    connection.on(LiveTranscriptionEvents.Open, () => {
      recorder.start(250)
    })

    // Accumulate transcripts — separate interim from final to avoid duplicates.
    connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const transcript = data.channel.alternatives[0].transcript
      if (!transcript) return

      let best: string
      if (data.is_final) {
        finalTextRef.current = (finalTextRef.current + ' ' + transcript).trim()
        best = finalTextRef.current
      } else {
        best = (finalTextRef.current + ' ' + transcript).trim()
      }
      bestTextRef.current = best
      setInterimTranscript(best)
    })

    // Close fires after requestClose() once all pending transcripts are delivered —
    // this is the reliable signal that Deepgram has finished processing.
    connection.on(LiveTranscriptionEvents.Close, () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current)
        fallbackTimerRef.current = null
      }
      commit(bestTextRef.current.trim())
      connectionRef.current = null
    })

    connection.on(LiveTranscriptionEvents.Error, (err) => {
      console.error('Deepgram error:', err)
      setError('Transcription connection failed.')
    })

    setIsListening(true)
  }, [])

  const stopDeepgram = useCallback(() => {
    // Stop the MediaRecorder — no more audio is sent to Deepgram.
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop()
    }
    mediaRecorderRef.current = null

    // Release the mic immediately so the browser indicator disappears.
    releaseMic()

    setIsListening(false)
    setIsProcessing(true)

    if (connectionRef.current) {
      // Safety net: if the Close event never arrives, commit after 3 s.
      fallbackTimerRef.current = setTimeout(() => {
        connectionRef.current = null
        commit(bestTextRef.current.trim())
      }, 3000)

      // Signal to Deepgram we are done sending audio. It will flush its buffer,
      // deliver any remaining transcripts, then fire LiveTranscriptionEvents.Close.
      connectionRef.current.requestClose()
    } else {
      setIsProcessing(false)
    }
  }, [])

  // ── Public interface ────────────────────────────────────────────────────────

  const startListening = useCallback(async () => {
    if (isListening || isProcessing) return
    setError(null)
    setInterimTranscript('')
    if (provider === 'whisper') await startWhisper()
    else await startDeepgram()
  }, [isListening, isProcessing, provider, startWhisper, startDeepgram])

  const stopListening = useCallback(() => {
    if (!isListening) return
    if (provider === 'whisper') stopWhisper()
    else stopDeepgram()
  }, [isListening, provider, stopWhisper, stopDeepgram])

  const dismissError = useCallback(() => setError(null), [])

  return { isListening, isProcessing, interimTranscript, startListening, stopListening, error, dismissError }
}
