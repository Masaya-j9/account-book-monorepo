// Value Object: Money
// 金額と通貨を表現する不変の値オブジェクト

export class MoneyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyValidationError';
  }
}

export class Money {
  private static readonly DEFAULT_CURRENCY = 'JPY' as const;
  private static readonly CURRENCY_CODE_LENGTH = 3 as const;
  private static readonly ZERO = 0 as const;
  private static readonly MIN_POSITIVE_INTEGER = 1 as const;

  private constructor(
    private readonly _amount: number,
    private readonly _currency: string,
  ) {}

  // =====================================
  // ファクトリメソッド
  // =====================================

  /**
   * 金額から生成（通貨はJPY固定）
   */
  static of(amount: number): Money {
    Money.validateIntegerAmount(amount);
    Money.validateNonNegativeAmount(amount);
    return new Money(amount, Money.DEFAULT_CURRENCY);
  }

  /**
   * 通貨を指定して生成（将来の拡張用）
   */
  static ofWithCurrency(amount: number, currency: string): Money {
    Money.validateIntegerAmount(amount);
    Money.validateNonNegativeAmount(amount);
    Money.validateCurrencyCode(currency);
    return new Money(amount, currency.toUpperCase());
  }

  private static validateIntegerAmount(amount: number): void {
    if (!Number.isInteger(amount)) {
      throw new MoneyValidationError('金額は整数である必要があります');
    }
  }

  private static validateNonNegativeAmount(amount: number): void {
    if (amount < Money.ZERO) {
      throw new MoneyValidationError('金額は0以上である必要があります');
    }
  }

  private static validateCurrencyCode(currency: string): void {
    if (
      currency.length !== Money.CURRENCY_CODE_LENGTH ||
      currency.trim().length !== Money.CURRENCY_CODE_LENGTH
    ) {
      throw new MoneyValidationError(
        `通貨コードは${Money.CURRENCY_CODE_LENGTH}文字である必要があります`,
      );
    }
  }

  // =====================================
  // ゲッター
  // =====================================

  get amount(): number {
    return this._amount;
  }

  get currency(): string {
    return this._currency;
  }

  // =====================================
  // 演算メソッド
  // =====================================

  /**
   * 金額の加算
   */
  add(other: Money): Money {
    this.validateSameCurrency(other);
    return new Money(this._amount + other._amount, this._currency);
  }

  /**
   * 金額の減算
   */
  subtract(other: Money): Money {
    this.validateSameCurrency(other);
    const result = this._amount - other._amount;
    if (result < 0) {
      throw new MoneyValidationError('減算結果が負の値になります');
    }
    return new Money(result, this._currency);
  }

  /**
   * 金額の乗算
   */
  multiply(factor: number): Money {
    if (!Number.isInteger(factor)) {
      throw new MoneyValidationError('乗数は整数である必要があります');
    }
    if (factor < Money.ZERO) {
      throw new MoneyValidationError('乗数は0以上である必要があります');
    }
    return new Money(this._amount * factor, this._currency);
  }

  /**
   * 金額の除算（整数除算）
   */
  divide(divisor: number): Money {
    if (!Number.isInteger(divisor)) {
      throw new MoneyValidationError('除数は整数である必要があります');
    }
    if (divisor < Money.MIN_POSITIVE_INTEGER) {
      throw new MoneyValidationError('除数は0より大きい必要があります');
    }
    // 整数除算
    return new Money(Math.floor(this._amount / divisor), this._currency);
  }

  // =====================================
  // 比較メソッド
  // =====================================

  /**
   * 値の等価性をチェック
   */
  equals(other: Money): boolean {
    return this._amount === other._amount && this._currency === other._currency;
  }

  /**
   * より大きいかチェック
   */
  greaterThan(other: Money): boolean {
    this.validateSameCurrency(other);
    return this._amount > other._amount;
  }

  /**
   * より小さいかチェック
   */
  lessThan(other: Money): boolean {
    this.validateSameCurrency(other);
    return this._amount < other._amount;
  }

  /**
   * 0かどうかをチェック
   */
  isZero(): boolean {
    return this._amount === 0;
  }

  // =====================================
  // ユーティリティ
  // =====================================

  /**
   * フォーマット済み文字列で取得
   */
  format(): string {
    return `¥${this._amount.toLocaleString('ja-JP')}`;
  }

  /**
   * 通貨が同じかをチェック
   */
  private validateSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new MoneyValidationError(
        `通貨が異なります: ${this._currency} vs ${other._currency}`,
      );
    }
  }
}
