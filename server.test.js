/**
 * Comprehensive Vitest tests for server.js
 *
 * Dependencies (install before running):
 *   npm install --save-dev vitest supertest
 *
 * Run with:
 *   npx vitest run server.test.js
 *
 * The router modules (users, categories, transactions, budgets) are mocked
 * so these tests exercise only server.js behaviour: routing, CORS, error
 * handling, static-file serving, and environment-aware logic.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";

// ---------------------------------------------------------------------------
// Mock every import that lives outside server.js (using modern ESM hoisting)
// ---------------------------------------------------------------------------

// Silence checkRequiredEnv so the server can boot without real env vars
vi.mock("./config/check-env.js", () => ({
  checkRequiredEnv: vi.fn(),
}));

// Silence dotenv config
vi.mock("./config/dotenv.js", () => ({}));

// Each router is a minimal Express Router that exposes one GET "/" so we can
// verify the correct mount path is reached.
vi.mock("./routes/users.js", async () => {
  const express = await import("express");
  const router = express.default.Router();
  router.get("/", (_req, res) => res.status(200).json({ route: "users" }));
  router.post("/", (_req, res) => res.status(201).json({ route: "users" }));
  return { default: router };
});

vi.mock("./routes/categories.js", async () => {
  const express = await import("express");
  const router = express.default.Router();
  router.get("/", (_req, res) => res.status(200).json({ route: "categories" }));
  return { default: router };
});

vi.mock("./routes/transactions.js", async () => {
  const express = await import("express");
  const router = express.default.Router();
  router.get("/", (_req, res) => res.status(200).json({ route: "transactions" }));
  return { default: router };
});

vi.mock("./routes/budgets.js", async () => {
  const express = await import("express");
  const router = express.default.Router();
  router.get("/", (_req, res) => res.status(200).json({ route: "budgets" }));
  return { default: router };
});

// ---------------------------------------------------------------------------
// Helpers – build a fresh app instance for each test group so NODE_ENV
// can be switched without cross-test pollution.
// ---------------------------------------------------------------------------

/**
 * Returns a configured Express app that mirrors server.js logic.
 * Pass `{ env: "production", clientUrl: "https://example.com" }` to test
 * production-specific branches.
 */
async function buildApp({ env = "development", clientUrl } = {}) {
  const savedEnv = process.env.NODE_ENV;
  const savedClientUrl = process.env.CLIENT_URL;

  process.env.NODE_ENV = env;
  if (clientUrl) process.env.CLIENT_URL = clientUrl;
  else delete process.env.CLIENT_URL;

  // Vitest's clean ESM-compliant module cache reset
  vi.resetModules();

  // Dynamically import the ES module server file
  const mod = await import("./server.js");
  const app = mod.default;

  // Restore env for subsequent tests
  process.env.NODE_ENV = savedEnv;
  if (savedClientUrl !== undefined) process.env.CLIENT_URL = savedClientUrl;
  else delete process.env.CLIENT_URL;

  return app;
}

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe("GET /api – welcome route", () => {
  let app;
  beforeAll(async () => {
    app = await buildApp();
  });

  it("returns 200 and the welcome HTML", async () => {
    const res = await request(app).get("/api");
    expect(res.status).toBe(200);
    expect(res.text).toContain("Budget Planner API");
  });
});

// ---------------------------------------------------------------------------
describe("Router mounts", () => {
  let app;
  beforeAll(async () => {
    app = await buildApp();
  });

  it("mounts users router at /api/users", async () => {
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(200);
    expect(res.body.route).toBe("users");
  });

  it("mounts categories router at /api/categories", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(200);
    expect(res.body.route).toBe("categories");
  });

  it("mounts transactions router at /api/transactions", async () => {
    const res = await request(app).get("/api/transactions");
    expect(res.status).toBe(200);
    expect(res.body.route).toBe("transactions");
  });

  it("mounts budgets router at /api/budgets", async () => {
    const res = await request(app).get("/api/budgets");
    expect(res.status).toBe(200);
    expect(res.body.route).toBe("budgets");
  });

  it("POST /api/users returns 201", async () => {
    const res = await request(app).post("/api/users").send({});
    expect(res.status).toBe(201);
    expect(res.body.route).toBe("users");
  });
});

// ---------------------------------------------------------------------------
describe("404 handling – development mode", () => {
  let app;
  beforeAll(async () => {
    app = await buildApp({ env: "development" });
  });

  it("returns 404 JSON for unknown /api/* paths", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "API endpoint not found" });
  });

  it("returns 404 plain text for unknown non-API paths", async () => {
    const res = await request(app).get("/unknown-page");
    expect(res.status).toBe(404);
    expect(res.text).toBe("Not found");
  });
});

