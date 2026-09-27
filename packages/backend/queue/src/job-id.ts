/**
 * A custom BullMQ job id, built from its parts.
 *
 * BullMQ refuses some custom ids at `queue.add` time, and only there, so a bad
 * one surfaces as a throw on the producer's hot path rather than in a test
 * with a mocked queue:
 *
 * - **no `:`** — Redis keys are `bull:<queue>:<id>`, so BullMQ rejects an id
 *   with a colon ("Custom Id cannot contain :"). It lets through ids with
 *   exactly two, for old repeatable jobs, which makes the failure depend on the
 *   data: `invite:<uuid>` throws, `a:b:c` does not.
 * - **not an integer** — those are the ids BullMQ assigns itself
 *   ("Custom Id cannot be integers").
 *
 * The parts are joined with `-`, and this throws where BullMQ would, so the
 * same mistake fails in any unit test that builds the id.
 *
 * ```ts
 * await queue.add('invitation', data, { jobId: jobId('invitation', invitationId) });
 * ```
 */
export function jobId(...parts: ReadonlyArray<string | number>): string {
  if (parts.length === 0) throw new Error('A BullMQ job id needs at least one part');
  const id = parts.map(String).join('-');
  if (id.includes(':')) {
    throw new Error(`BullMQ job ids cannot contain ':' (got "${id}")`);
  }
  if (`${Number.parseInt(id, 10)}` === id) {
    throw new Error(`BullMQ job ids cannot be integers (got "${id}")`);
  }
  return id;
}
