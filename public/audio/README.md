# Background music

The `.mp3` files here are **gitignored** (large binaries don't belong in git
history). The code, the manifest, and this README are tracked; the audio itself
lives only on your machine and is fetched/placed locally.

Files are served from the site root: `public/audio/pirate-1.mp3` →
`/audio/pirate-1.mp3`. The game picks one track at random per run from each
theme's `music` list (see `src/game/themes/*.ts`). Missing files fail silently —
the game just plays without music.

## Getting the files

```sh
npm run fetch-audio
```

This reads `audio-manifest.json` and, for each track, either confirms it's
present, downloads it (if the entry has a direct `url`), or tells you where to
grab it and what to name it. Then drop the file into this folder.

## Tracks

| File           | Theme         | Source                                                                          |
| -------------- | ------------- | ------------------------------------------------------------------------------- |
| `pirate-1.mp3` | Pirates       | https://pixabay.com/music/adventure-pirate-adventure-361663/                    |
| `pirate-2.mp3` | Pirates       | https://pixabay.com/music/folk-pirate-sea-shanty-accordion-fiddles-amp-stomping-drums-422957/ |
| `pirate-3.mp3` | Pirates       | https://pixabay.com/music/main-title-pirate-ship-battle-433529/                 |
| `ninja-1.mp3`  | Turtle Ninjas | https://pixabay.com/music/percussion-ninja-oriental-background-music-476450/    |

All sources are **Pixabay** (royalty-free, **no attribution required**), so
nothing else in the app needs to change. Add more tracks by dropping files here
and extending the theme's `music` array (and this manifest).

> Tip: to make `fetch-audio` fully automatic, paste each track's direct download
> URL into the `url` field in `audio-manifest.json`.
