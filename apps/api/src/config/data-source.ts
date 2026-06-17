import { DataSource } from 'typeorm';
import { Account } from '../auth/entities/account.entity';
import { Session } from '../auth/entities/session.entity';
import { Verification } from '../auth/entities/verification.entity';
import { UserOrmEntity } from '../users/database/user.orm-entity';

/**
 * Data source used by the TypeORM CLI (`migration:generate` / `migration:run` /
 * `migration:revert`). The runtime app configures TypeORM in `AppModule`.
 *
 * The migrations glob is resolved relative to this file so it works both when
 * run through ts-node (`src/`) and from the compiled output (`dist/`).
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number.parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'flama',
  password: process.env.DB_PASSWORD || 'flama',
  database: process.env.DB_DATABASE || 'flama',
  entities: [UserOrmEntity, Session, Account, Verification],
  migrations: [`${__dirname}/../migrations/*{.ts,.js}`],
});
