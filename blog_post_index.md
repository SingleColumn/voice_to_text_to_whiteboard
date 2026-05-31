# Blog Post Index — Voice Whiteboard

---

**The gap that kills ideas**
*Why good thinking dies between the moment of inspiration and the moment it reaches the page.*

The argument here is cognitive, not technical. When the cost of capturing a thought — reaching for a mouse, opening a tool, choosing where to click — is higher than the thought feels worth, the thought is lost. This section sets up the problem the demo is trying to solve, without any code or product references. It should be short and land with recognition: the reader should finish it thinking "yes, I know exactly what this feels like."

---

**The hypothesis**
*Voice input should reduce whiteboarding friction — but "should" needs testing.*

The claim is not that voice is universally better. It's that for the specific act of externalising a thought mid-flow — getting it out of your head and onto a surface — voice removes more friction than it introduces. This section names the hypothesis explicitly and explains why a working prototype is a better test of it than an argument. It should also acknowledge the obvious objection: voice input in a shared space, or while distracted, is worse than typing. The demo is a probe, not a product.

---

**Three tools, one pipeline**
*MediaRecorder for capture, Whisper for transcription, tldraw for the canvas. Why each was chosen, and why keeping the three stages decoupled matters.*

Each of the three tools owns exactly one responsibility, and none of them knows about the others. MediaRecorder captures audio and produces a Blob — it has no opinion about what happens to it. Whisper receives the Blob and returns a string — it has no opinion about where the string goes. tldraw receives the string and places it on a canvas — it has no opinion about how the string arrived. This section should explain why that decoupling is a deliberate design choice rather than an accident of simplicity: each stage can fail independently, be swapped out independently, and be tested independently. The practical consequence is that swapping Whisper for a streaming STT provider requires touching exactly one function.

---

**The infinite canvas as a thinking surface**
*Why a zoomable, pannable plane is a better match for nonlinear thought than a scrollable document.*

A document has an axis — top to bottom. An infinite canvas doesn't. This section makes the case that spatial freedom is the right default for early-stage thinking, because the relationships between ideas aren't known yet when the ideas are first being captured. It should cover tldraw's role here: a canvas that can be programmatically written to is fundamentally different from one that requires manual interaction. The notes appear where the system decides, the camera follows each new note, and the user never has to think about placement. The cognitive load that goes away is exactly the kind that competes with the thinking being captured.

---

**A note is just a record**
*Every shape on the canvas is a plain JSON object. The demo edits one property — `richText`. The rest of the record is already there.*

This section opens the hood. A tldraw geo shape is a JSON record with a small, stable set of properties: `geo` (the shape type), `richText` (the text content), `color`, `fill`, `size`, `font`, `align`, `verticalAlign`, `w`, `h`. The demo touches only `richText` via voice — but every other property is equally mutable via a single `editor.updateShape()` call. The point is not that the demo should do more. The point is that the architecture already supports it, and the reader should leave this section understanding exactly what "voice-driven styling" would mean in concrete terms: a voice command that calls `updateShape` with `{ color: 'red' }` is the same operation as one that calls it with `{ richText: toRichText('new text') }`. The shape record is the interface.

---

**Teaching the board new shapes**
*How a small JSON preset system turns a two-shape demo into an extensible toolkit — without touching the source code.*

The demo ships with two built-in note styles. It also ships with a JSON import button and four ready-made presets in a `custom_notes/` folder. This section explains why that matters more than it sounds: the preset system is a seam between the tool and the user. Anyone who can write a three-line JSON file can extend the vocabulary of the canvas — adding a diamond for decisions, a cloud for loose ideas, a triangle for alerts. The section should cover the structure of a preset file (four fields: `name`, `shape`, `color`, `size`) and connect it back to the earlier point about tldraw's shape record: a preset is just a partial record specifying the default values for a new note.

---

**The minimum viable probe**
*What this demo actually tests — and what it deliberately does not.*

This section is about honesty. The demo does not test whether voice input scales, whether it works in a noisy environment, whether it is faster than typing across a full session, or whether it helps with the harder parts of thinking rather than just the initial capture. What it does test is narrower and more answerable: does the absence of click-to-place and type-to-input change the subjective feeling of putting a thought onto a canvas? The section should name everything that is out of scope — no backend, no collaboration, no streaming transcription, no voice-controlled styling — and explain why keeping the scope this tight is what makes the probe legible.

---

**What comes next**
*From text editing to voice-driven styling. Where the architecture naturally leads.*

The natural escalation from this demo runs in three steps. V1 (this project): voice edits one property of the shape record — the text. V2 (the obvious next step): voice edits style properties — "make that one red," "change it to a cloud," "make it larger." The architecture is already there; the only new work is parsing intent from a voice command and mapping it to a property name and value. V3 (the interesting question): voice as a general-purpose editor for any object on the canvas — not just notes, but connections, groups, annotations. At that point the canvas is no longer a whiteboard with a voice input feature. It is a voice-addressable data structure that happens to render as a canvas. That reframe is where the demo stops being a prototype and starts being a hypothesis about a different kind of interface.

---

## Where the data structure ideas belong

The ideas elaborated in the earlier discussion — the JSON record structure, `editor.updateShape()` as a universal mutation mechanism, and the V1/V2/V3 escalation story — split across two sections:

- **"A note is just a record"** is where the structure gets shown concretely: the JSON snippet, the full list of mutable props, and the observation that `richText` is just one of them. This is the technical foundation.
- **"What comes next"** is where the escalation story lands: V1 edits text, V2 edits style, V3 is a voice-addressable canvas. The data structure section earns that conclusion — without it, the V2/V3 story sounds like speculation. With it, it reads as the logical extension of something the reader already understands.
