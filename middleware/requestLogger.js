// server/middleware/requestLogger.js

export const requestLogger = (req, res, next) => {
  if (process.env.NODE_ENV === "development") {
    res.on("finish", () => {
      const methodColor = 
        req.method === "GET" ? "\x1b[32m" :      // Green
        req.method === "POST" ? "\x1b[33m" :     // Yellow
        req.method === "PUT" ? "\x1b[34m" :      // Blue
        req.method === "DELETE" ? "\x1b[31m" :   // Red
        "\x1b[36m";                              // Cyan for others

      const reset = "\x1b[0m";
      const bold = "\x1b[1m";
      const cyan = "\x1b[36m";

      console.log(`\n${cyan}🔍 [Request Diagnostic]${reset}`);
      console.log(`  ${bold}URL:${reset} ${methodColor}${req.method}${reset} ${req.originalUrl}`);
      console.log(`  ${bold}Params:${reset}`, JSON.stringify(req.params, null, 2));
      console.log(`  ${bold}Body:${reset}`, req.body ? JSON.stringify(req.body, null, 2) : "undefined");
    });
  }
  next();
};

export default requestLogger;
