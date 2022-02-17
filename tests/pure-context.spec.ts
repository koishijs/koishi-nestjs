import { KoishiService } from '../src/koishi.service';
import { KoishiModule } from '../src/koishi.module';
import { NestFactory } from '@nestjs/core';
import { INestApplicationContext, Module } from '@nestjs/common';

@Module({
  imports: [KoishiModule.register({})],
})
class TestModule {}

describe('Koishi in Nest.js context', () => {
  let app: INestApplicationContext;
  let koishiApp: KoishiService;

  beforeEach(async () => {
    app = await NestFactory.createApplicationContext(TestModule);
    await app.init();
    koishiApp = app.get(KoishiService);
  });

  it('should register http service', () => {
    expect(koishiApp._httpServer).toBeDefined();
  });
});
