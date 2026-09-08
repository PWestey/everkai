# Everkai — Private Village

An independently implemented, offline-capable single-player village sandbox. This delivery is based on the independently reviewed Isekai Private Village source commit `4a7586610c48c08352ce8fb0fd5f260ef193bf28` (playable release v116), with independently reviewed startup recovery from `21b029c5f009ab84084a633436114c549ea11e4a`. It is not the original mobile client, and original-game fidelity remains incomplete.

## Run locally

Requires Node.js 22.13 or newer (Node 24 recommended) and pnpm 10.

```sh
npm install --global pnpm@10
pnpm install --frozen-lockfile
pnpm dev
```

Open http://127.0.0.1:5187. Start journey on the village screen begins guided progression. Existing saves are not automatically enrolled or reset.

## Validate and build

```sh
pnpm test
pnpm exec tsc --noEmit
pnpm build
pnpm start
```

The complete static website is generated in `dist/client`. Serve that directory over HTTPS for installation and offline support; localhost also supports service workers. Build generates the versioned offline manifest and worker. No backend, database, game server, API key or environment secret is required. The checked-in data and optimized artwork are sufficient to build; optional import scripts reference local research inputs that are not needed for installation or gameplay.

CI runs tests, type checking and the production build. The Pages workflow publishes only `dist/client` to **https://pwestey.github.io/everkai/** after those checks pass. Repository Settings → Pages → Source must stay **GitHub Actions**. Do not publish the source branch root: its development TSX entry is not a runnable static build. Relative built asset paths and the service-worker scope support `/everkai/`.

The independent private backup remains at https://isekai-private-village-pw.westman-pa.chatgpt.site/ with its existing access permission. Saves do not automatically transfer between these origins; use export/restore. Startup recovery provides a visible reload screen and, for rendering failures, a raw-save download without clearing stored data.

## Install on iPhone

Open an HTTPS deployment in Safari, choose Share → Add to Home Screen, and open the installed app online. Wait for **Ready for offline play** in save settings before disconnecting. Then close and reopen in airplane mode to check your device. Safari and the Home Screen app can have different storage; export/restore can move saves. Saves remain in local browser storage, not GitHub. Clearing website data removes saves and cached content. Moving to another hosting domain does not automatically transfer a save.

## Included gameplay

- A fixed village screen with buttons and activity modals, guided objectives and guarded quest rewards.
- Fellows and Family, village businesses, training, inventory, battles, dates, School and additional progression activities.
- A 136-task opening implementation and 126 encounters; independent fresh-browser testing covered a representative 42-encounter route, with accelerated waits, rather than every quest at natural pacing.
- Persistent Family picture discovery, 178 offline illustrations and 259 selected base character compositions. Some art remains fallback; costumes and animation are incomplete.
- Local save export/restore, write-failure recovery and a versioned offline cache. Physical iPhone Safari installation is not independently certified.

## Source and scope

Game logic combines readable local source evidence, public reference material and explicitly local sandbox rules. Public community values are not necessarily version-matched production formulas. `SYSTEMS.md`, data provenance fields and the historical notes distinguish these where documented. This is not a promise of exact original progression, formulas or complete system coverage.

Artwork derives from the user's supplied Isekai files and selected locally prepared compositions. Original artwork remains owned by its respective rights holders; no ownership or redistribution license is asserted. No original APK, protected bundle, production credential, personal save, proprietary animation runtime or private hosting binding is included. There is no production game-server connection or authentication bypass.

`docs/DEVELOPMENT_HISTORY.md` preserves chronological implementation notes; older entries describe earlier versions and can be superseded. Optional extraction/import tools may retain source provenance paths; they are authoring aids, not build prerequisites. The separate research handoff and Everstead project are not included or coupled to this repository.
