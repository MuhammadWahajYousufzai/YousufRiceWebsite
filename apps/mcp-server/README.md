# Yousuf Rice MCP Server

Model Context Protocol server exposing Yousuf Rice's customer-service and ordering capabilities.

## Architecture

```
WhatsApp Customer → Hermes Agent → MCP Server → Domain Services → Appwrite (self-hosted)
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your Appwrite credentials

# Start in development mode
pnpm dev
```

## Transports

### Streamable HTTP (Production)

The server listens on `http://<host>:<port>/mcp` for MCP requests.

```bash
pnpm start
```

Environment variables:
- `MCP_PORT` - Port (default: 3100)
- `MCP_HOST` - Host (default: 0.0.0.0)
- `MCP_AUTH_TOKEN` - Bearer token for authentication
- `MCP_RATE_LIMIT_MAX_REQUESTS` - Rate limit (default: 100)
- `MCP_RATE_LIMIT_WINDOW_MS` - Rate limit window (default: 60000)

### stdio (Local Development)

The server also supports stdio transport for local development with MCP Inspector.

```bash
MCP_STDIO=true pnpm dev
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `list_products` | List available products with pricing tiers |
| `search_products` | Search products by name/description |
| `get_product_details` | Detailed product information |
| `quote_order` | Create a price quote (server-calculated) |
| `confirm_order` | Create order from a quote (idempotent) |
| `track_order` | Track order by ID |
| `request_human_support` | Escalate to human support |

## MCP Resources

- `yousuf-rice://policies/customer-service`
- `yousuf-rice://policies/delivery`
- `yousuf-rice://policies/payment`
- `yousuf-rice://company/contact-information`

## MCP Prompts

- `yousuf_rice_customer_service` - Customer service operational instructions

## Testing

```bash
pnpm test        # Unit tests
pnpm test:watch  # Watch mode
```

## Hermes Integration

See `deploy/hermes/yousuf-rice/README.md` for Hermes setup instructions.
