import jwt from 'jsonwebtoken';

export function signJwt(payload: object, secret: string, expiresIn = '1h') {
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyJwt(token: string, secret: string) {
  return jwt.verify(token, secret);
}
