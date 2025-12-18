import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Cek apakah route ini butuh role khusus (misal @Roles('ADMIN'))
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    
    // 2. Kalau tidak ada aturan role, loloskan saja
    if (!requiredRoles) {
      return true;
    }

    // 3. Ambil user dari request (hasil kerja JwtStrategy tadi)
    const { user } = context.switchToHttp().getRequest();
    
    // 4. Cek apakah role user ada di daftar requiredRoles
    return requiredRoles.includes(user.role);
  }
}