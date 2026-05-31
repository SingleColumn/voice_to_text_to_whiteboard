# Voice Whiteboard — Specification

## Goal
Show that voice dictation can make whiteboarding faster and less effortful than typing. The viewer should leave thinking: "this feels more natural than clicking and typing."

## Audience
Non-technical — curious about voice-driven interfaces and new ways to think on a digital canvas.

---

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | React + Vite | Required by tldraw |
| Canvas | tldraw v5 | Infinite canvas, built-in geo shapes, programmatic element creation |
| Voice capture | MediaRecorder API | Standard browser primitive; reliable, all browsers, decoupled from transcription |
| Transcription (default) | Deepgram streaming (`@deepgram/sdk@3`, `nova-3`) | Real-time interim results shown while speaking; event-driven drain after mic stops |
| Transcription (alternate) | OpenAI Whisper API (`whisper-1`) | Batch fallback; simple HTTP call, works with any audio format MediaRecorder produces |
| Styling | tldraw CSS variables (`var(--tl-color-*)`) | All UI chrome outside the canvas uses tldraw's design tokens via `.tl-theme__dark` |

---

## Core Features

### 1. Voice Capture
- A single mic button starts and stops recording
- Uses the browser `MediaRecorder` API to record raw audio into a Blob
- Click-to-start requests mic permission and begins recording
- Click-to-stop ends recording and immediately sends the audio to Whisper
- No note is created if the transcript is empty

### 2. Transcription

The user selects a provider via a segmented toggle in the control panel (disabled while a session is active).

**Deepgram (default)**
- Opens a WebSocket to Deepgram's streaming API once the mic starts
- Audio chunks (250ms) are sent continuously; interim results update the live preview in the panel
- When mic stops, `requestClose()` signals end-of-speech; the connection flushes remaining audio and fires `Close` — the transcript is committed at that point (event-driven drain)
- A 3-second fallback timer commits the best transcript seen so far if `Close` never arrives
- API key read from `DEEPGRAM_API_KEY` system environment variable; exposed to the browser bundle as `import.meta.env.VITE_DEEPGRAM_API_KEY` by `vite.config.ts`

**Whisper**
- MediaRecorder collects the full audio Blob while the mic is open
- On mic stop, the Blob is POSTed to the OpenAI Whisper API (`POST /v1/audio/transcriptions`)
- While waiting, the button enters a "processing" state (spinner, disabled)
- API key read from `OPENAI_API_KEY` system environment variable; exposed as `import.meta.env.VITE_OPENAI_API_KEY` by `vite.config.ts`

Both providers: on success the transcript is committed as a note; on failure an error message is shown in the control panel and clicking it dismisses and resets to idle. No note is created for an empty transcript.

### 3. Note Creation
- Each transcript creates a new note on the canvas using the session's selected style preset
- **Placement**: grid layout, left-to-right, top-to-bottom
- **Camera**: after each note is created, the canvas moves to centre the new note in the viewport via `editor.centerOnPoint(...)`
- **Default size**: 220×140px
- No limit on number of notes per session

### 4. Note Behaviour
- Notes are editable after creation (user can click to edit text)
- Notes are draggable (click and drag to reposition)
- Notes can be manually resized via tldraw handles
- All notes in a session share the same style preset; they differ only in text content

### 5. Canvas Behaviour
- tldraw canvas fills the viewport
- Board state (notes + camera) persists automatically via tldraw's `persistenceKey` prop (localStorage)
- User can pan and zoom freely

---

## Mic Button States

| State | Colour | Icon | Behaviour |
|---|---|---|---|
| Idle | Green | Microphone | Click to start recording |
| Listening | Red | Stop square + pulse ring | Click to stop and process |
| Processing | Amber | Spinner | Disabled; waiting for transcript (Deepgram drain or Whisper HTTP) |
| Error | Orange | Microphone | Shows error message; click message to dismiss |

The status label next to the button reads: **Listening…** while the mic is open, **Processing…** (Deepgram) or **Transcribing…** (Whisper) while waiting for the result, and **Ready** at idle.

---

## Note Style Presets

Notes use tldraw's built-in `geo` shape. The `geo` prop accepts any of tldraw's 20 shape values — see JSON Import below for the full list.

### Built-in presets

| Preset | Shape | Default colour |
|---|---|---|
| Card | `rectangle` | Blue |
| Bubble | `ellipse` | Green |

The preset's `color` and `size` map directly to tldraw's `TLDefaultColorStyle` and `TLDefaultSizeStyle` — the tldraw style panel can also override them after creation.

### Component selector
- Part of the draggable control panel, top-right of canvas by default
- Shows a visual SVG preview of each preset (shape + colour)
- Selection applies to all notes created after it is changed; default is Card
- Custom presets can be added via JSON import

