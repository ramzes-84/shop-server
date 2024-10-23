export type CreateYaOrderQuery = {
  order: string;
  destination: string;
  source: 'RND' | 'TUL';
};
