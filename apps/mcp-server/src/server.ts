import { loadConfigFromEnv, initAppwrite, policies } from "@yousuf-rice/domain";
import { createStreamableHttpServer } from "./transports/streamable-http";

async function main(): Promise<void> {
  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    console.log("Starting Yousuf Rice MCP Server (development mode)");
  }

  try {
    const config = loadConfigFromEnv();
    initAppwrite(config);
    console.log("Appwrite client initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Appwrite client:", error);
    process.exit(1);
  }

  const authToken = process.env.MCP_AUTH_TOKEN;

  const app = createStreamableHttpServer({
    server: {} as any,
    authToken,
    rateLimitMax: Number(process.env.MCP_RATE_LIMIT_MAX_REQUESTS) || 100,
    rateLimitWindowMs: Number(process.env.MCP_RATE_LIMIT_WINDOW_MS) || 60000,
  });

  const port = Number(process.env.MCP_PORT) || 3100;
  const host = process.env.MCP_HOST || "0.0.0.0";

  const httpServer = app.listen(port, host, () => {
    console.log(`Yousuf Rice MCP Server listening on ${host}:${port}`);
    console.log(`Health endpoint: http://${host}:${port}/health`);
    console.log(`MCP endpoint: http://${host}:${port}/mcp`);
    console.log(`Delivery policy: ${policies.DEFAULT_DELIVERY_POLICY.deliveryAreas.join(", ")}`);
    console.log(`Delivery timeline: ${policies.DEFAULT_DELIVERY_POLICY.deliveryTimeline}`);
    console.log(`Auth: ${authToken ? "Bearer token required" : "No authentication"}`);
  });

  const shutdown = (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    httpServer.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });

    setTimeout(() => {
      console.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
    shutdown("uncaughtException");
  });
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
  });
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