### JSON Import
Accepts a `.json` file with the following fields:

| Field | Type | Notes |
|---|---|---|
| `name` | string | Required. Shown as the preset label. |
| `shape` | string | Required. Any valid tldraw geo shape (see list below). |
| `color` | tldraw color name | Optional. One of the `TLDefaultColorStyle` values. |
| `bgColor` | hex string | Optional. Mapped to the nearest tldraw color if `color` is absent. |
| `size` | `"s"` \| `"m"` \| `"l"` \| `"xl"` | Optional. Defaults to `"m"`. |

**Valid shape values:** `rectangle`, `ellipse`, `diamond`, `triangle`, `cloud`, `star`, `hexagon`, `pentagon`, `octagon`, `oval`, `rhombus`, `rhombus-2`, `trapezoid`, `heart`, `arrow-right`, `arrow-left`, `arrow-up`, `arrow-down`, `check-box`, `x-box`

### Example presets

```json
{ "name": "Decision", "shape": "diamond",  "color": "orange", "size": "m" }
{ "name": "Idea",     "shape": "cloud",    "color": "violet", "size": "m" }
{ "name": "Alert",    "shape": "triangle", "color": "red",    "size": "m" }
```

The NotePreview SVG in `ComponentSelector.tsx` renders distinct icons for `rectangle`, `ellipse`, `diamond`, `triangle`, `cloud`, `star`, and `hexagon`; all other shapes fall back to a rounded rectangle preview.

---

## UI Chrome

- **Control panel**: draggable, collapsible, resizable panel (top-right by default) containing the mic button, status indicator, style selector, and JSON import
- **Status indicator**: state label (Idle / Recording / Transcribing / Error) shown inside the control panel near the mic button

---

## File Structure

```
src/
  App.tsx
  main.tsx
  canvas/
    VoiceCanvas.tsx           # tldraw instance + addNoteToCanvas helper
  hooks/
    useSpeechRecognition.ts   # Dual-provider STT hook (Deepgram streaming + Whisper batch)
  components/
    DraggablePanel.tsx        # Draggable/resizable control panel + provider toggle + JSON preset import
    MicButton.tsx             # State-aware mic button (idle / listening / processing)
    ComponentSelector.tsx     # Style preset picker + nearestTldrawColor + NOTE_COLORS
```

---

## Key Implementation Notes

- Dual-provider design: `useSpeechRecognition({ provider, onTranscript })` returns a uniform interface — `App` does not need to know which provider is active
- Deepgram: `finalTextRef` accumulates only `is_final` segments; `bestTextRef` (final + current interim) is the commit target — avoids duplicating words that appear in both interim and final results
- Whisper: audio format chosen at runtime via `MediaRecorder.isTypeSupported()` (prefers `audio/webm`, falls back to `audio/mp4`, then `audio/ogg`)
- `editor.createShape(...)` for programmatic note creation using the built-in `geo` shape type
- `toRichText(text)` (imported from `'tldraw'`) is required for the `richText` prop — plain strings are not accepted by geo shapes
- `editor.centerOnPoint(...)` to move the camera to each new note (instant, no animation)
- tldraw's `persistenceKey` prop handles localStorage persistence automatically — no custom persistence code needed

---

## Setup

```bash
# Set API keys in your shell environment (add to ~/.zshrc or ~/.bashrc to persist)
export DEEPGRAM_API_KEY=your-deepgram-key-here   # required for Deepgram (default provider)
export OPENAI_API_KEY=your-openai-key-here        # required for Whisper

npm install
npm run dev
```

On Windows (PowerShell):
```powershell
$env:DEEPGRAM_API_KEY = "your-deepgram-key-here"
$env:OPENAI_API_KEY   = "your-openai-key-here"
npm run dev
```

---

## Out of Scope (v1)

- Controlling note shape, size, font, or colour via voice
- Backend or database persistence
- Multi-user / collaboration
- Export (PDF, image)
- Note tagging or categorisation
- Per-note style variation within a session

---

## Done When
- User can dictate multiple notes onto a shared whiteboard canvas
- Each note displays the transcribed text (Deepgram or Whisper)
- Interim transcript is shown in real time while speaking (Deepgram)
- User can switch between Deepgram and Whisper via a toggle in the control panel
- Notes are auto-laid-out without overlapping
- User can choose a style preset before or during the session
- Board state persists across page reloads
- The full flow works end-to-end in a local browser

---

## Upgrade Path (v2+)

- Supabase for cross-device board persistence
- tldraw multiplayer sync for collaboration
- Expanded preset library (speech bubbles, index cards, hexagons)
- Per-note colour selection within a session
- Voice commands to edit note properties (shape, colour, size)
