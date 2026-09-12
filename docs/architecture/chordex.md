# Chordex — Chord Explorer Module

## Purpose

Chordex is the chord reference, library browsing, progression building, and song management module. It is the original and most feature-rich module in Studio.

## Location

```
packages/ui-shared/src/features/chordex/
├── components/       # (empty — components inline in pages)
├── hooks/
├── pages/
│   ├── ChordPanel.tsx    (65 KB, 1370 lines)
│   ├── LibraryPanel.tsx  (94 KB)
│   └── SongsPanel.tsx    (195 KB)
├── services/
├── shared/           # (empty)
├── state/
├── types/
└── utilities/        # (empty)
```

## Pages

### ChordPanel.tsx (65 KB)

The Chord of the Day / chord detail view:

- **Chord of the Day** hero card with guitar diagram, practice tip, play button
- **Chord detail** view with full diagrams (guitar, piano, four-string)
- **Related chords** suggestions via `getRelatedChords()`
- **Next chord** suggestions via `suggestNextChord()`
- **Progression builder** integration
- **Find a Chord** modal (CustomChordBuilder)
- **Quick Categories** grid for chord type browsing
- **Android-specific layout** using `Capacitor.isNativePlatform()` with Material 3 cards
- **Web layout** preserved separately with existing CSS animations

### LibraryPanel.tsx (94 KB)

Chord library browser:

- Search and filter by chord type
- Grid/list view of all chords
- Favorites management
- Chord usage tracking
- Recent chords history

### SongsPanel.tsx (195 KB)

Song practice and management:

- Song preset creation and editing
- Section-based song structure
- Chord-per-section assignment
- Transposition controls
- Song practice view integration

## State Management

Uses `useChordStore` from `@workspace/studio-core` (881 lines, 33 KB):

### Key State

| Field                      | Type                     | Purpose                       |
| -------------------------- | ------------------------ | ----------------------------- |
| `selectedChordId`          | `string \| null`         | Currently viewed chord        |
| `settings`                 | `AppSettings`            | ~50 app-wide settings fields  |
| `favorites`                | `string[]`               | Favorited chord IDs           |
| `recentChords`             | `string[]`               | Recently viewed chords        |
| `progressions`             | `Progression[]`          | Saved chord progressions      |
| `currentProgressionChords` | `string[]`               | Active progression builder    |
| `presets`                  | `SongPreset[]`           | Song presets                  |
| `customChords`             | `CustomChord[]`          | User-created chords           |
| `chordUsage`               | `Record<string, number>` | Usage analytics per chord     |
| `libraryActiveType`        | `string`                 | Active type filter in library |
| `lastSession`              | `Record<AppKey, object>` | Per-app session restore data  |

### Key Actions

| Action                       | Purpose                        |
| ---------------------------- | ------------------------------ |
| `selectChord(id)`            | Navigate to chord detail       |
| `trackChordUsage(id)`        | Increment usage counter        |
| `toggleFavorite(id)`         | Add/remove from favorites      |
| `updateSettings(partial)`    | Update app settings            |
| `setLastSession(app, state)` | Save session state for restore |

### Persistence

- Storage key: `chord-explorer-storage-v3`
- Persist version: 13 (13 migration steps)
- Middleware: `zustand/persist` + encrypted localStorage
- `ACCENT_COLORS` uses a JS Proxy for dynamic HSL computation from `customAccentHue`

## Dependencies

| Dependency             | Source        | Purpose                        |
| ---------------------- | ------------- | ------------------------------ |
| `getChordById`         | studio-core   | Chord data lookup              |
| `getAllChords`         | studio-core   | Full chord database (48 KB)    |
| `getRelatedChords`     | studio-core   | Related chord suggestions      |
| `suggestNextChord`     | studio-core   | AI-style next chord suggestion |
| `useChordStore`        | studio-core   | State management               |
| `ACCENT_COLORS`        | studio-core   | Theme accent colors            |
| `NavigationDispatcher` | studio-core   | Navigation                     |
| `useNavigationStore`   | studio-core   | Navigation state               |
| `renderChordDiagram`   | Local utility | Chord diagram rendering        |
| `GuitarDiagram`        | ui-shared     | Guitar fretboard component     |
| `PianoDiagram`         | ui-shared     | Piano keyboard component       |
| `FourStringDiagram`    | ui-shared     | Bass/ukulele fretboard         |
| `CustomChordBuilder`   | ui-shared     | Chord finder modal             |
| `@capacitor/core`      | Capacitor     | Platform detection             |

## Navigation

Uses the chords app BottomNav (4 tabs):

```
NavigationDispatcher.push({ app: 'chords', page: 'library' })
NavigationDispatcher.push({ app: 'chords', page: 'chord' })
NavigationDispatcher.push({ app: 'chords', page: 'songs' })
NavigationDispatcher.push({ app: 'chords', page: 'settings' })
```

## Static Data

| File                     | Size    | Content                    |
| ------------------------ | ------- | -------------------------- |
| `data/chords.ts`         | 48.8 KB | Complete chord definitions |
| `data/progressions.ts`   | 111 KB  | Progression templates      |
| `data/progressionsEs.ts` | 32 KB   | Spanish progression names  |
| `data/songs.ts`          | 17 KB   | Song data                  |

## Known Limitations

- `SongsPanel.tsx` at 195 KB is the largest feature page and handles too many concerns
- `useChordStore` at 881 lines has grown to include settings, progressions, songs, custom chords, and session management — too broad
- `LibraryPanel.tsx` at 94 KB could benefit from component extraction
