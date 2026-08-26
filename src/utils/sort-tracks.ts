import { Cargos } from 'src/types/common';

export function recognizeCargo(track: string, reference: string): Cargos {
  switch (true) {
    case track.startsWith('RU'):
      return Cargos.DPD;
    case /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      track,
    ):
      return Cargos.YA;
    case Number.isInteger(+track):
      return Cargos.POST;
    case track.startsWith(reference):
      return Cargos.FIVE_POST;
    default:
      return Cargos.UNKNOWN;
  }
}
