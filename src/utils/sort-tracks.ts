import { SortedTracks } from 'src/types/common';

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
