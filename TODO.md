# TODO

## Completed
- [x] Fix web scan routing: `src/App.tsx` now uses `ScanScreen` on web (Gemini AI) and `SkinScanner` on native (Python backend).
- [x] Fix Supabase client: no longer instantiated with a garbage fallback key when env vars are missing.
- [x] Fix SQLite `db.scans.update()`: now handles all fields, not just `isSynced`.
- [x] Fix double `fetchProfile` on login: `AuthScreen` no longer duplicates the fetch that `AppContext` already does on `SIGNED_IN`.
- [x] Fix email validation: uses a proper regex instead of loose `includes()` checks.
- [x] Fix French status text in `ScanScreen.tsx`.
- [x] Wire `isOnline` to real `navigator.onLine` + window online/offline events on web.
- [x] Add `onPress` to the `Zap` button in `ScanScreen` (clears the selected image).
- [x] Document `EXPO_PUBLIC_BACKEND_API_URL` (ngrok) in `.env.example` with setup instructions.
- [x] Move `@expo/ngrok` from dependencies to devDependencies.
- [x] Remove unused `express` and `@types/express` dependencies.

## Remaining
- [ ] Wire `isOnline` for native (Expo) using `@react-native-community/netinfo` or equivalent.
- [ ] Fix PDF image embed for cloud-synced scans: `HistoryScreen` assumes `imageData` is always a base64 data URI, but cloud-synced scans store a Supabase storage URL instead.
- [ ] Replace `DermaBotWidget` stub with a real AI/LLM call (currently returns a hardcoded canned response).
- [ ] Run `npm run lint` to verify no TypeScript errors.
