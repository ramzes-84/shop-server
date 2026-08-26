import { Cargos } from 'src/types/common';
import { recognizeCargo } from './sort-tracks';

const ORDER_REFERENCE = 'REF12345';

describe('recognizeCargo', () => {
  it.each([
    ['RU987654321', Cargos.DPD],
    ['123E4567-E89B-12D3-A456-426655440000', Cargos.YA],
    ['990099', Cargos.POST],
    [ORDER_REFERENCE, Cargos.FIVE_POST],
    ['SOMETHING', Cargos.UNKNOWN],
  ])('classifies %s as %s', (track, expectedCargo) => {
    expect(recognizeCargo(track, ORDER_REFERENCE)).toBe(expectedCargo);
  });
});
