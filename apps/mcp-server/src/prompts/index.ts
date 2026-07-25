import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { policies } from "@yousuf-rice/domain";

export function registerAllPrompts(server: McpServer): void {
  server.prompt(
    "yousuf_rice_customer_service",
    "Operational instructions for a Yousuf Rice customer-support and order-taking agent",
    {},
    async () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: policies.CUSTOMER_SERVICE_INSTRUCTIONS,
          },
        },
      ],
    }),
  );
}
