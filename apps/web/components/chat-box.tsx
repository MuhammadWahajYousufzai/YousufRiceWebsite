"use client";

import { useRef, useState, useEffect } from "react";
import { Send, User2, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { account } from "@/lib/appwrite";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatBoxProps {
  userId: string;
  className?: string;
  placeholder?: string;
  welcomeMessage?: string;
  userContext?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

/**
 * ChatBox Component
 * Real-time streaming chat interface for OpenAI Agents SDK
 */
export default function ChatBox({
  userId,
  className,
  placeholder = "Ask about our products, orders, or anything else...",
  welcomeMessage = "Hello! How can I help you today?",
  userContext,
}: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showLocationButton, setShowLocationButton] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Load messages from localStorage on mount (with 24-hour expiration)
  useEffect(() => {
    const storageKey = `chat_messages_${userId}`;
    const savedData = localStorage.getItem(storageKey);

    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);

        // Check if the saved data has a timestamp and if it's older than 24 hours
        if (parsed.savedAt) {
          const savedAt = new Date(parsed.savedAt);
          const now = new Date();
          const hoursDiff =
            (now.getTime() - savedAt.getTime()) / (1000 * 60 * 60);

          if (hoursDiff > 24) {
            // Clear expired messages
            localStorage.removeItem(storageKey);
            console.log("Chat history expired and cleared after 24 hours");
          } else {
            // Load valid messages
            const messagesWithDates = parsed.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            }));
            setMessages(messagesWithDates);
          }
        } else {
          // Legacy format without timestamp - load messages but save in new format
          const messagesWithDates = parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          setMessages(messagesWithDates);
        }
      } catch (error) {
        console.error("Failed to load messages from localStorage:", error);
        // Clear corrupted data
        localStorage.removeItem(storageKey);
        // Fall back to welcome message
        if (welcomeMessage) {
          setMessages([
            {
              role: "assistant",
              content: welcomeMessage,
              timestamp: new Date(),
            },
          ]);
        }
      }
    } else if (welcomeMessage) {
      // Show welcome message on first load
      setMessages([
        {
          role: "assistant",
          content: welcomeMessage,
          timestamp: new Date(),
        },
      ]);
    }
  }, [userId, welcomeMessage]);

  // Save messages to localStorage whenever they change (with timestamp for expiration)
  useEffect(() => {
    if (messages.length > 0) {
      const storageKey = `chat_messages_${userId}`;
      const dataToSave = {
        messages: messages,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    }
  }, [messages, userId]);

  /**
   * Send message to the chat API with streaming
   */
  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage = input.trim();
    setInput("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Add user message to chat
    const newUserMessage: Message = {
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newUserMessage]);

    // Start streaming
    setIsStreaming(true);
    setStreamingContent("");

    try {
      // Get JWT for authentication
      const jwt = await account.createJWT();

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${jwt.jwt}`,
        },
        body: JSON.stringify({
          userId,
          message: userMessage,
          stream: true,
          sessionId: sessionId || undefined, // Send existing session ID
          userContext: userContext || undefined, // Send user context if available
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      // Extract session ID from response headers
      const newSessionId = response.headers.get("X-Session-Id");
      if (newSessionId && !sessionId) {
        setSessionId(newSessionId);
        console.log("New session started:", newSessionId);
      }

      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedContent += chunk;
        setStreamingContent(accumulatedContent);
      }

      // Add completed assistant message
      if (accumulatedContent) {
        // Check if agent is requesting location
        const hasLocationRequest =
          accumulatedContent.includes("[REQUEST_LOCATION]");

        // Remove the marker from display
        const displayContent = accumulatedContent
          .replace("[REQUEST_LOCATION]", "")
          .trim();

        const assistantMessage: Message = {
          role: "assistant",
          content: displayContent,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Show location button if requested
        if (hasLocationRequest) {
          setShowLocationButton(true);
        }
      }

      setStreamingContent("");
    } catch (error) {
      console.error("Chat error:", error);

      // Add error message
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsStreaming(false);
    }
  };

  /**
   * Get user's location and send to agent
   */
  const shareLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        // Hide location button
        setShowLocationButton(false);
        setGettingLocation(false);

        // Send location to agent as a message
        const locationMessage = `[LOCATION: ${latitude}, ${longitude}]`;

        // Add user message showing location was shared
        const userMessage: Message = {
          role: "user",
          content: `📍 Location shared (Accuracy: ${Math.round(accuracy)}m)`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);

        // Send actual coordinates to agent (hidden from user)
        sendMessageToAgent(locationMessage);
      },
      (error) => {
        setGettingLocation(false);
        let errorMessage = "Failed to get location. ";

        switch (error.code) {
          case 1: // PERMISSION_DENIED
            errorMessage +=
              "Please allow location access in your browser settings.";
            break;
          case 2: // POSITION_UNAVAILABLE
            errorMessage += "Location information is unavailable.";
            break;
          case 3: // TIMEOUT
            errorMessage += "Location request timed out.";
            break;
          default:
            errorMessage += "Unknown error occurred.";
        }

        alert(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  /**
   * Send message to agent (internal function)
   */
  const sendMessageToAgent = async (message: string) => {
    if (isStreaming) return;

    setIsStreaming(true);
    setStreamingContent("");

    try {
      // Get JWT for authentication
      const jwt = await account.createJWT();

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${jwt.jwt}`,
        },
        body: JSON.stringify({
          userId,
          message,
          stream: true,
          sessionId: sessionId || undefined,
          userContext: userContext || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const newSessionId = response.headers.get("X-Session-Id");
      if (newSessionId && !sessionId) {
        setSessionId(newSessionId);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedContent += chunk;
        setStreamingContent(accumulatedContent);
      }

      if (accumulatedContent) {
        const assistantMessage: Message = {
          role: "assistant",
          content: accumulatedContent,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }

      setStreamingContent("");
    } catch (error) {
      console.error("Chat error:", error);

      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsStreaming(false);
    }
  };

  /**
   * Handle textarea auto-resize
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    // Auto-resize textarea
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  /**
   * Handle Enter key to send message
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full max-h-[600px] border border-gray-200 rounded-lg bg-white shadow-lg",
        className
      )}
    >

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              "flex gap-3 animate-in fade-in slide-in-from-bottom-2",
              message.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            {/* Avatar */}
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                message.role === "user" ? "bg-blue-600" : "bg-green-600"
              )}
            >
              {message.role === "user" ? (
                <User className="w-5 h-5 text-white" />
              ) : (
                <User2 className="w-5 h-5 text-white" />
              )}
            </div>

            {/* Message bubble */}
            <div
              className={cn(
                "max-w-[75%] rounded-lg px-4 py-2",
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-900"
              )}
            >
              {message.role === "assistant" ? (
                <div className="text-sm markdown-container">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                      ol: ({ children, ...props }) => <ol {...props} className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="mb-0.5">{children}</li>,
                      strong: ({ children }) => <span className="font-semibold">{children}</span>,
                      a: ({ children, href }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap wrap-break-word">
                  {message.content}
                </p>
              )}
              <span
                className={cn(
                  "text-xs mt-1 block",
                  message.role === "user" ? "text-blue-100" : "text-gray-500"
                )}
              >
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}

              </span>
            </div>
          </div>
        ))}

        {/* Streaming message */}
        {isStreaming && streamingContent && (
          <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center shrink-0">
              <User2 className="w-5 h-5 text-white" />
            </div>
            <div className="max-w-[75%] rounded-lg px-4 py-2 bg-gray-100 text-gray-900">
              <div className="text-sm markdown-container">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                    ol: ({ children, ...props }) => <ol {...props} className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="mb-0.5">{children}</li>,
                    strong: ({ children }) => <span className="font-semibold">{children}</span>,
                    a: ({ children, href }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {children}
                      </a>
                    ),
                  }}
                >
                  {streamingContent}
                </ReactMarkdown>
              </div>
              <span className="inline-block w-2 h-4 ml-1 bg-green-600 animate-pulse" />
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isStreaming && !streamingContent && (
          <div className="flex gap-3 items-center">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center shrink-0">
              <User2 className="w-5 h-5 text-white" />
            </div>
            <div className="bg-gray-200 rounded-full px-4 py-2 inline-flex items-center gap-1 shadow">
              <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></span>
            </div>
            {/* Animated text */}
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium animate-pulse">
              typing
            </span>
          </div>
        )}


        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        {/* Location Button */}
        {showLocationButton && (
          <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-gray-700 mb-2">
              📍 Share location for accurate delivery (optional)
            </p>
            <button
              onClick={shareLocation}
              disabled={gettingLocation}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {gettingLocation ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Getting location...
                </>
              ) : (
                <>📍 Share My Location</>
              )}
            </button>
          </div>
        )}

        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isStreaming}
            rows={1}
            className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ maxHeight: "120px" }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            className="shrink-0 w-10 h-10 rounded-lg bg-green-600 text-white flex items-center justify-center hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isStreaming ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
