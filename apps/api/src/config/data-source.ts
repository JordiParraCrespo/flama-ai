import { DataSource } from 'typeorm';
import { User } from '../users/user.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number.parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'flama',
  password: process.env.DB_PASSWORD || 'flama',
  database: process.env.DB_DATABASE || 'flama',
  entities: [User],
  migrations: ['src/migrations/*.ts'],
});
