import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';

@Injectable()
export class CryptoService {
  private readonly saltRounds = 10;

  hashPassword(password: string): string {
    const salt = bcrypt.genSaltSync(this.saltRounds);
    return bcrypt.hashSync(password, salt);
  }

  comparePassword(password: string, hashedPassword: string): boolean {
    return bcrypt.compareSync(password, hashedPassword);
  }

  /** Deterministic hash for storing refresh tokens (lookup by hash). */
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
