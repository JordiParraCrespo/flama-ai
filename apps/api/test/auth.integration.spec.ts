import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { AppModule } from '../src/app.module';

describe('Auth (integration)', () => {
  let app: INestApplication;
  let pgContainer: StartedTestContainer;

  beforeAll(async () => {
    pgContainer = await new GenericContainer('postgres:16-alpine')
      .withEnvironment({
        POSTGRES_USER: 'test',
        POSTGRES_PASSWORD: 'test',
        POSTGRES_DB: 'test',
      })
      .withExposedPorts(5432)
      .start();

    process.env.DB_HOST = pgContainer.getHost();
    process.env.DB_PORT = pgContainer.getMappedPort(5432).toString();
    process.env.DB_USERNAME = 'test';
    process.env.DB_PASSWORD = 'test';
    process.env.DB_DATABASE = 'test';
    process.env.REDIS_HOST = 'localhost';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  }, 60000);

  afterAll(async () => {
    await app?.close();
    await pgContainer?.stop();
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
  });
});
