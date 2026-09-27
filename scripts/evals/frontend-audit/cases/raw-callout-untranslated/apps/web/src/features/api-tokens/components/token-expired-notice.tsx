import type { ApiTokenEntity } from '@flama/frontend-consumer';

/** Shown above the token list when one of the reader's tokens has expired. */
export function TokenExpiredNotice({ token }: { token: ApiTokenEntity }) {
  return (
    <div role="alert" className="flex flex-col gap-1 rounded-md border border-border-subtle p-3">
      <p className="text-ink-900">{token.name} has expired</p>
      <p className="text-ink-600">
        Anything still using it is being refused. Create a new token and swap it in.
      </p>
    </div>
  );
}
