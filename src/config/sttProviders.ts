export type STTProvider = 'deepgram' | 'whisper'

export type DeepgramProviderConfig = {
  label: string
  mode: 'streaming'
  transport: 'sdk-live'
  model: string
  params: {
    language: string
    smart_format: boolean
    interim_results: boolean
    utterance_end_ms: number
  }
}

export type WhisperProviderConfig = {
  label: string
  mode: 'batch'
  endpoint: string
  model: string
}

type STTProviderConfigMap = {
  deepgram: DeepgramProviderConfig
  whisper: WhisperProviderConfig
}

export const STT_PROVIDERS: STTProviderConfigMap = {
  deepgram: {
    label: 'Deepgram',
    mode: 'streaming',
    transport: 'sdk-live',
    model: 'nova-3',
    params: {
      language: 'en',
      smart_format: true,
      interim_results: true,
      utterance_end_ms: 1000,
    },
  },
  whisper: {
    label: 'Whisper',
    mode: 'batch',
    endpoint: 'https://api.openai.com/v1/audio/transcriptions',
    model: 'whisper-1',
  },
}

export const DEFAULT_STT_PROVIDER: STTProvider = 'deepgram'
