// Effect-TS を Result/Either として利用するための薄い re-export。
// 自作の Result 型は作らず、必要なものだけをここから参照する。

export type { Effect as EffectType, Either as EitherType } from 'effect';
export { Data, Effect, Either } from 'effect';
export { pipe } from 'effect/Function';
