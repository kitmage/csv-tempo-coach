# Tempo Coach

A completely client-side CSV metronome and cue reader. Tempo Coach schedules synthesized clicks against the Web Audio clock, displays each timeline cue, and can announce cues using browser speech synthesis. Files remain local to the browser, so the app is suitable for GitHub Pages.

## CSV format

Use the required headers `timestamp,bpm,text`. Timestamps accept `MM:SS` or `HH:MM:SS`; BPM must be from 20 through 300. Quoted fields, embedded commas, escaped quotes, Windows line endings, and UTF-8 BOMs are supported. Empty cue text is allowed.

```csv
timestamp,bpm,text
00:00,120,Begin
00:10,60,Slow down
00:20,180,Speed up
```

Rows are sorted chronologically. Duplicate timestamps are allowed with a warning; later rows at the same timestamp become active last and therefore control the tempo.

## Premade workouts

Premade workouts live in [`workouts/`](workouts/) and are listed in `workouts/index.json`. The manifest is a JSON array; every record must provide a stable display `name` and a `file` path relative to the `workouts/` directory:

```json
[
  { "name": "Beginner Intervals", "file": "beginner-intervals.csv" }
]
```

To add a workout:

1. Create its CSV beneath `workouts/` using the `timestamp,bpm,text` format described above.
2. Add a manifest record to `workouts/index.json`. Use a non-empty, user-facing name and a relative path ending in `.csv`; do not use an absolute path or `..` path segments.
3. Serve the app locally and choose the new entry from **Premade workout** to verify it loads.

Both the manifest and workout requests use relative URLs so they continue to work when the site is deployed beneath a GitHub Pages project subpath.

## Run locally

Because JavaScript modules require HTTP, serve the repository rather than opening `index.html` directly:

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000>, choose a CSV (try [`examples/example.csv`](examples/example.csv)), and press **Start**. Audio begins only from that button gesture to comply with browser autoplay rules.

## Test

Node.js 20 or newer is recommended. There are no package dependencies.

```sh
npm test
```

## Deploy to GitHub Pages

In the repository's **Settings → Pages**, choose **Deploy from a branch**, select the default branch and `/ (root)`, then save. The app uses relative static assets and needs no build step, server, database, or environment variables. GitHub will show the public URL after deployment completes.

## Browser notes

Web Audio is the playback clock. A short 25 ms JavaScript scheduler only keeps an approximately 100 ms audio buffer filled; the browser audio timeline produces the actual clicks. Speech voices and precise speech timing vary by operating system. Background tabs and locked mobile devices may still be throttled by the browser.
