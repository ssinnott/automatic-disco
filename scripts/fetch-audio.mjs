#!/usr/bin/env node
/**
 * Ensures the (gitignored) background-music files exist in public/audio/.
 *
 * Reads public/audio/audio-manifest.json. For each track:
 *   - already present → skip
 *   - has a direct `url` → download it
 *   - otherwise → print where to get it and the exact filename to save
 *
 * Missing tracks are a warning, not an error: the game plays fine without music.
 */
import { createWriteStream } from "node:fs";
import { mkdir, stat, unlink } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import https from "node:https";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(root, "public/audio/audio-manifest.json");

const manifest = JSON.parse(await readText(manifestPath));
const dir = join(root, manifest.dir ?? "public/audio");
await mkdir(dir, { recursive: true });

let present = 0;
let downloaded = 0;
const missing = [];

for (const track of manifest.tracks ?? []) {
  const dest = join(dir, track.file);
  if (await exists(dest)) {
    console.log(`✓ ${track.file} — present`);
    present++;
    continue;
  }
  if (track.url) {
    process.stdout.write(`↓ ${track.file} — downloading… `);
    try {
      await download(track.url, dest);
      console.log("done");
      downloaded++;
    } catch (err) {
      console.log(`failed (${err.message})`);
      missing.push(track);
    }
  } else {
    missing.push(track);
  }
}

if (missing.length) {
  console.log("\n⚠ Missing tracks — download each and save to public/audio/:");
  for (const t of missing) {
    console.log(`  • ${t.file}  ←  ${t.source || "(no source recorded)"}`);
  }
  console.log("\n  (Or add a direct `url` for the track in audio-manifest.json to auto-download.)");
}

console.log(`\nAudio: ${present} present, ${downloaded} downloaded, ${missing.length} missing.`);

// ── helpers ──────────────────────────────────────────────────────────────────

async function readText(p) {
  const { readFile } = await import("node:fs/promises");
  return readFile(p, "utf8");
}

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

/** GET with redirect-following, streamed to `dest`. Cleans up on failure. */
function download(url, dest, redirects = 5) {
  return new Promise((resolveDl, rejectDl) => {
    const req = https.get(url, (res) => {
      const { statusCode, headers } = res;
      if (statusCode >= 300 && statusCode < 400 && headers.location) {
        res.resume();
        if (redirects <= 0) return rejectDl(new Error("too many redirects"));
        return resolveDl(download(new URL(headers.location, url).href, dest, redirects - 1));
      }
      if (statusCode !== 200) {
        res.resume();
        return rejectDl(new Error(`HTTP ${statusCode}`));
      }
      const out = createWriteStream(dest);
      res.pipe(out);
      out.on("finish", () => out.close(() => resolveDl()));
      out.on("error", async (err) => {
        await unlink(dest).catch(() => {});
        rejectDl(err);
      });
    });
    req.on("error", rejectDl);
  });
}
