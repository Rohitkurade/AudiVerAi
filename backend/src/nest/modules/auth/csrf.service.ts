import { Inject, Injectable } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { AUTH_CONFIGURATION, type AuthConfiguration } from '../../configuration';

@Injectable()
export class CsrfService {
  constructor(@Inject(AUTH_CONFIGURATION) private readonly config: AuthConfiguration) {}

  issueToken(): string {
    const nonce = randomBytes(32).toString('base64url');
    return `${nonce}.${this.sign(nonce)}`;
  }

  isValid(cookieToken: string | undefined, headerToken: string | undefined): boolean {
    if (!cookieToken || !headerToken || cookieToken.length !== headerToken.length) {
      return false;
    }

    const cookieBuffer = Buffer.from(cookieToken);
    const headerBuffer = Buffer.from(headerToken);
    if (!timingSafeEqual(cookieBuffer, headerBuffer)) {
      return false;
    }

    const [nonce, signature, ...rest] = cookieToken.split('.');
    if (!nonce || !signature || rest.length !== 0 || !/^[A-Za-z0-9_-]{43}$/.test(nonce)) {
      return false;
    }

    const expected = Buffer.from(this.sign(nonce));
    const provided = Buffer.from(signature);
    return expected.length === provided.length && timingSafeEqual(expected, provided);
  }

  private sign(nonce: string): string {
    return createHmac('sha256', this.config.csrfSecret).update(nonce).digest('base64url');
  }
}