// ---------------------------------------------------------------------------
describe("CORS – development mode", () => {
  let app;
  beforeAll(async () => {
    app = await buildApp({ env: "development" });
  });

  it("allows requests from http://localhost:8888", async () => {
    const res = await request(app)
      .get("/api")
      .set("Origin", "http://localhost:8888");
    expect(res.headers["access-control-allow-origin"]).toBe(
      "http://localhost:8888",
    );
  });

  it("includes credentials header", async () => {
    const res = await request(app)
      .get("/api")
      .set("Origin", "http://localhost:8888");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("handles preflight OPTIONS requests", async () => {
    const res = await request(app)
      .options("/api/users")
      .set("Origin", "http://localhost:8888")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "Content-Type,Authorization");
    expect([200, 204]).toContain(res.status);
  });
});

// ---------------------------------------------------------------------------
describe("CORS – production mode (CLIENT_URL set)", () => {
  let app;
  const PROD_ORIGIN = "https://my-budget-app.railway.app";
  beforeAll(async () => {
    app = await buildApp({ env: "production", clientUrl: PROD_ORIGIN });
  });

  it("allows requests from the configured CLIENT_URL", async () => {
    const res = await request(app).get("/api").set("Origin", PROD_ORIGIN);
    expect(res.headers["access-control-allow-origin"]).toBe(PROD_ORIGIN);
  });
});

// ---------------------------------------------------------------------------
describe("CORS – production mode (CLIENT_URL absent)", () => {
  let app;
  beforeAll(async () => {
    app = await buildApp({ env: "production" });
  });

  it("falls back to the default railway origin", async () => {
    const res = await request(app)
      .get("/api")
      .set("Origin", "https://your-app-name.railway.app");
    expect(res.headers["access-control-allow-origin"]).toBe(
      "https://your-app-name.railway.app",
    );
  });
});

// ---------------------------------------------------------------------------
describe("Error-handling middleware", () => {
  beforeAll(() => vi.spyOn(console, "error").mockImplementation(() => {}));
  afterAll(() => vi.restoreAllMocks());

  async function buildErrorApp(env = "development") {
    const savedEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = env;
    vi.resetModules();

    const expressMod = await import("express");
    const express = expressMod.default;
    const { errorHandler } = await import("./middleware/errorHandler.js");

    const app = express();
    app.use(express.json());

    app.get("/_test/generic-error", (_req, _res, next) => {
      next(new Error("Something blew up"));
    });

    app.get("/_test/unauthorized", (_req, _res, next) => {
      const err = new Error("bad token");
      err.name = "UnauthorizedError";
      next(err);
    });

    app.get("/_test/validation-error", (_req, _res, next) => {
      const err = new Error("email is required");
      err.name = "ValidationError";
      next(err);
    });

    app.use(errorHandler);

    return app;
  }

  describe("development mode", () => {
    let app;
    beforeAll(async () => {
      app = await buildErrorApp("development");
    });
    afterAll(() => {
      process.env.NODE_ENV = "development";
    });

    it("returns 500 with err.message in development", async () => {
      const res = await request(app).get("/_test/generic-error");
      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Something blew up");
    });

    it("returns 401 for UnauthorizedError", async () => {
      const res = await request(app).get("/_test/unauthorized");
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid token");
    });

    it("returns 400 for ValidationError with message", async () => {
      const res = await request(app).get("/_test/validation-error");
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("email is required");
    });
  });

  describe("production mode", () => {
    let app;
    beforeAll(async () => {
      process.env.NODE_ENV = "production";
      app = await buildErrorApp("production");
    });
    afterAll(() => {
      process.env.NODE_ENV = "development";
    });

    it("returns generic message instead of err.message in production", async () => {
      const res = await request(app).get("/_test/generic-error");
      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Internal server error");
    });

    it("still returns 401 for UnauthorizedError in production", async () => {
      const res = await request(app).get("/_test/unauthorized");
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid token");
    });

    it("still returns 400 for ValidationError in production", async () => {
      const res = await request(app).get("/_test/validation-error");
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("email is required");
    });
  });
});

// ---------------------------------------------------------------------------
describe("JSON body parsing", () => {
  let app;
  beforeAll(async () => {
    app = await buildApp();
  });

  it("parses JSON request bodies on API routes", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("Content-Type", "application/json")
      .send({ username: "alice", password: "s3cr3t" });
    expect(res.status).toBe(201);
  });

  it("returns 400 for malformed JSON", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("Content-Type", "application/json")
      .send("{bad json}");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid JSON");
  });
});

// ---------------------------------------------------------------------------
describe("Production static-file serving", () => {
  let app;
  beforeAll(async () => {
    app = await buildApp({ env: "production" });
  });

  it("returns 404 JSON for unknown /api/* paths in production", async () => {
    const res = await request(app).get("/api/not-here");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "API endpoint not found" });
  });

  it("returns 404 for unknown non-API paths in production", async () => {
    const res = await request(app).get("/some-client-route");
    expect(res.status).toBe(404);
    expect(res.text).toBe("Not found");
  });
});

// ---------------------------------------------------------------------------
describe("checkRequiredEnv is called on startup", () => {
  it("invokes checkRequiredEnv when the module is loaded", async () => {
    vi.resetModules();
    const { checkRequiredEnv } = await import("./config/check-env.js");
    checkRequiredEnv.mockClear();
    await import("./server.js");
    expect(checkRequiredEnv).toHaveBeenCalledTimes(1);
  });
});