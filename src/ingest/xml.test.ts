// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseXmlActivity } from './xml';
import { cleanSamples, deriveStats, type Sample } from './track';

// A synthetic track, kept as a fixture so parser tests do not depend on the bundled sample
// activities — those are marketing assets and change whenever the gallery is restyled.
const sample = (name: string) => readFileSync(`src/ingest/__fixtures__/${name}`, 'utf8');

describe('parseXmlActivity - GPX', () => {
  it('reads a generated sample end to end', () => {
    const activity = parseXmlActivity(sample('synthetic-loop.gpx'), 'synthetic-loop.gpx');

    expect(activity.name).toBe('Richmond Park loop');
    expect(activity.sportType).toBe('Run');
    expect(activity.source).toBe('file');
    expect(activity.coords).toHaveLength(320);
    // The generator targeted 11.7km; parsing should recover it to within a few metres.
    expect(activity.distanceM / 1000).toBeCloseTo(11.7, 1);
    expect(activity.startDateLocal).toBe('2026-01-11T08:12:00');
    expect(activity.elevationGainM).toBeGreaterThan(0);
    expect(activity.movingTimeS).toBeGreaterThan(0);
  });

  it('maps sport aliases, including Strava numeric codes', () => {
    const asType = (type: string) =>
      parseXmlActivity(
        `<gpx><trk><name>x</name><type>${type}</type><trkseg>
           <trkpt lat="51.5" lon="-0.1"><time>2026-01-01T10:00:00Z</time></trkpt>
           <trkpt lat="51.51" lon="-0.1"><time>2026-01-01T10:05:00Z</time></trkpt>
         </trkseg></trk></gpx>`,
        'f.gpx',
      ).sportType;

    expect(asType('cycling')).toBe('Ride');
    expect(asType('9')).toBe('Run');
    expect(asType('Trail Running')).toBe('Trail Running');
  });

  it('falls back to the filename when the track has no name', () => {
    const activity = parseXmlActivity(
      `<gpx><trk><trkseg>
         <trkpt lat="51.5" lon="-0.1"/><trkpt lat="51.51" lon="-0.1"/>
       </trkseg></trk></gpx>`,
      'morning_run_2026.gpx',
    );
    expect(activity.name).toBe('morning run 2026');
    expect(activity.startDateLocal).toBeNull();
  });

  it('rejects a file with no usable track', () => {
    expect(() => parseXmlActivity('<gpx><trk><trkseg/></trk></gpx>', 'empty.gpx')).toThrow(
      /No usable GPS track/,
    );
  });

  it('rejects malformed XML', () => {
    expect(() => parseXmlActivity('<gpx><trk>', 'broken.gpx')).toThrow(/not valid XML/);
  });

  it('rejects an unrecognised root element', () => {
    expect(() => parseXmlActivity('<kml><Placemark/></kml>', 'route.kml')).toThrow(
      /Unrecognised file format/,
    );
  });
});

describe('parseXmlActivity - TCX', () => {
  const tcx = `<?xml version="1.0"?>
    <TrainingCenterDatabase><Activities><Activity Sport="Biking">
      <Id>2026-06-01T07:00:00Z</Id>
      <Lap><TotalTimeSeconds>1800</TotalTimeSeconds><DistanceMeters>15000</DistanceMeters>
        <Track>
          <Trackpoint><Time>2026-06-01T07:00:00Z</Time>
            <Position><LatitudeDegrees>51.50</LatitudeDegrees><LongitudeDegrees>-0.10</LongitudeDegrees></Position>
            <AltitudeMeters>10</AltitudeMeters></Trackpoint>
          <Trackpoint><Time>2026-06-01T07:15:00Z</Time>
            <Position><LatitudeDegrees>51.55</LatitudeDegrees><LongitudeDegrees>-0.10</LongitudeDegrees></Position>
            <AltitudeMeters>40</AltitudeMeters></Trackpoint>
        </Track></Lap>
    </Activity></Activities></TrainingCenterDatabase>`;

  it('prefers the device lap summary over positions recomputed from GPS', () => {
    const activity = parseXmlActivity(tcx, 'ride.tcx');
    expect(activity.sportType).toBe('Ride');
    // Straight-line GPS distance here is ~5.6km; the lap summary says 15km and must win.
    expect(activity.distanceM).toBe(15000);
    expect(activity.movingTimeS).toBe(1800);
  });
});

describe('cleanSamples', () => {
  const at = (lon: number, lat: number): Sample => ({
    coord: [lon, lat],
    time: null,
    elevation: null,
  });

  it('drops null-island fixes that would otherwise blow up the map bounds', () => {
    expect(cleanSamples([at(-0.1, 51.5), at(0, 0), at(-0.11, 51.51)])).toHaveLength(2);
  });

  it('drops repeated identical fixes and non-finite coordinates', () => {
    expect(cleanSamples([at(-0.1, 51.5), at(-0.1, 51.5), at(NaN, 51.5)])).toHaveLength(1);
  });

  it('drops out-of-range coordinates', () => {
    expect(cleanSamples([at(-0.1, 51.5), at(200, 51.5)])).toHaveLength(1);
  });
});

describe('deriveStats', () => {
  const track = (specs: Array<[number, number, number, number]>): Sample[] =>
    specs.map(([lon, lat, tMin, ele]) => ({
      coord: [lon, lat],
      time: Date.parse(`2026-01-01T10:00:00Z`) + tMin * 60_000,
      elevation: ele,
    }));

  it('excludes long stops from moving time', () => {
    // Two 1-minute moving legs separated by a 30-minute coffee stop at the same spot.
    const stats = deriveStats(
      track([
        [-0.10, 51.50, 0, 10],
        [-0.101, 51.501, 1, 10],
        [-0.101, 51.501 + 1e-7, 31, 10],
        [-0.102, 51.502, 32, 10],
      ]),
    );
    expect(stats.elapsedTimeS).toBe(32 * 60);
    expect(stats.movingTimeS).toBeLessThan(3 * 60);
  });

  it('ignores elevation jitter below the noise floor', () => {
    const jitter = track([
      [-0.10, 51.50, 0, 10],
      [-0.101, 51.501, 1, 10.8],
      [-0.102, 51.502, 2, 10.2],
      [-0.103, 51.503, 3, 10.9],
    ]);
    expect(deriveStats(jitter).elevationGainM).toBe(0);
  });

  it('sums real climbs', () => {
    const climb = track([
      [-0.10, 51.50, 0, 10],
      [-0.101, 51.501, 1, 60],
      [-0.102, 51.502, 2, 40],
      [-0.103, 51.503, 3, 90],
    ]);
    expect(deriveStats(climb).elevationGainM).toBeCloseTo(100, 5);
  });

  it('reports null elevation when the file carried none', () => {
    const flat: Sample[] = [
      { coord: [-0.1, 51.5], time: 0, elevation: null },
      { coord: [-0.11, 51.51], time: 60_000, elevation: null },
    ];
    expect(deriveStats(flat).elevationGainM).toBeNull();
  });
});
