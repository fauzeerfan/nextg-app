import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // AKTIFKAN CORS (Permissive untuk Development)
  // Penting agar Frontend (Vite) bisa akses API dari port berbeda (5173 -> 3000)
  app.enableCors({
    origin: true, // Mengizinkan semua origin (untuk kemudahan dev)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  
  // Listen di 0.0.0.0 agar bisa diakses dari luar container Docker
  // (Penting: Jika hanya listen di localhost, docker container lain/host machine tidak bisa akses)
  await app.listen(3000, '0.0.0.0');
  
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();