import { TRPCError } from '@trpc/server';
import * as Cause from 'effect/Cause';
import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';
import { Effect, pipe } from '../../../shared/result';

export const runTrpcEffect = async <A>(
  effect: Effect.Effect<A, TRPCError>,
): Promise<A> => {
  const exit = await Effect.runPromiseExit(effect);

  return Exit.match(exit, {
    onSuccess: (value) => value,
    onFailure: (cause) => {
      const error = pipe(
        Cause.failureOption(cause),
        Option.getOrElse(
          () =>
            new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: '予期しないエラーが発生しました',
            }),
        ),
      );

      throw error;
    },
  });
};
