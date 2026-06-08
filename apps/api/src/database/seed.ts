import 'dotenv/config';
import type { Role } from '@flama/shared';
import { DataSource } from 'typeorm';
import { auth } from '../auth/auth';
import { Account } from '../auth/entities/account.entity';
import { Session } from '../auth/entities/session.entity';
import { Verification } from '../auth/entities/verification.entity';
import { User } from '../users/user.entity';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number.parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'flama',
  password: process.env.DB_PASSWORD || 'flama',
  database: process.env.DB_DATABASE || 'flama',
  entities: [User, Session, Account, Verification],
});

interface SeedUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
}

const seedUsers: SeedUser[] = [
  {
    email: 'admin@flama.dev',
    password: 'admin123456',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
  },
  {
    email: 'user@flama.dev',
    password: 'user123456',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
  },
];

async function seed() {
  await dataSource.initialize();
  const userRepo = dataSource.getRepository(User);

  for (const seedUser of seedUsers) {
    const existing = await userRepo.findOneBy({ email: seedUser.email });
    if (existing) continue;

    // Create the user (and its credential account) through Better Auth so the
    // password is hashed with the same algorithm used at login.
    await auth.api.signUpEmail({
      body: {
        email: seedUser.email,
        password: seedUser.password,
        name: `${seedUser.firstName} ${seedUser.lastName}`,
        firstName: seedUser.firstName,
        lastName: seedUser.lastName,
      },
    });

    // Elevate the role and mark the email verified (not settable on sign-up).
    await userRepo.update({ email: seedUser.email }, { role: seedUser.role, emailVerified: true });

    console.log(`Created ${seedUser.role} user: ${seedUser.email}`);
  }

  console.log('Seeding complete.');
  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
