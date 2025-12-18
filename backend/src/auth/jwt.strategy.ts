import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'RAHASIA_NEGARA_NEXTG', // Nanti pindahkan ke .env
    });
  }

  async validate(payload: any) {
    // Data ini akan masuk ke request.user
    return { 
      userId: payload.sub, 
      username: payload.username, 
      role: payload.role,
      permissions: payload.permissions 
    };
  }
}