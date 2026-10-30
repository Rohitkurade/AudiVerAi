import { argon2id, hash, verify, type HashOptions } from 'argon2';

const PASSWORD_HASH_OPTIONS: HashOptions = {
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 1,
};

export function isStrongPassword(password: string): boolean {
  return password.length >= 12
    && password.length <= 128
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password);
}

export function hashPassword(password: string): Promise<string> {
  return hash(password, { ...PASSWORD_HASH_OPTIONS, type: argon2id });
}

export function verifyPassword(hash: string, password: string): Promise<boolean> {
  return verify(hash, password);
}
