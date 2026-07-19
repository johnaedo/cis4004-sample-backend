// server/resetDatabase.js
//
// Combines what used to be two separate steps:
//   - db-init.sql : created the MySQL database + 'budget_user' with a password
//   - reset.js    : dropped/recreated tables and seeded default categories
//
// For MongoDB there's no CREATE DATABASE statement (databases are created
// implicitly on first write) and no separate SQL user-management language,
// so the "create a scoped app user" step becomes an optional call to
// MongoDB's createUser command, guarded behind an admin connection string.
//
// Usage:
//   MONGODB_URI="mongodb://budget_user:cis4004@localhost:27017/budget_planner" node resetDatabase.js
//
// Optional (only needed the first time, to create the app user/db, mirrors
// db-init.sql's CREATE USER / GRANT statements):
//   MONGODB_ADMIN_URI="mongodb://root:rootpass@localhost:27017/admin" node resetDatabase.js
import './dotenv.js';
import mongoose from 'mongoose';
import Category from '../models/Category.js';
import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

const {
  MONGODB_URI,
  MONGODB_ADMIN_URI, // optional, used only to provision the app user (see createAppUser)
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
} = process.env;

// Equivalent of db-init.sql:
//   CREATE DATABASE budget_planner;
//   CREATE USER 'budget_user'@'%' IDENTIFIED BY 'cis4004';
//   GRANT ALL PRIVILEGES ON budget_planner.* TO 'budget_user'@'%';
//   (repeated for 'localhost')
//
// MongoDB has no "grant per host" concept and creates databases lazily, so
// this just provisions a readWrite user scoped to DB_NAME. Skipped entirely
// if MONGODB_ADMIN_URI isn't set (e.g. local dev Mongo with no auth enabled,
// or the user/db were already provisioned by an ops team / Atlas UI).
async function createAppUser() {
  if (!MONGODB_ADMIN_URI) {
    console.log(
      'MONGODB_ADMIN_URI not set - skipping app user creation. ' +
      'Assuming the database/user already exist or auth is disabled locally.'
    );
    return;
  }

  const adminConnection = await mongoose.createConnection(MONGODB_ADMIN_URI).asPromise();

  try {
    await adminConnection.db.admin().command({
      createUser: DB_USER,
      pwd: DB_PASSWORD,
      roles: [{ role: 'readWrite', db: DB_NAME }],
    });
    console.log(`Created MongoDB user '${DB_USER}' with readWrite access to '${DB_NAME}'.`);
  } catch (error) {
    if (error.codeName === 'DuplicateKey' || /already exists/i.test(error.message)) {
      console.log(`User '${DB_USER}' already exists - skipping.`);
    } else {
      throw error;
    }
  } finally {
    await adminConnection.close();
  }
}

// Equivalent of reset.js: DROP TABLE IF EXISTS ... + CREATE TABLE ... + seed inserts
async function resetDatabase() {
  const uri = MONGODB_URI || `mongodb://${DB_USER}:${DB_PASSWORD}@localhost:27017/${DB_NAME}`;
  await mongoose.connect(uri);
  console.log(`Connected to MongoDB database '${DB_NAME}'.`);

  // Drop existing collections if they exist (similar to DROP TABLE IF EXISTS transactions/budgets/budget_categories/users)
  const existingCollections = await mongoose.connection.db.listCollections().toArray();
  const existingNames = new Set(existingCollections.map((c) => c.name));

  const modelsInDropOrder = [Transaction, Budget, Category, User];

  for (const Model of modelsInDropOrder) {
    if (existingNames.has(Model.collection.name)) {
      await Model.collection.drop();
      console.log(`Dropped collection '${Model.collection.name}'.`);
    }
  }

  // Recreate indexes for each collection (id/foreign-key constraints become
  // schema validation + indexes in Mongoose rather than SQL FOREIGN KEYs)
  await Promise.all(modelsInDropOrder.map((Model) => Model.syncIndexes()));
  console.log('Rebuilt indexes for all collections.');

  // Create default categories for demo (not linked to any user - available to all)
  const demoCategories = [
    // Income categories
    { name: 'Income', type: 'income', color: '#2ecc71' },
    { name: 'Salary', type: 'income', color: '#27ae60' },
    { name: 'Investments', type: 'income', color: '#3498db' },
    { name: 'Freelance', type: 'income', color: '#2980b9' },

    // Expense categories
    { name: 'Housing', type: 'expense', color: '#e74c3c' },
    { name: 'Transportation', type: 'expense', color: '#c0392b' },
    { name: 'Food', type: 'expense', color: '#e67e22' },
    { name: 'Utilities', type: 'expense', color: '#d35400' },
    { name: 'Healthcare', type: 'expense', color: '#f1c40f' },
    { name: 'Entertainment', type: 'expense', color: '#f39c12' },
    { name: 'Shopping', type: 'expense', color: '#9b59b6' },
    { name: 'Education', type: 'expense', color: '#8e44ad' },
  ];

  // user: null mirrors the SQL insert that omitted user_id (NULL = global/default category)
  await Category.insertMany(demoCategories.map((category) => ({ ...category, user: null })));
  console.log(`Seeded ${demoCategories.length} default categories.`);

  console.log('Database initialized successfully!');
}

async function main() {
  try {
    await createAppUser();
    await resetDatabase();
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Failed to initialize database:', error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

main();
