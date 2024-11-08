import { StatusItem } from 'src/bxb/dto/bxb.dto';

export type RecentBxbParcelsType = {
  imId: string;
  status: StatusItem;
};

export class SortedTracks {
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
