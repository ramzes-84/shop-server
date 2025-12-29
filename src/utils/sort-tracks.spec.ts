import { Cargos } from 'src/types/common';
import { recognizeCargo, sortTracks } from './sort-tracks';

describe('sortTracks', () => {
  it('splits track list by provider markers', () => {
    const uuid = '123e4567-e89b-12d3-a456-426655440000';
    const tracks = ['RU123456789', uuid, '5500', '', 'UNKNOWN'];

    const result = sortTracks(tracks);

    expect(result).toEqual({
      dpd: ['RU123456789'],
      ya: [uuid],
      post: ['5500'],
    });
  });

  it('ignores falsy or unmatched values', () => {
    const tracks = ['', 'SOMETHING', 'UNKNOWN'];

    const result = sortTracks(tracks);

    expect(result).toEqual({ dpd: [], ya: [], post: [] });
  });
});

describe('recognizeCargo', () => {
  it.each([
    ['RU987654321', Cargos.DPD],
    ['123E4567-E89B-12D3-A456-426655440000', Cargos.YA],
    ['990099', Cargos.POST],
    ['SOMETHING', Cargos.UNKNOWN],
  ])('classifies %s as %s', (track, expectedCargo) => {
    expect(recognizeCargo(track)).toBe(expectedCargo);
  });
});
