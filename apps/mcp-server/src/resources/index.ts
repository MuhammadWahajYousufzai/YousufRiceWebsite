import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { policies } from "@yousuf-rice/domain";

export function registerAllResources(server: McpServer): void {
  server.resource(
    "yousuf-rice://policies/customer-service",
    "yousuf-rice://policies/customer-service",
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          text: policies.CUSTOMER_SERVICE_INSTRUCTIONS,
          mimeType: "text/markdown",
        },
      ],
    }),
  );

  server.resource(
    "yousuf-rice://policies/delivery",
    "yousuf-rice://policies/delivery",
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(policies.DEFAULT_DELIVERY_POLICY, null, 2),
          mimeType: "application/json",
        },
      ],
    }),
  );

  server.resource(
    "yousuf-rice://policies/payment",
    "yousuf-rice://policies/payment",
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(policies.DEFAULT_PAYMENT_POLICY, null, 2),
          mimeType: "application/json",
        },
      ],
    }),
  );

  server.resource(
    "yousuf-rice://company/contact-information",
    "yousuf-rice://company/contact-information",
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(policies.DEFAULT_CONTACT_INFO, null, 2),
          mimeType: "application/json",
        },
      ],
    }),
  );
}
