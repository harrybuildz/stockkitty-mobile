# StockKitty Mobile

iOS + Android client for [StockKitty](https://github.com/harrybuildz/stockkitty), built with Expo (SDK 57), Expo Router and TypeScript. It talks to the same FastAPI backend as the web app; no mobile-specific endpoints.

## Run it

```sh
npm install
cp .env.example .env.local      # point EXPO_PUBLIC_API_BASE_URL at your backend
npx expo start                  # i = iOS simulator, a = Android emulator, w = web
```

The backend runs from the `stockkitty` repo: `cd backend && uvicorn main:app --reload --port 8000`. For a physical phone, use your machine's LAN IP in `.env.local`.

## Checks

```sh
npm run typecheck
npm run lint
npm test          # vitest — API client refresh/dedup behavior
```

CI runs all three on every PR.

## How it's put together

- `src/app/` — Expo Router screens. `_layout.tsx` gates the app with `Stack.Protected`: signed out → `login`, signed in but Terms not accepted → `accept-terms`, otherwise the tabs.
- `src/api/client.ts` — `fetch` wrapper. Port of the web app's refresh-on-401 interceptor: concurrent 401s share one `/api/auth/refresh`, each request retries once, a rejected refresh clears tokens and signs out.
- `src/api/tokens.ts` — tokens in `expo-secure-store` (Keychain / Android Keystore). `tokens.web.ts` falls back to `localStorage` for the web target.
- `src/api/types.gen.ts` — generated from the backend's OpenAPI schema (`npm run gen:api`, or `API_SCHEMA=path/to/openapi.json npm run gen:api`). Most endpoints return untyped dicts, so response shapes the app reads live in `src/api/types.ts`.
- Valuation math comes from [`@stockkitty/valuation`](https://github.com/harrybuildz/stockkitty-valuation), pinned to the same commit as the web app, so both clients compute identical intrinsic values. Keep the pinned sha in `package.json` in step with `stockkitty/frontend/package.json`.
- Default assumptions and the input merge also come from the package (`deriveAssumptions`, `buildValuationInputs`), the same functions the web store uses.
- Styling is plain `StyleSheet` with tokens in `src/theme/` copied from the web Tailwind palette.

## Builds

Builds run on Expo's EAS service. `eas.json` has two profiles, both pointed at production (`https://stockkitty-production.up.railway.app`) via `EXPO_PUBLIC_API_BASE_URL`:

- `preview` — internal distribution: an installable build for your own devices (iOS ad hoc, Android APK).
- `production` — store builds; the build number auto-increments.

The app identifier is `com.stockkitty.app` on both platforms. It's permanent once submitted.

First time:

```sh
npx eas-cli@latest login
npx eas-cli@latest init            # links this repo to an Expo project (writes extra.eas.projectId)
npx eas-cli@latest build --platform all --profile preview
```

iOS builds need an Apple Developer account; EAS walks you through signing on the first build. For day-to-day development keep using `npx expo start` with `.env.local`.

## Over-the-air updates

JS-only changes (most fixes) ship without a rebuild:

```sh
npx eas-cli@latest update --channel preview --message "what changed" --environment production
```

Installed apps pick the update up on next launch. Updates only reach
builds with an identical native fingerprint (`runtimeVersion: fingerprint`),
so after adding/upgrading a native module, run a full `eas build` instead —
the publish is then simply not delivered to old builds, never crashing them.
