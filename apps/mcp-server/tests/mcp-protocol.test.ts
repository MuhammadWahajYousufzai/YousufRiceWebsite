import { describe, it, expect } from "vitest";

const MCP_URL = process.env.MCP_TEST_URL || "http://localhost:3100";
const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN || "test-token";

async function mcpRequest(method: string, params?: any, id = "1"): Promise<any> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (AUTH_TOKEN) {
    headers["Authorization"] = `Bearer ${AUTH_TOKEN}`;
  }

  const response = await fetch(`${MCP_URL}/mcp`, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id }),
  });

  return response.json();
}

describe.skip("MCP Protocol (requires running server)", () => {
  it("responds to health check", async () => {
    const response = await fetch(`${MCP_URL}/health`);
    expect(response.ok).toBe(true);
    const body = await response.json();
    expect(body.status).toBe("ok");
  });

  it("handles initialize request", async () => {
    const result = await mcpRequest("initialize");
    expect(result.jsonrpc).toBe("2.0");
    expect(result.result.protocolVersion).toBe("2025-06-18");
    expect(result.result.serverInfo.name).toBe("yousuf-rice-mcp");
  });

  it("lists tools", async () => {
    const result = await mcpRequest("tools/list");
    expect(result.result.tools).toBeInstanceOf(Array);
    const toolNames = result.result.tools.map((t: any) => t.name);
    expect(toolNames).toContain("list_products");
    expect(toolNames).toContain("search_products");
    expect(toolNames).toContain("get_product_details");
    expect(toolNames).toContain("quote_order");
    expect(toolNames).toContain("confirm_order");
    expect(toolNames).toContain("track_order");
    expect(toolNames).toContain("request_human_support");
  });

  it("does not expose dangerous tools", async () => {
    const result = await mcpRequest("tools/list");
    const toolNames = result.result.tools.map((t: any) => t.name);
    expect(toolNames).not.toContain("query_database");
    expect(toolNames).not.toContain("create_database_row");
    expect(toolNames).not.toContain("list_all_orders");
    expect(toolNames).not.toContain("run_sql");
  });

  it("lists resources", async () => {
    const result = await mcpRequest("resources/list");
    expect(result.result.resources).toBeInstanceOf(Array);
    const uris = result.result.resources.map((r: any) => r.uri);
    expect(uris).toContain("yousuf-rice://policies/customer-service");
    expect(uris).toContain("yousuf-rice://policies/delivery");
    expect(uris).toContain("yousuf-rice://policies/payment");
    expect(uris).toContain("yousuf-rice://company/contact-information");
  });

  it("lists prompts", async () => {
    const result = await mcpRequest("prompts/list");
    expect(result.result.prompts).toBeInstanceOf(Array);
    expect(result.result.prompts[0].name).toBe("yousuf_rice_customer_service");
  });

  it("returns error for unknown tool", async () => {
    const result = await mcpRequest("tools/call", {
      name: "nonexistent_tool",
      arguments: {},
    });
    expect(result.error).toBeDefined();
    expect(result.error.code).toBe(-32601);
  });

  it("rejects unauthenticated requests when auth is configured", async () => {
    if (!AUTH_TOKEN) return;

    const response = await fetch(`${MCP_URL}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "tools/list", id: "1" }),
    });

    expect(response.status).toBe(401);
  });
});
