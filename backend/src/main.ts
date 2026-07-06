// backend/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ============================================================
  // CORS — izinkan semua origin yang relevan (dev & production).
  // Gunakan fungsi callback agar fleksibel: origin apapun dari
  // IP internal (192.168.x.x) dan publik (202.52.x.x) diizinkan,
  // plus localhost untuk development.
  // ============================================================
  app.enableCors({
    origin: (origin, callback) => {
      // Izinkan request tanpa origin (mis. curl, Postman, mobile app native)
      if (!origin) return callback(null, true);

      const allowed = [
        // Localhost dev
        /^http:\/\/localhost(:\d+)?$/,
        /^http:\/\/127\.0\.0\.1(:\d+)?$/,
        // Internal network
        /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
        // Public server
        /^https?:\/\/202\.52\.15\.30(:\d+)?$/,
      ];

      const isAllowed = allowed.some((pattern) => pattern.test(origin));
      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked origin: ${origin}`);
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    credentials: true,
    // Penting: izinkan browser cache preflight 10 menit
    maxAge: 600,
  });

  // ============================================================
  // ValidationPipe — PENTING: matikan whitelist untuk endpoint
  // cutting-report yang pakai @Body() dto: any (plain object).
  // Whitelist: true hanya aman dipakai dengan class-based DTO.
  // Kalau dipakai dengan 'any', NestJS tetap meloloskan tapi
  // lebih aman pakai transform: true saja tanpa whitelist.
  // ============================================================
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false,   // DIUBAH: false agar plain-object body tidak di-strip
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Serve uploaded files from the 'uploads' directory
  const uploadPath = join(process.cwd(), 'uploads');
  console.log(`📁 Serving static files from: ${uploadPath}`);
  app.useStaticAssets(uploadPath, { prefix: '/uploads' });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 Application is running on: ${await app.getUrl()}`);
  console.log(`🌐 CORS enabled for localhost, 192.168.x.x, 202.52.15.30`);
}
bootstrap();