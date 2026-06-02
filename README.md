# Voice Whiteboard

A browser demo that turns spoken words into sticky notes on an infinite canvas. 
The goal is to test whether voice input makes whiteboarding feel less effortful.

---

## Prerequisites

- Node.js 18+
- A Deepgram API key (used for the default streaming transcription)
- An OpenAI API key (used for the Whisper batch transcription option)
- Chrome or Edge (required for MediaRecorder)

---

## Install & Run

```bash
# Set both API keys in your shell environment (add to ~/.zshrc or ~/.bashrc to persist)
export DEEPGRAM_API_KEY=your-deepgram-key-here
export OPENAI_API_KEY=your-openai-key-here

npm install
npm run dev
```

On Windows (PowerShell):
```powershell
$env:DEEPGRAM_API_KEY = "your-deepgram-key-here"
$env:OPENAI_API_KEY   = "your-openai-key-here"
npm run dev
```

Then open http://localhost:5173 in your browser.

---

## How to Use

1. Choose a note style (Card or Bubble) from the control panel on the right
2. Optionally switch the transcription provider using the **Deepgram / Whisper** toggle at the top of the panel
3. Click the mic button to activate the microphone
4. Start speaking — with Deepgram you'll see a live transcript preview as you speak
5. Click the mic button again to deactivate the microphone — the note appears on the whiteboard once transcription finishes
6. Repeat to add more notes; the canvas organises them automatically
7. Pan and zoom freely; your board is saved automatically and restored on reload

The control panel is draggable and resizable. You can also import custom styles via the **Import JSON** button — see the JSON format below.

---

## Custom Style JSON Format

Click **Import JSON** in the control panel to load a `.json` file as a new note style. Ready-made presets are in the [`custom_notes/`](custom_notes/) folder — just import whichever you want.

| Field | Required | Values |
|---|---|---|
| `name` | Yes | Any string — shown as the preset label |
| `shape` | Yes | Any tldraw geo shape name (see list below) |
| `color` | No | Any tldraw color name (see list below) |
| `bgColor` | No | Hex colour — mapped to the nearest tldraw color (use instead of `color`) |
| `size` | No | `"s"`, `"m"`, `"l"`, or `"xl"` — defaults to `"m"` |

**Supported shapes:** `rectangle`, `ellipse`, `diamond`, `triangle`, `cloud`, `star`, `hexagon`, `pentagon`, `octagon`, `oval`, `rhombus`, `rhombus-2`, `trapezoid`, `heart`, `arrow-right`, `arrow-left`, `arrow-up`, `arrow-down`, `check-box`, `x-box`

**Supported colors:** `blue`, `green`, `red`, `orange`, `yellow`, `violet`, `light-blue`, `light-green`, `light-red`, `light-violet`, `grey`, `black`, `white`

### Included presets (`custom_notes/`)

| File | Shape | Use for |
|---|---|---|
| `decision.json` | Diamond / orange | Choices and branching questions |
| `idea.json` | Cloud / violet | Free-form brainstorming |
| `alert.json` | Triangle / red | Urgent or high-priority items |
| `large_card.json` | Rectangle / grey / large | Longer notes |

---

## Project Structure

```
src/
  App.tsx                          # Root component — wires state and layout
  canvas/VoiceCanvas.tsx           # tldraw canvas + note injection logic
  hooks/useSpeechRecognition.ts    # Dual-provider STT hook (Deepgram streaming + Whisper batch)
  components/DraggablePanel.tsx    # Draggable control panel + provider toggle + JSON preset import
  components/MicButton.tsx         # State-aware mic button (idle / listening / processing)
  components/ComponentSelector.tsx # Style preset picker
```
