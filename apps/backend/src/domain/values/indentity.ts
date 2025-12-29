// Domain Layer: Identity Branded Types
// 識別子の型安全性を保証するBranded Type定義

// =====================================
// Branded Type Definition
// =====================================

declare const brand: unique symbol;

type Brand<T, TBrand extends string> = T & { [brand]: TBrand };

// =====================================
// Branded Type Exports
// =====================================

export type UserId = Brand<number, 'UserId'>;
export type CategoryId = Brand<number, 'CategoryId'>;
export type TransactionId = Brand<number, 'TransactionId'>;
export type CurrencyId = Brand<number, 'CurrencyId'>;
export type TransactionTypeId = Brand<number, 'TransactionTypeId'>;

// =====================================
// Identity Class
// =====================================

export class Identity<T extends Brand<number, string>> {
  private _value: number;
  private _typeName: string;

  private constructor(value: number, typeName: string) {
    this._value = value;
    this._typeName = typeName;
  }

  static of<T extends Brand<number, string>>(
    value: number,
    typeName: string,
  ): Identity<T> {
    return new Identity<T>(value, typeName);
  }

  validate(): this {
    if (!Number.isInteger(this._value)) {
      throw new Error(`${this._typeName} must be an integer: ${this._value}`);
    }
    if (this._value <= 0) {
      throw new Error(`${this._typeName} must be positive: ${this._value}`);
    }
    return this;
  }

  map(fn: (value: number) => number): this {
    this._value = fn(this._value);
    return this;
  }

  build(): T {
    return this._value as T;
  }

  // =====================================
  // 同一性チェック (Identity Comparison)
  // =====================================

  /**
   * 同じ型で同じ値を持つ識別子かどうかを判定
   * 識別子の本質: 同じIDは同じエンティティを指す
   */
  equals(other: Identity<T>): boolean {
    return this._value === other._value && this._typeName === other._typeName;
  }

  /**
   * 値の取得(比較用)
   */
  get value(): number {
    return this._value;
  }

  /**
   * 型名の取得(比較用)
   */
  get typeName(): string {
    return this._typeName;
  }
}

// =====================================
// Factory Function
// =====================================

export const createId = <T extends Brand<number, string>>(
  value: number,
  typeName: string,
): T => {
  return Identity.of<T>(value, typeName).validate().build();
};
