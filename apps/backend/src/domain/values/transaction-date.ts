// Value Object: TransactionDate
// 取引日付を表現する不変の値オブジェクト

export class TransactionDateValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransactionDateValidationError';
  }
}

export class TransactionDate {
  private static readonly YEAR_MIN = 1900 as const;
  private static readonly YEAR_MAX = 2100 as const;

  private static readonly MONTH_MIN = 1 as const;
  private static readonly MONTH_MAX = 12 as const;

  private static readonly DAY_MIN = 1 as const;
  private static readonly DAY_MAX = 31 as const;

  private static readonly DATE_PARTS_COUNT = 3 as const;
  private static readonly DATE_SEPARATOR = '-' as const;
  private static readonly DECIMAL_RADIX = 10 as const;

  private static readonly YEAR_PAD_LENGTH = 4 as const;
  private static readonly MONTH_PAD_LENGTH = 2 as const;
  private static readonly DAY_PAD_LENGTH = 2 as const;
  private static readonly PAD_CHAR = '0' as const;

  private static readonly JS_MONTH_OFFSET = 1 as const;

  private constructor(
    private readonly _year: number,
    private readonly _month: number,
    private readonly _day: number,
  ) {}

  private static assert(
    condition: boolean,
    message: string,
  ): asserts condition {
    if (!condition) {
      throw new TransactionDateValidationError(message);
    }
  }

  private static validateYear(year: number): void {
    TransactionDate.assert(
      Number.isInteger(year) &&
        year >= TransactionDate.YEAR_MIN &&
        year <= TransactionDate.YEAR_MAX,
      `年は${TransactionDate.YEAR_MIN}から${TransactionDate.YEAR_MAX}の整数である必要があります`,
    );
  }

  private static validateMonth(month: number): void {
    TransactionDate.assert(
      Number.isInteger(month) &&
        month >= TransactionDate.MONTH_MIN &&
        month <= TransactionDate.MONTH_MAX,
      `月は${TransactionDate.MONTH_MIN}から${TransactionDate.MONTH_MAX}の整数である必要があります`,
    );
  }

  private static validateDay(day: number): void {
    TransactionDate.assert(
      Number.isInteger(day) &&
        day >= TransactionDate.DAY_MIN &&
        day <= TransactionDate.DAY_MAX,
      `日は${TransactionDate.DAY_MIN}から${TransactionDate.DAY_MAX}の整数である必要があります`,
    );
  }

  private static validateDateExists(
    year: number,
    month: number,
    day: number,
  ): void {
    const jsMonth = month - TransactionDate.JS_MONTH_OFFSET;
    const date = new Date(year, jsMonth, day);

    TransactionDate.assert(
      date.getFullYear() === year &&
        date.getMonth() === jsMonth &&
        date.getDate() === day,
      '無効な日付です',
    );
  }

  // =====================================
  // ファクトリメソッド
  // =====================================

  /**
   * 年月日から生成
   */
  static of(year: number, month: number, day: number): TransactionDate {
    TransactionDate.validateYear(year);
    TransactionDate.validateMonth(month);
    TransactionDate.validateDay(day);
    TransactionDate.validateDateExists(year, month, day);

    return new TransactionDate(year, month, day);
  }

  /**
   * Dateオブジェクトから生成
   */
  static fromDate(date: Date): TransactionDate {
    return TransactionDate.of(
      date.getFullYear(),
      date.getMonth() + TransactionDate.JS_MONTH_OFFSET,
      date.getDate(),
    );
  }

  /**
   * ISO8601形式の文字列から生成 (YYYY-MM-DD)
   */
  static fromString(dateString: string): TransactionDate {
    const parts = dateString.split(TransactionDate.DATE_SEPARATOR);
    TransactionDate.assert(
      parts.length === TransactionDate.DATE_PARTS_COUNT,
      '日付はYYYY-MM-DD形式である必要があります',
    );

    const year = Number.parseInt(parts[0], TransactionDate.DECIMAL_RADIX);
    const month = Number.parseInt(parts[1], TransactionDate.DECIMAL_RADIX);
    const day = Number.parseInt(parts[2], TransactionDate.DECIMAL_RADIX);

    return TransactionDate.of(year, month, day);
  }

  /**
   * 今日の日付を生成
   */
  static today(): TransactionDate {
    return TransactionDate.fromDate(new Date());
  }

  // =====================================
  // ゲッター
  // =====================================

  get year(): number {
    return this._year;
  }

  get month(): number {
    return this._month;
  }

  get day(): number {
    return this._day;
  }

  // =====================================
  // 変換メソッド
  // =====================================

  /**
   * Dateオブジェクトに変換
   */
  toDate(): Date {
    return new Date(
      this._year,
      this._month - TransactionDate.JS_MONTH_OFFSET,
      this._day,
    );
  }

  /**
   * ISO8601形式の文字列に変換 (YYYY-MM-DD)
   */
  format(): string {
    const year = this._year
      .toString()
      .padStart(TransactionDate.YEAR_PAD_LENGTH, TransactionDate.PAD_CHAR);
    const month = this._month
      .toString()
      .padStart(TransactionDate.MONTH_PAD_LENGTH, TransactionDate.PAD_CHAR);
    const day = this._day
      .toString()
      .padStart(TransactionDate.DAY_PAD_LENGTH, TransactionDate.PAD_CHAR);
    return `${year}${TransactionDate.DATE_SEPARATOR}${month}${TransactionDate.DATE_SEPARATOR}${day}`;
  }

  /**
   * 日本語形式の文字列に変換 (YYYY年M月D日)
   */
  formatJapanese(): string {
    return `${this._year}年${this._month}月${this._day}日`;
  }

  // =====================================
  // 比較メソッド
  // =====================================

  /**
   * 値の等価性をチェック
   */
  equals(other: TransactionDate): boolean {
    return (
      this._year === other._year &&
      this._month === other._month &&
      this._day === other._day
    );
  }

  /**
   * 同じ月かどうかをチェック
   */
  isSameMonth(other: TransactionDate): boolean {
    return this._year === other._year && this._month === other._month;
  }

  /**
   * 同じ年かどうかをチェック
   */
  isSameYear(other: TransactionDate): boolean {
    return this._year === other._year;
  }

  /**
   * より後の日付かどうかをチェック
   */
  isAfter(other: TransactionDate): boolean {
    return this.toDate() > other.toDate();
  }

  /**
   * より前の日付かどうかをチェック
   */
  isBefore(other: TransactionDate): boolean {
    return this.toDate() < other.toDate();
  }

  /**
   * 未来日かどうかをチェック
   */
  isFuture(): boolean {
    const today = TransactionDate.today();
    return this.isAfter(today);
  }

  /**
   * 過去日かどうかをチェック
   */
  isPast(): boolean {
    const today = TransactionDate.today();
    return this.isBefore(today);
  }
}
