import { Cargos } from 'src/types/common';

// deprecated
export function sortTracks(tracks: string[]): SortedTracks {
  const sortedTracks = new SortedTracks();

  tracks.forEach((track) => {
    if (!track) return;
    if (track.startsWith('RU')) {
      sortedTracks.dpd.push(track);
    } else if (track.startsWith('MNL')) {
      sortedTracks.bxb.push(track);
    } else if (
      track.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
    ) {
      sortedTracks.ya.push(track);
    } else if (Number.isInteger(+track)) {
      sortedTracks.post.push(track);
    }
  });

  return sortedTracks;
}

// deprecated
class SortedTracks {
  bxb: string[];
  dpd: string[];
  ya: string[];
  post: string[];

  constructor() {
    this.bxb = [];
    this.dpd = [];
    this.ya = [];
    this.post = [];
  }
}

export function recognizeCargo(track: string): Cargos {
  switch (true) {
    case track.startsWith('RU'):
      return Cargos.DPD;
    case track.startsWith('MNL'):
      return Cargos.BXB;
    case /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      track,
    ):
      return Cargos.YA;
    case Number.isInteger(+track):
      return Cargos.POST;
    default:
      return;
  }
}
