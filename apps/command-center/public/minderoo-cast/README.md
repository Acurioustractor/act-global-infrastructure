# How to swap images on the Minderoo pitch

Three folders, one rule, two ways to do it.

## Where the images live

| Folder                            | What goes here                                                                |
|-----------------------------------|-------------------------------------------------------------------------------|
| `/minderoo-cast/`                 | The 18 storyteller portraits + Kristy hero photo                              |
| `/minderoo-artefact/`             | The Stay Series slipcase, library shelf, journal covers, interior spreads     |

Anything you drop into either folder is served immediately at `/<folder>/<filename>` once the page reloads.

## The rule

Filenames are stable. The HTML points at a specific filename. **Replace the file, the page picks it up.** No HTML edit needed if you keep the filename.

If you want a different filename, edit the `<img src=>` in the page to match.

---

## Way 1 — Edit mode (recommended for finding what to swap)

Open the page with `?edit=1` in the URL. Every image gets a dashed outline. Hover any image and the file path overlays in monospace. Click to copy the path to clipboard.

```
http://localhost:3022/minderoo-pitch.html?edit=1
```

Same for the deep pages:

```
http://localhost:3022/library.html?edit=1
http://localhost:3022/justicehub-intelligence.html?edit=1
```

This shows you exactly which file to replace.

## Way 2 — Direct file replace (the fast way once you know the file)

```bash
# 1. Find the file you want to swap
ls apps/command-center/public/minderoo-cast/

# 2. Drop the new image into the folder, same filename
cp ~/Downloads/new-kristy-portrait.jpg \
   apps/command-center/public/minderoo-cast/kristy_bloomfield-b47e2f09.jpg

# 3. Reload the page. Done.
```

If the new image is a different filename:

```bash
# 1. Drop into the folder
cp ~/Downloads/new-kristy-shot.jpg \
   apps/command-center/public/minderoo-cast/kristy-2026-04-22.jpg

# 2. Find the line in apps/command-center/public/minderoo-pitch.html that
#    references the OLD path
grep -n "kristy_bloomfield-b47e2f09" apps/command-center/public/minderoo-pitch.html

# 3. Edit the path to the new filename. Reload.
```

---

## How a new image gets cached the first time

When the pitch page is rebuilt or new cast is added, run:

```bash
node scripts/pitch-cache-avatars.mjs
```

This finds every Supabase storage URL in `minderoo-pitch.html`, downloads it to `/minderoo-cast/`, and rewrites the HTML to point at the local copy. Idempotent — already-cached files are skipped.

---

## Image inventory (current)

### `/minderoo-cast/` — 19 files

- `kristy-atnarpa.jpg` — hero photo (Kristy on Country, Atnarpa Homestead)
- 18 round-portrait avatars, named after the storyteller plus an 8-character hash
  to keep them stable across re-caches.

### `/minderoo-artefact/` — 15 files

- `stay-series-slipcase.png` — the open box of seven anchor-named volumes (lead artefact image on the pitch)
- `stay-series-library.png` — the seven volumes on a bookshelf
- `journal-cover-stay.png` / `-embossed.png` / `-label.png` — three journal cover variants
- `journal-closed.png` — closed kraft journal
- `three-circles-spread.png` — interior spread showing the Three Circles diagram
- `three-ripples-spread.png` / `alma-loop-spread.png` / `lcaa-loop-spread.png` / `fire-crescendo-spread.png` — method spreads
- `field-diagnostic-spread.png` / `intentionality-canvas-spread.png` / `field-spread.png` — practice spreads
- `travel-diary.png` — the international ring travel diary

All currently sourced from `wiki/output/` originals. To replace any of them with a fresh render, drop the new PNG into `apps/command-center/public/minderoo-artefact/` with the same filename.
