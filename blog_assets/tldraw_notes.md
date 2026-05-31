# tldraw Notes

---

## A single primitive over a fixed catalogue

The built-in `note` shape is an opinionated sticky note: the geometry is always a rounded rectangle, dimensions adjust automatically to fit the text content, and colour is applied as a single value that tldraw maps to a paired background and stroke — you choose a named colour, not individual fill and border values. The `geo` shape trades that convenience for control: geometry is a prop you set explicitly from twenty options, dimensions are fixed values you define, fill and stroke are independent, and vertical alignment is configurable. Where `note` is a ready-made object with sensible defaults for quick capture, `geo` is a primitive you configure — the same underlying mechanism whether you are placing a rectangle, a diamond, or a cloud.

---

## Direct access to a fully open document store

tldraw is built around a single reactive document store where every shape is a plain, fully-typed record — readable and writable via a clean editor API with no special access required. Any property on any shape can be changed with one call, and the canvas re-renders automatically. The schema is open and versioned, the library ships with persistence, undo/redo, multiplayer sync, and a complete set of diagramming primitives out of the box. Crucially, the same objects a user manipulates by hand are the same objects code can manipulate programmatically — there is no separate "scripting layer" or secondary API. That symmetry between user interaction and programmatic control is what makes it unusually well-suited for applications where code and the user share authorship of the canvas.

---

## An open store versus a closed platform

By contrast, Figma is a closed system: the canvas state lives on Figma's servers in a proprietary format, and programmatic access is mediated through a REST API that exposes only what Figma chooses to expose. You can read and write some properties, but you are working against a published interface, not the document itself — the underlying data model is not yours to inspect or extend. tldraw's store is the document; there is no intermediary. Because the schema is open and the editor API gives direct access to every record, a developer can build behaviour that is indistinguishable from the application itself — voice-driven edits, generative layout, real-time data binding — without waiting for a platform to add a feature or lift an API restriction.

---

## A data model built for natural language and LLM integration

Because every shape is a plain JSON record with a small, fixed set of typed properties, it maps naturally to the kind of structured output an LLM can produce reliably. The data model is narrow enough that you can describe it fully in a prompt — telling a model exactly what fields exist, what values they accept, and what a valid record looks like. The model can then return a complete or partial record that is applied directly to the store with no parsing ambiguity. The same logic applies to voice: a transcribed phrase like "make it red" or "change to diamond" maps to a single prop change on a known schema. The format is simple enough that the translation from natural language to data mutation is a shallow problem, not a deep one.
