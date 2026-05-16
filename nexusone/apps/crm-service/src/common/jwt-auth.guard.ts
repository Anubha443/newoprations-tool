import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) throw new UnauthorizedException('Missing bearer token');
    try {
      req.user = jwt.verify(auth.slice(7), process.env.JWT_ACCESS_SECRET || 'dev_access_secret');
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
