import { describe, expect, it } from 'vitest';

import { PasswordHash } from '../values/password-hash';
import { User, UserDomainError } from './user.entity';

describe('User（ユーザー）', () => {
  describe('正常系', () => {
    it('create: 新規ユーザーを生成できる', () => {
      const passwordHash = PasswordHash.reconstruct('salt:hash');

      const user = User.create(
        1,
        ' TestUser@Example.com ',
        passwordHash,
        ' テスト ',
      );

      expect(user.id).toBe(1);
      expect(user.email).toBe('testuser@example.com');
      expect(user.passwordHash.value).toBe('salt:hash');
      expect(user.name).toBe('テスト');
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('reconstruct: 既存ユーザーを再構築できる', () => {
      const createdAt = new Date('2025-01-01T00:00:00.000Z');
      const updatedAt = new Date('2025-01-02T00:00:00.000Z');
      const passwordHash = PasswordHash.reconstruct('salt:hash');

      const user = User.reconstruct(
        10,
        'user@example.com',
        passwordHash,
        'ユーザー',
        createdAt,
        updatedAt,
      );

      expect(user.id).toBe(10);
      expect(user.createdAt).toBe(createdAt);
      expect(user.updatedAt).toBe(updatedAt);
    });

    it('isSameIdentityAs: IDが同じ場合は同一ユーザーと判定できる', () => {
      const passwordHashA = PasswordHash.reconstruct('salt:hash-a');
      const passwordHashB = PasswordHash.reconstruct('salt:hash-b');

      const a = User.reconstruct(
        1,
        'a@example.com',
        passwordHashA,
        'A',
        new Date('2025-01-01T00:00:00.000Z'),
        new Date('2025-01-01T00:00:00.000Z'),
      );
      const b = User.reconstruct(
        1,
        'b@example.com',
        passwordHashB,
        'B',
        new Date('2025-01-03T00:00:00.000Z'),
        new Date('2025-01-03T00:00:00.000Z'),
      );

      expect(a.isSameIdentityAs(b)).toBe(true);
    });
  });

  describe('異常系', () => {
    it('create: メールアドレス形式が不正な場合は例外になる', () => {
      const passwordHash = PasswordHash.reconstruct('salt:hash');

      expect(() =>
        User.create(1, 'invalid-email', passwordHash, 'テスト'),
      ).toThrow(UserDomainError);
      expect(() =>
        User.create(1, 'invalid-email', passwordHash, 'テスト'),
      ).toThrow('メールアドレスの形式が不正です');
    });

    it('create: 名前が空の場合は例外になる', () => {
      const passwordHash = PasswordHash.reconstruct('salt:hash');

      expect(() =>
        User.create(1, 'user@example.com', passwordHash, '  '),
      ).toThrow(UserDomainError);
      expect(() =>
        User.create(1, 'user@example.com', passwordHash, '  '),
      ).toThrow('ユーザー名は必須です');
    });

    it('create: パスワードハッシュ値オブジェクトを保持できる', () => {
      const passwordHash = PasswordHash.reconstruct('salt:hash');
      const user = User.create(1, 'user@example.com', passwordHash, 'テスト');

      expect(user.passwordHash.value).toBe('salt:hash');
    });
  });
});
