# Everkai — Private Village

An independently implemented, offline-capable single-player village sandbox. This delivery is based on the independently reviewed Isekai Private Village source commit `27b58f6f3bbcccaa502c2daf975f532c44257f17` (wardrobe plus startup recovery). It is not the original mobile client, and original-game fidelity remains incomplete.

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

Open an HTTPS deployment in Safari, choose Share → Add to Home Screen, and open the installed app online. Wait for **Ready for offline play** in save settings before disconnecting. Later updates download only the files that changed; **Offline & saves** shows their progress, and the app reloads itself when an update takes over. Then close and reopen in airplane mode to check your device. Safari and the Home Screen app can have different storage; export/restore can move saves. Saves remain in local browser storage, not GitHub. Clearing website data removes saves and cached content. Moving to another hosting domain does not automatically transfer a save.

## Included gameplay

- A fixed village screen with buttons and activity modals, guided objectives and guarded quest rewards.
- A habit journal (daily, weekly, monthly, one-off and review tasks) that drives village earnings: passive Gold is multiplied by 1.0×–2.0× based on life areas touched this week and dailies completed today.
- Fellows and Family, village businesses, training, inventory, battles, dates, School and additional progression activities.
- A 136-task opening implementation and 126 encounters; independent fresh-browser testing covered a representative 42-encounter route, with accelerated waits, rather than every quest at natural pacing.
- Persistent Family picture discovery and 178 offline illustrations. All 278 playable characters have 1280×1920 base portraits; 257 costume portraits and 516 idle clips (1024×1536) share the same 2:3 framing. Eleven costume art exceptions remain unavailable.
- Local save export/restore, write-failure recovery and a versioned offline cache. The app has been installed and used on the owner's iPhone; it is not independently certified on other devices.

## Source and scope

Game logic combines readable local source evidence, public reference material and explicitly local sandbox rules. Public community values are not necessarily version-matched production formulas. `SYSTEMS.md`, data provenance fields and the historical notes distinguish these where documented. This is not a promise of exact original progression, formulas or complete system coverage.

Artwork derives from the user's supplied Isekai files and selected locally prepared compositions. Original artwork remains owned by its respective rights holders; no ownership or redistribution license is asserted. No original APK, protected bundle, production credential, personal save, proprietary animation runtime or private hosting binding is included. There is no production game-server connection or authentication bypass.

`docs/DEVELOPMENT_HISTORY.md` preserves chronological implementation notes; older entries describe earlier versions and can be superseded. Optional extraction/import tools may retain source provenance paths; they are authoring aids, not build prerequisites. The separate research handoff and Everstead project are not included or coupled to this repository.

## Wardrobe update

Family and Fellow details now offer Wardrobe: explicitly collect costumes for free after welcoming/recruiting the exact character, then wear one or restore the base appearance. This cosmetic policy changes no stats or collection rewards. There are 268 active-owner costume records and 257 verified static costume images; 11 art exceptions remain unavailable. Unique-owned collection score uses the source score under a local rule.

57 explicit costume-linked Family picture routes require exact costume ownership, the recorded Intimacy threshold and a later successful date. Wearing the costume is not required. Collect/equip never grants a picture directly. One missing source unlock type and other unsupported gates remain locked. Costume portraits are 1280×1920 renders, about 33 MB of the offline download.
