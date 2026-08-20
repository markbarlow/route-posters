# Sample activity credits

The GPX files in this folder are real recordings, used as the bundled examples for the samples
gallery. They are here so that every example poster shows true distances, times and elevations
rather than invented ones.

| File | Activity | Source |
| --- | --- | --- |
| `boston-lincs-marathon.gpx` | Boston Marathon, Lincolnshire | Own recording |
| `london-marathon.gpx` | London Marathon | Own recording |
| `berlin-marathon.gpx` | Berlin Marathon | Own recording |
| `barcelona-marathon.gpx` | Barcelona Marathon | Own recording |
| `manchester-marathon.gpx` | Manchester Marathon | Own recording |
| `edinburgh-marathon.gpx` | Edinburgh Marathon | Own recording |
| `york-marathon.gpx` | Yorkshire Marathon | Own recording |
| `newport-marathon.gpx` | Newport Marathon | Own recording |
| `dorney-lake-marathon.gpx` | Dorney Lake Marathon | Own recording |
| `thames-meander-marathon.gpx` | Thames Meander Marathon | Own recording |
| `ventoux-par-bedoin.gpx` | Mont Ventoux, ascent via Bédoin | Openly published route |
| `alpe-d-huez.gpx` | Alpe d'Huez | Openly published route |

> Some of these are the repository owner's own recordings and some come from openly published
> route data. Check this table before assuming a file is freely reusable, and update it whenever a
> sample is added or replaced.

## Preparation

These files are slimmed by `npm run samples:prep`, which strips per-point heart-rate and cadence
extensions and rounds coordinates to six decimal places (about 11cm). Every trackpoint is kept, so
distance, moving time and elevation gain are unchanged — measured drift is under 0.003%. The
originals remain in git history.

Boston is Boston in **Lincolnshire**, not Massachusetts; it is titled in full in `src/samples.ts`
so a poster cannot imply the wrong race.
