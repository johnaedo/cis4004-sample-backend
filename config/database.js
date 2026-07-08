import mysql from "mysql2/promise";
// import "./dotenv.js";
import "./dotenv.js";
const isProduction = process.env.NODE_ENV === "production";

const getConnectionConfig = () => {
  const config = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "budget_user",
    database: process.env.DB_NAME || "budget_planner",
    port: parseInt(process.env.DB_PORT) || "3306",
    password: process.env.DB_PASSWORD || "budget",
  };

  // Only add password if it's set
  /*
  if (process.env.DB_PASSWORD !== undefined) {
    config.password = process.env.DB_PASSWORD;
  }
  */
  // Add SSL for production
  if (isProduction) {
    config.ssl = {
      rejectUnauthorized: false,
    };
  }

  return config;
};

// Create connection pool
const pool = mysql.createPool({
  ...getConnectionConfig(),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log(
      `Database connected successfully to ${
        isProduction ? "production" : "local"
      } instance`,
    );
    connection.release();
  } catch (err) {
    console.error("Database connection error:", err);
  }
};

testConnection();

export { pool };
