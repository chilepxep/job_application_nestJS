import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SeedingService } from './seeding.service';
import { SeedingModule } from './seeding.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(SeedingModule);

  const seedService = app.get(SeedingService);
  await seedService.run();

  await app.close();
}
bootstrap();
