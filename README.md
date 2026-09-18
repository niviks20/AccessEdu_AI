# AccessEdu — Paavai Engineering College

An accessibility assistance platform built around four features: **AI Academic Bot**,
**AccessPath‑AI**, **Communication**, and **Campus Toolkit**. Every page is keyboard-operable,
screen-reader-friendly (semantic HTML + ARIA landmarks/live regions), and has a high-contrast
mode, adjustable text size, and a read-page-aloud button built into the top bar.

## Quick start

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # then fill in real values — see below
python app.py                   # http://localhost:5000
```

You need at least `GROQ_API_KEY` set for the AI Academic Bot's Learn / Exam Notes / Voice
Practice tabs to work (get one free at console.groq.com). Everything else — AccessPath‑AI,
Communication, and the Campus Toolkit — works with no API key at all.

**Change `ADMIN_USERNAME` / `ADMIN_PASSWORD` and `FLASK_SECRET_KEY` before putting this in
front of real students.** The defaults are for local testing only.

## What's real vs. what's sample data

- **AI Academic Bot**: fully working. `academic.db` already has one real indexed unit
  (Cloud Computing, Unit 1, 6 topics, 88 chunks) extracted from a PDF via `index_pdf.py`.
  To add more subjects/units, edit `index_pdf.py` with the right PDF path/subject/unit and
  run `python index_pdf.py`, or build a small admin upload page around `pdf_processor.py`.
- **AccessPath‑AI**: the pathfinding engine (`accesspath_data.py`, Dijkstra over a graph of
  named locations) is fully working and tested. **The campus map data itself — building
  names, distances, which paths have ramps vs. stairs — is a placeholder sample layout**,
  not a survey of the real Paavai Engineering College campus. Update `NODES` and `EDGES` in
  `accesspath_data.py` with real building names and a real walk-through of the campus before
  relying on it for navigation.
- **Communication**: fully working, no server or API needed — it runs entirely on the
  browser's built-in Web Speech API (live captions, type-to-speak, quick-phrase board).
  Requires Chrome or another browser with Web Speech API support; Safari/Firefox support is
  limited for speech recognition.
- **Campus Toolkit**: outpass, slot booking, food ordering, marketplace, announcements,
  mobility/transport requests, and admin views are fully working against a local SQLite
  database (`database.db`, created automatically on first run). Emergency SOS logs an alert
  with an optional location — **wire `/api/sos/alert` to real SMS/security-desk notification
  before relying on it in an actual emergency**, and replace the placeholder phone numbers in
  `templates/sos.html`.
- **Attendance** is a labelled placeholder pending an ERP data source.

## Project layout

```
app.py                  Flask app: auth + all routes/APIs for the four features
database.py             Academic RAG database (subjects/units/topics/chunks)
ai_service.py           Groq calls: generate_learn / generate_notes / practice Q&A
retriever.py            Lightweight keyword-based retrieval over indexed chunks
pdf_processor.py        Splits a unit PDF into numbered topics + page-tagged chunks
pratice_service.py      Viva/practice session flow and scoring
notes_service.py        Formats generated notes for sharing/PDF export
accesspath_data.py      Campus location graph + Dijkstra pathfinder
templates/, static/     All pages + the shared accessibility toolbar (static/js/accessibility.js)
```

## Accessibility notes for whoever extends this

- Keep using `id="main-content"` + the skip link on any new page (`base.html` handles both).
- Any new interactive control needs a visible focus style (already global) and an
  accessible name — either visible text or `aria-label`.
- Use `window.AccessEdu.speak(text)` for read-aloud and `window.AccessEdu.getRecognition()`
  for voice input, rather than calling the Web Speech API directly, so behaviour stays
  consistent across pages.
- Don't rely on color alone (see the `.chip` variants for status — each also has a text label).
