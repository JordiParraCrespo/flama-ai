import { AsyncLocalStorage } from 'node:async_hooks';
import type { DataSource, EntityManager } from 'typeorm';

const open = new AsyncLocalStorage<EntityManager>();

/**
 * Run `work` in one database transaction that every repository called inside
 * it joins, without a manager crossing a port to get there.
 *
 * A write that spans two modules — clearing a member's roles (the roles
 * module's table) along with their grants and session selection — has to
 * commit or roll back as one, but the roles module's port is not the place to
 * say which transaction that is. The repository that owns the unit of work
 * opens it here; an adapter that writes inside it asks {@link joinedTransaction}.
 * Called inside a transaction already open, `work` joins that one.
 */
export function inTransaction<T>(
  dataSource: DataSource,
  work: (manager: EntityManager) => Promise<T>,
): Promise<T> {
  const current = open.getStore();
  if (current) return work(current);
  return dataSource.transaction((manager) => open.run(manager, () => work(manager)));
}

/** The transaction the caller is running inside, if one was opened with {@link inTransaction}. */
export function joinedTransaction(): EntityManager | undefined {
  return open.getStore();
}
