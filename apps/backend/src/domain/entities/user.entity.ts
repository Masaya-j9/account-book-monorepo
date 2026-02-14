import { DomainError } from '../values/domain-error';
import type { UserId } from '../values/indentity';
import { createId } from '../values/indentity';
import type { PasswordHash } from '../values/password-hash';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class UserDomainError extends DomainError {
  constructor(message: string) {
    super(message, 'UserDomainError');
  }
}

export class User {
  private constructor(
    private readonly _id: UserId,
    private _email: string,
    private _passwordHash: PasswordHash,
    private _name: string,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(
    idValue: number,
    email: string,
    passwordHash: PasswordHash,
    name: string,
  ): User {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();

    User.validateEmail(normalizedEmail);
    User.validateName(normalizedName);

    const id = createId<UserId>(idValue, 'UserId');
    const now = new Date();

    return new User(
      id,
      normalizedEmail,
      passwordHash,
      normalizedName,
      now,
      now,
    );
  }

  static reconstruct(
    idValue: number,
    email: string,
    passwordHash: PasswordHash,
    name: string,
    createdAt: Date,
    updatedAt: Date,
  ): User {
    const id = createId<UserId>(idValue, 'UserId');
    return new User(id, email, passwordHash, name, createdAt, updatedAt);
  }

  get id(): UserId {
    return this._id;
  }

  get email(): string {
    return this._email;
  }

  get passwordHash(): PasswordHash {
    return this._passwordHash;
  }

  get name(): string {
    return this._name;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  isSameIdentityAs(other: User): boolean {
    return this._id === other._id;
  }

  private static validateEmail(email: string): void {
    if (!EMAIL_REGEX.test(email)) {
      throw new UserDomainError('メールアドレスの形式が不正です');
    }
  }

  private static validateName(name: string): void {
    if (name.length === 0) {
      throw new UserDomainError('ユーザー名は必須です');
    }
  }
}

export type UserRecord = {
  id: number;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateUserData = {
  email: string;
  passwordHash: PasswordHash;
  name: string;
};

export type PublicUserRecord = Omit<UserRecord, 'passwordHash'>;
