import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import "./config/dotenv.js";
import usersRouter from "./routes/users.js";
import categoriesRouter from "./routes/categories.js";
import transactionsRouter from "./routes/transactions.js";
import budgetsRouter from "./routes/budgets.js";
import { checkRequiredEnv } from "./config/check-env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFoundHandler.js";
checkRequiredEnv();

// ES Module equivalent of __serverDirname
const __serverFilename = fileURLToPath(import.meta.url);
const __serverDirname = dirname(__serverFilename);

const app = express();

// Middleware
app.use(
  cors({
    // Dynamic CORS configuration based on environment
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.CLIENT_URL || "https://your-app-name.railway.app"
        : "http://localhost:8888",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

// API Routes
app.use("/api/users", usersRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/budgets", budgetsRouter);

// API Welcome route
app.get("/api", (req, res) => {
  res.status(200).send("<h1>💰 Budget Planner API</h1>");
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

// Only start listening when this file is run directly (e.g. `node server.js`
// or `npm start`). When it's imported by Jest/Supertest via require("./server.js"),
// this block is skipped, so tests don't open a real TCP handle that never closes.
const isMainModule =
  process.argv[1] && import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  const server = app.listen(PORT, () => {
    console.log(
      `🚀 Server running in ${
        process.env.NODE_ENV || "development"
      } mode on port ${PORT}`,
    );
    if (process.env.NODE_ENV === "production") {
      console.log("🌐 Serving static files from React build");
    }
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("SIGTERM signal received: closing HTTP server");
    server.close(() => {
      console.log("HTTP server closed");
    });
  });

  // Handle uncaught exceptions
  process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (err) => {
    console.error("Unhandled Rejection:", err);
    process.exit(1);
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = app; // For Jest/test compatibility
}
export default app; // For production ES Module usage
