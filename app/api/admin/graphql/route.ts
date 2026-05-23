import { NextRequest, NextResponse } from "next/server";
import {
  execute,
  getOperationAST,
  NoSchemaIntrospectionCustomRule,
  parse,
  specifiedRules,
  validate,
} from "graphql";
import { checkAdminPermissions } from "@/lib/auth-utils";
import { adminGraphQLSchema } from "@/lib/admin/graphql-schema";

const MAX_QUERY_LENGTH = 16_000;

type GraphQLBody = {
  query?: unknown;
  variables?: unknown;
  operationName?: unknown;
};

export async function POST(req: NextRequest) {
  let body: GraphQLBody;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { errors: [{ message: "Invalid JSON request body" }] },
      { status: 400 }
    );
  }

  if (typeof body.query !== "string" || body.query.trim().length === 0) {
    return NextResponse.json(
      { errors: [{ message: "GraphQL query is required" }] },
      { status: 400 }
    );
  }

  if (body.query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { errors: [{ message: "GraphQL query is too large" }] },
      { status: 413 }
    );
  }

  const operationName =
    typeof body.operationName === "string" ? body.operationName : undefined;

  let document;
  try {
    document = parse(body.query);
  } catch (error) {
    return NextResponse.json(
      { errors: [{ message: error instanceof Error ? error.message : "Invalid GraphQL query" }] },
      { status: 400 }
    );
  }

  const operation = getOperationAST(document, operationName);
  if (!operation) {
    return NextResponse.json(
      { errors: [{ message: "GraphQL operation could not be resolved" }] },
      { status: 400 }
    );
  }

  const authError = await checkAdminPermissions(
    req,
    operation.operation === "mutation"
  );
  if (authError) {
    return authError;
  }

  const validationRules =
    process.env.NODE_ENV === "production"
      ? [...specifiedRules, NoSchemaIntrospectionCustomRule]
      : specifiedRules;
  const validationErrors = validate(adminGraphQLSchema, document, validationRules);

  if (validationErrors.length > 0) {
    return NextResponse.json(
      {
        errors: validationErrors.map((error) => ({ message: error.message })),
      },
      { status: 400 }
    );
  }

  const result = await execute({
    schema: adminGraphQLSchema,
    document,
    operationName,
    variableValues:
      body.variables && typeof body.variables === "object"
        ? (body.variables as Record<string, unknown>)
        : undefined,
  });

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}
