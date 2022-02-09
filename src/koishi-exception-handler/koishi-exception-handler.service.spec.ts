import { Test, TestingModule } from '@nestjs/testing';
import { KoishiExceptionHandlerService } from './koishi-exception-handler.service';

describe('KoishiExceptionHandlerService', () => {
  let service: KoishiExceptionHandlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KoishiExceptionHandlerService],
    }).compile();

    service = module.get<KoishiExceptionHandlerService>(KoishiExceptionHandlerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
