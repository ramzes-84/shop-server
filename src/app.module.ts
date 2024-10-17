import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { YadModule } from './yad/yad.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    YadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
