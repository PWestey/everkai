// What the service worker precaches, and what it streams on demand instead.
//
// The offline bundle reached 617 MB, which no browser will grant. The install downloads every file
// in the manifest and aborts the whole install if any single one fails, so on a phone the install
// could never finish: the app reported "Ready for offline play" while the origin's storage budget
// was already spent, and saving failed with a message blaming device storage. Device space is not
// the constraint -- the per-origin quota is.
//
// Character idle clips are 509 files and 506 MB of that, and every one already degrades cleanly:
// app/character-artwork.tsx swaps to the still portrait on a video error, and the worker's fetch
// handler falls back to the network for anything outside the manifest. So they stay deployed and
// play normally online, without being a precondition for installing the game.
//
// Dropping a path from the manifest also reclaims it on existing installs: the worker's activate
// step deletes every cached URL that is no longer wanted.
export const STREAMED=[/^assets\/idle\//];

/** True when a built file is fetched on demand rather than precached. */
export const streamed=path=>STREAMED.some(pattern=>pattern.test(path));

/** A precache this size is expected to fit a phone. Guards against another half-gigabyte landing
 *  in the manifest unnoticed; tests/offline-manifest.test.mjs enforces it. */
export const PRECACHE_BUDGET_BYTES=120*1024*1024;
