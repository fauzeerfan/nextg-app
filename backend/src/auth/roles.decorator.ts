import { SetMetadata } from '@nestjs/common';

// Cara pakainya nanti: @Roles('SUPER_ADMIN', 'MANAGER')
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);