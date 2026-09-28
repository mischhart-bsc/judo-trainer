# Judo Trainer

A small, fast learning game for judo techniques. Plain HTML/CSS/JavaScript: no install, no build step, no server code.

## Files

| File | What it is | Do you edit it? |
|---|---|---|
| `techniques.js` | Your technique dictionary | **Yes, this is where your content lives** |
| `app.js` | Game logic (library, flashcards, memory, quiz) | Only for new features |
| `style.css` | Look and colors | If you want |
| `index.html` | Page skeleton | Rarely |
| `videos/` | Your own clips (create this folder) | Put your .mp4 files here |

## Run it

- **Quick:** double-click `index.html`. Works with local videos.
- **With YouTube embeds:** YouTube often blocks playback from a double-clicked file. Run a tiny local server in the folder instead:
  `python -m http.server 8000` → open http://localhost:8000
  (or the "Live Server" extension in VS Code).

## Add a technique

Copy one line in `techniques.js` and change it:

```js
{ id: "harai-tsurikomi-ashi", name: "Harai-tsurikomi-ashi", translation: "Lift-pull foot sweep",
  category: "Nage-waza", subcategory: "Ashi-waza", belt: "blue", difficulty: 3,
  video: "videos/harai-tsurikomi-ashi.mp4", notes: "Your own coaching points." },
```

New categories, groups and belts show up in the filters automatically.
Don't change an `id` later, because that's what learning progress is saved under.

**Videos:** 3–8 s, 720p, muted, MP4 (H.264) keeps each clip around 1–2 MB. HandBrake can batch-convert them.
YouTube links (`https://youtu.be/...`) also work.

## Game modes

- **Library:** browse and filter everything; open an entry for video and notes.
- **Flashcards:** spaced repetition like Anki. Rate Again / Hard / Good / Easy (keys 1–4, Space reveals). Each rating sets when the card comes back.
- **Memory:** match name ↔ translation or name ↔ video.
- **Quiz:** multiple choice (translation → name, video → name, name → group).

Before every game you filter and tick exactly which techniques may appear.

## Progress

Saved in each player's own browser (localStorage). Every friend has their own progress, and no accounts are needed.
Clearing browser data resets it.

## Share it with friends

Upload the whole folder to a free static host:
- **GitHub Pages:** new repository → upload files → Settings → Pages → Deploy from main branch.
- **Netlify Drop:** drag the folder onto app.netlify.com/drop.

Friends just open the link, on phone or PC.

## Belts

The belt levels in `techniques.js` are placeholders. Adjust them to your club's grading syllabus.
