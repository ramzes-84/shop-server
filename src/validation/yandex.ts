import { IsDefined, IsString, Length, Matches } from 'class-validator';

export class TrackIdParams {
  @IsDefined({ message: 'id is required' })
  @IsString({ message: 'id must be a string' })
  @Length(36, 36, { message: 'id is incorrect' })
  @Matches(/-udp$/, { message: 'id has incorrect pattern' })
  id: string;
}
