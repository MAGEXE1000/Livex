# Drumex — Drum Machine Module

## Purpose

Drumex is a full-featured drum machine/sequencer with pattern editing, velocity control, swing, kit selection, groove tagging, loop ranges, and audio engine integration.

## Location

```
packages/ui-shared/src/features/drumex/
├── components/       # (empty — components inline in pages)
├── pages/
│   ├── DrumEditor.tsx       (363 KB, 5603 lines — very large)
│   └── DrumPrefsPanel.tsx   (17 KB)
├── services/
├── state/
└── utilities/
```

## Pages

### DrumEditor.tsx (363 KB, 5603 lines)

The main drum machine editor — one of the largest files in the codebase:

- **Pattern grid** — multi-instrument step sequencer with per-step velocity
- **Velocity editing** — MIDI 0–127, random new note velocity (85–110)
- **Variation cycling** — tap through instrument-specific variations (e.g., hi-hat open/closed/foot)
- **Kit selection** — 15 kit types with preview
- **Swing/groove** — 0–60% swing, presets (tight/groove/funky)
- **Loop ranges** — bar-range looping with clamp safety
- **Drum songs** — multi-pattern song arrangement
- **FX/plugins** — per-instrument effects and plugin chains
- **Cymbal packs** — configurable cymbal selections
- **Groove tags** — tag and organize patterns

Uses `SharedNavigationContainer` for sub-view management.

### DrumPrefsPanel.tsx (17 KB)

Drum module preferences:

- Default kit selection
- Audio buffer settings
- Velocity sensitivity
- Metronome settings

## State Management

Uses `useDrumStore` from `@workspace/livex-core` (859 lines, 35 KB):

### Key State

| Field               | Type               | Purpose                     |
| ------------------- | ------------------ | --------------------------- |
| `patterns`          | `DrumPattern[]`    | All drum patterns           |
| `activePatternId`   | `string`           | Currently editing pattern   |
| `soundMap`          | `Record`           | Instrument → sample mapping |
| `volumeMap`         | `Record`           | Per-instrument volume       |
| `masterVolume`      | `number`           | Master output volume        |
| `kitType`           | `KitType`          | Active kit (15 options)     |
| `activeInstruments` | `DrumInstrument[]` | Visible instruments         |
| `drumSongs`         | `DrumSong[]`       | Song arrangements           |
| `instFX`            | `Record`           | Per-instrument effects      |
| `instPlugins`       | `Record`           | Per-instrument plugins      |
| `drumPrefs`         | `DrumPrefs`        | Module preferences          |
| `grooves`           | `GrooveEntry[]`    | Tagged grooves              |

### Key Types

| Type             | Fields                                                               |
| ---------------- | -------------------------------------------------------------------- |
| `DrumInstrument` | 10 instruments (kick, snare, hihat, clap, tom1–3, crash, ride, perc) |
| `KitType`        | 15 kits                                                              |
| `DrumHit`        | `{ velocity, variation }`                                            |
| `DrumMeasure`    | Steps × instruments grid                                             |
| `DrumPattern`    | Name, BPM, swing, time signature, measures                           |
| `DrumSong`       | Ordered pattern IDs with repeats                                     |

### Persistence

- Storage key: `chordex-drums`
- Persist version: 13 (13 migration steps)
- `instFX` excluded from persistence via `partialize`
- Migration includes hi-hat open/foot → closed folding and ride → crash variation mapping

## Dependencies

| Dependency                  | Source      | Purpose                  |
| --------------------------- | ----------- | ------------------------ |
| `useDrumStore`              | studio-core | Drum state management    |
| `DRUM_LIBRARY`              | studio-core | Sample library metadata  |
| `drumScheduler`             | studio-core | Audio playback scheduler |
| `samplePool`                | studio-core | Audio sample pool        |
| `loadDrumSamples`           | studio-core | Sample loading           |
| `NavigationDispatcher`      | studio-core | Navigation               |
| `ElasticSlider`             | ui-shared   | Velocity/volume controls |
| `SharedNavigationContainer` | ui-shared   | Sub-view transitions     |
| `EmptyStateLottie`          | ui-shared   | Empty state animation    |
| `DialogScaffold`            | ui-shared   | Modal dialogs            |
| `ScreenScaffold`            | ui-shared   | Page layout              |
| `AppModeMenuLogo`           | ui-shared   | App logo                 |

## Navigation

Uses `SharedNavigationContainer` for internal sub-views. Entry via:

```
NavigationDispatcher.push({ app: 'drums' })
NavigationDispatcher.push({ app: 'drums', page: 'editor' })
NavigationDispatcher.push({ app: 'drums', page: 'preferences' })
```

## Audio Engine

The drum module has its own audio subsystem in `studio-core/src/lib/audio/`:

- `drumAudio` — Web Audio API-based drum playback engine
- `drumScheduler` — Precise step sequencer with lookahead scheduling
- `samplePool` — Shared audio buffer pool with lazy loading
- `drumLibrary` — Kit definitions and sample mappings
- `drumPlugins` — Audio effects chain (reverb, delay, EQ, compression)

## Known Limitations

- `DrumEditor.tsx` at 363 KB / 5603 lines is the second-largest file in the entire codebase and urgently needs decomposition
- The file handles pattern editing, velocity, songs, kits, FX, plugins, groove tags, and preferences all inline
- Audio engine tightly coupled to UI components rather than cleanly separated
