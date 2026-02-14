import {
  scrypt as nodeScrypt,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(nodeScrypt);

const HASH_KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export class PasswordHash {
  private constructor(private readonly _value: string) {}

  static async create(rawPassword: string): Promise<PasswordHash> {
    const salt = randomBytes(SALT_LENGTH).toString('hex');
    const derived = (await scrypt(
      rawPassword,
      salt,
      HASH_KEY_LENGTH,
    )) as Buffer;
    return new PasswordHash(`${salt}:${derived.toString('hex')}`);
  }

  static reconstruct(value: string): PasswordHash {
    return new PasswordHash(value);
  }

  get value(): string {
    return this._value;
  }

  async matches(rawPassword: string): Promise<boolean> {
    const [salt, hashHex] = this._value.split(':');

    if (!salt || !hashHex) {
      return false;
    }

    const derived = (await scrypt(
      rawPassword,
      salt,
      HASH_KEY_LENGTH,
    )) as Buffer;
    const expected = Buffer.from(hashHex, 'hex');

    return (
      expected.length === derived.length && timingSafeEqual(expected, derived)
    );
  }
}
