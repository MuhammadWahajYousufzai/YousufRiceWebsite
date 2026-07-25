# Yousuf Rice Hermes Integration

This package configures Hermes Agent to act as a Yousuf Rice customer-service and order-taking agent.

## Files

| File | Purpose |
|------|---------|
| `SOUL.md` | Hermes' permanent identity, behaviour, and system instructions |
| `mcp-config.example.yaml` | Example MCP server configuration for Hermes |
| `.env.example` | Environment variables needed |

## Setup

### 1. Deploy the MCP Server

Deploy the Yousuf Rice MCP server (see `apps/mcp-server/README.md`).

### 2. Add MCP Server to Hermes

Copy `mcp-config.example.yaml` and add it to your Hermes configuration:

```yaml
# In your Hermes config.yaml
mcp_servers:
  yousuf_rice:
    transport: http
    url: "${YOUSUF_RICE_MCP_URL}"
    headers:
      Authorization: "Bearer ${YOUSUF_RICE_MCP_TOKEN}"
    allowed_tools:
      - list_products
      - search_products
      - get_product_details
      - quote_order
      - confirm_order
      - track_order
      - request_human_support
```

### 3. Set SOUL.md

Copy `SOUL.md` to your Hermes instance as the agent's SOUL file.

### 4. Test the Connection

```bash
# Test MCP server connection
hermes mcp test yousuf_rice

# List available tools
hermes mcp tools yousuf_rice

# Start Hermes
hermes start
```

### 5. Verify the Agent

Start a conversation with the Hermes agent and ask:

1. "What rice products do you have?"
2. "I want 5kg of Basmati rice. How much will it cost?"
3. "Track my order"

## Tools Available

| Tool | Description |
|------|-------------|
| `list_products` | List all available products with pricing tiers |
| `search_products` | Search products by name/description |
| `get_product_details` | Get detailed product information |
| `quote_order` | Create a price quote for an order |
| `confirm_order` | Confirm and create an order from a quote |
| `track_order` | Track order status |
| `request_human_support` | Escalate to human support |

## Important Notes

- The agent uses Roman Urdu for communication
- Delivery is Karachi-only and free
- Payment is Cash on Delivery
- Delivery takes 2-3 business days
- No loyalty discounts or codes are available
- All prices are calculated server-side from the database
