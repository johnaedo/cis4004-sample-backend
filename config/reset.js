import { pool } from './database.js';

async function resetDatabase() {
  try {
    // Drop existing tables if they exist
    await pool.query('DROP TABLE IF EXISTS transactions');
    await pool.query('DROP TABLE IF EXISTS budgets');
    await pool.query('DROP TABLE IF EXISTS budget_categories');
    await pool.query('DROP TABLE IF EXISTS users');

    // Create users table
    await pool.query(`
      CREATE TABLE users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create budget_categories table
    await pool.query(`
      CREATE TABLE budget_categories (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        name VARCHAR(255) NOT NULL,
        type ENUM('income', 'expense') NOT NULL,
        color VARCHAR(7) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create budgets table
    await pool.query(`
      CREATE TABLE budgets (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        category_id INT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES budget_categories(id) ON DELETE CASCADE
      )
    `);

    // Create transactions table
    await pool.query(`
      CREATE TABLE transactions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        category_id INT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        description TEXT,
        date DATE NOT NULL,
        type ENUM('income', 'expense') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES budget_categories(id) ON DELETE CASCADE
      )
    `);

    // Create default categories for demo
    const demoCategories = [
      // Income categories
      ['Income', 'income', '#2ecc71'],
      ['Salary', 'income', '#27ae60'],
      ['Investments', 'income', '#3498db'],
      ['Freelance', 'income', '#2980b9'],
      
      // Expense categories
      ['Housing', 'expense', '#e74c3c'],
      ['Transportation', 'expense', '#c0392b'],
      ['Food', 'expense', '#e67e22'],
      ['Utilities', 'expense', '#d35400'],
      ['Healthcare', 'expense', '#f1c40f'],
      ['Entertainment', 'expense', '#f39c12'],
      ['Shopping', 'expense', '#9b59b6'],
      ['Education', 'expense', '#8e44ad']
    ];

    // Insert default categories (not linked to any user - available to all)
    for (const [name, type, color] of demoCategories) {
      await pool.query(
        'INSERT INTO budget_categories (name, type, color) VALUES (?, ?, ?)',
        [name, type, color]
      );
    }

    console.log('Database initialized successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Run the initialization
resetDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });
