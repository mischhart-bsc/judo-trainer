# Judo Trainer

A small, fast game for learning judo techniques. Plain HTML/CSS/JavaScript: no install, no build step, no server code.
Technique data and videos come from [judolearn.com](https://judolearn.com); the videos are YouTube embeds.

## Files

| File | What it is | Do you edit it? |
|---|---|---|
| `data/techniques.json` | The scraped data, exactly as scraped | Replace it when you re-scrape |
| `convert.py` | Turns the scraped JSON into `techniques.js` | No, just run it |
| `techniques.js` | Generated data the game loads | **No, it gets overwritten** |
| `my-notes.js` | Your own notes per technique | **Yes** |
| `app.js` | Game logic (library, flashcards, memory, quiz) | Only for new features |
| `style.css` | Look and colors | If you want |
| `index.html` | Page skeleton | Rarely |

## Run it

The videos are YouTube embeds, which don't play from a double-clicked file. Start a tiny local server in this folder:

```
python -m http.server 8000
```

Then open http://localhost:8000. (The "Live Server" extension in VS Code works too.)
Once it's on GitHub Pages, it just works from the link.

## Update the data after re-scraping

1. Replace `data/techniques.json` with the new file.
2. Run `python convert.py`.
3. Reload the page.

Your notes and everyone's learning progress stay, as long as the technique slugs don't change.

## Your own notes

Add them to `my-notes.js`, keyed by the technique id (the last part of its judolearn.com URL):

```js
window.MY_NOTES = {
  "seoi-nage": "Our sensei: turn in lower than you think.",
};
```

Notes show up in the library, on flashcards and in search.

## Game modes

- **Library:** search and filter by category, group, grade and difficulty. Opening a technique shows its videos (tabs to switch between them), overview, kuzushi/tsukuri/kake, steps, principles, common mistakes, when to use, and clickable related techniques, set-ups, follow-ups and counters.
- **Flashcards:** spaced repetition like Anki. Modes: English → name, kanji → name, video → name, name → picture it. Rate Again / Hard / Good / Easy (keys 1–4, Space reveals).
- **Memory:** match name ↔ English, name ↔ kanji or name ↔ video.
- **Quiz:** multiple choice. English → name, kanji → name, video → name, name → group, and "which technique counters it?". Wrong answers come from the same group, so it isn't too easy.

Before every game you filter and tick exactly which techniques may appear.

## Grades and belt colours

Each technique is filed under the lowest grade judolearn lists for it. "Up to 4th kyu" shows everything taught up to and including 4th kyu.
The belt colour per grade is set in `GRADE_COLOR` at the top of `app.js`. Adjust it to your federation's system.

## Progress

Saved in each player's own browser (localStorage). Every friend has their own progress, and no accounts are needed.
Clearing browser data resets it.
