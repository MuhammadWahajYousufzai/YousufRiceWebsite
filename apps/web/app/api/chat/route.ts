import { NextResponse } from 'next/server';
import { run, InputGuardrailTripwireTriggered } from '@openai/agents';
import { yousufRiceAgent } from '@/lib/agents/yousufRiceAgent';
import { Client, Account } from 'appwrite';
import { serverSessionManager } from '@/lib/server-session-manager';

interface ChatRequest {
  userId: string;
  message: string;
  stream?: boolean;
  sessionId?: string; // Server-managed session ID
  userContext?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

/**
 * POST /api/chat
 * Main chat endpoint for OpenAI Agents SDK integration
 * Handles both streaming and non-streaming responses
 * 
 * The OpenAI SDK handles all session memory/context internally.
 * We just provide the session ID and user input.
 */
export async function POST(req: Request) {
  try {
    const { message, stream, sessionId: existingSessionId, userContext } = (await req.json()) as ChatRequest;

    // Initialize Appwrite client for this request
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

    // Get JWT from Authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing or invalid token' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Set JWT on client
    client.setJWT(token);
    const account = new Account(client);

    let userId: string;
    try {
      const user = await account.get();
      userId = user.$id;
      // console.log('[API] User authenticated:', userId);
    } catch (error: any) {
      console.error('[API] Auth failed:', error.message);
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      );
    }

    // Validate required message field
    if (!message) {
      return NextResponse.json(
        { error: 'Missing required fields: message is required' },
        { status: 400 }
      );
    }

    // Build context-aware message if user data is available
    let contextualMessage = message;
    if (userContext && (userContext.name || userContext.email || userContext.phone)) {
      const contextParts: string[] = [];
      if (userContext.name) contextParts.push(`Customer Name: ${userContext.name}`);
      if (userContext.email) contextParts.push(`Email: ${userContext.email}`);
      if (userContext.phone) contextParts.push(`Phone: ${userContext.phone}`);

      // Prepend context only on first message or when creating orders
      const needsContext = !existingSessionId ||
        message.toLowerCase().includes('order') ||
        message.toLowerCase().includes('buy') ||
        message.toLowerCase().includes('purchase');

      if (needsContext && contextParts.length > 0) {
        contextualMessage = `[User Context: ${contextParts.join(', ')}]\n\n${message}`;
      }
    }

    // Use the authenticated userId for session management
    console.log(`Authenticated user: ${userId}`);

    // Get or create server-managed session
    let sessionData;
    if (existingSessionId) {
      // Try to get existing session
      sessionData = serverSessionManager.getSession(existingSessionId);
      if (!sessionData) {
        // Session expired or doesn't exist, create new one
        console.log(`Session ${existingSessionId} not found or expired, creating new session for user ${userId}`);
        sessionData = await serverSessionManager.getOrCreateSession(userId);
      }
    } else {
      // Create new session
      sessionData = await serverSessionManager.getOrCreateSession(userId);
    }

    const { sessionId, openaiSession } = sessionData;

    // Determine if we should stream
    const shouldStream = stream ?? true;

    // Run the Yousuf Rice agent with all tools
    if (shouldStream) {
      try {
        // Run the agent with streaming enabled and session for memory
        const result = await run(yousufRiceAgent, contextualMessage, {
          stream: true,
          session: openaiSession,
          maxTurns: 20, // Allow sufficient turns for complex workflows
        });

        // Get the OpenAI conversation ID for debugging (optional)
        const openaiConversationId = await openaiSession.getSessionId();

        // Convert to text stream compatible with web streams
        // The SDK will stream the 'message' field from the structured output
        const textStream = result.toTextStream();

        // Convert Node.js readable stream to Web ReadableStream
        const encoder = new TextEncoder();
        const webStream = new ReadableStream({
          async start(controller) {
            try {
              // Read from the text stream
              for await (const chunk of textStream) {
                controller.enqueue(encoder.encode(chunk));
              }
              controller.close();
            } catch (error) {
              if (error instanceof InputGuardrailTripwireTriggered) {
                console.log("Guardrail tripped during streaming");
                // Gracefully handle the error by sending the friendly message as part of the stream
                const message = "Please ask relevant questions related to Yousuf Rice.";
                controller.enqueue(encoder.encode(message));
                controller.close();
                return;
              }
              console.error('Streaming error:', error);
              controller.error(error);
            }
          },
        });

        return new NextResponse(webStream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Session-Id': sessionId, // Send server session ID in header
          },
        });
      } catch (error) {
        if (error instanceof InputGuardrailTripwireTriggered) {
          console.log("Guardrail tripped during streaming setup");
          // Return a stream with the rejection message
          const message = "Please ask relevant questions related to Yousuf Rice.";
          const encoder = new TextEncoder();
          const webStream = new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode(message));
              controller.close();
            },
          });
          
          return new NextResponse(webStream, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
              'X-Session-Id': sessionId,
            },
          });
        }
        console.error('Streaming setup error:', error);
        throw error;
      }
    }

    // Non-streaming response
    const result = await run(yousufRiceAgent, contextualMessage, {
      session: openaiSession,
      maxTurns: 20, // Allow sufficient turns for complex workflows
    });

    // Get the OpenAI conversation ID for debugging (optional)
    const openaiConversationId = await openaiSession.getSessionId();

    // Get the final output from the agent
    const output = result.finalOutput;
    const responseMessage = String(output);

    return NextResponse.json({
      success: true,
      output: responseMessage,
      sessionId, // Return server session ID to store in frontend
    });
  } catch (error: any) {
    if (error instanceof InputGuardrailTripwireTriggered) {
      return NextResponse.json({
        success: true, 
        output: "Please ask relevant questions related to Yousuf Rice.",
        sessionId: (error as any).sessionId // Try to preserve session if possible, though unlikely needed here
      });
    }

    console.error('Chat API Error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    });

    // Check if it's a max turns error
    if (error.message && error.message.includes('Max turns')) {
      console.error('Max turns exceeded - Agent may be stuck in a loop');
      return NextResponse.json(
        {
          success: false,
          error: 'The conversation became too complex. Please start a new conversation or ask a simpler question.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An error occurred while processing your request',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat?userId=xxx
 * Get user's chat sessions and server statistics
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    // Get server session statistics
    const stats = serverSessionManager.getStats();

    return NextResponse.json({
      success: true,
      stats,
      userSessions: stats.sessionsByUser[userId] || 0,
    });
  } catch (error: any) {
    console.error('Get Sessions Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to retrieve sessions',
      },
      { status: 500 }
    );
  }
}
