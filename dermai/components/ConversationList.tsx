import { Message } from "ai";
import { useRef, useMemo, useEffect } from "react";
import AssistantMessage from "./AssistantMessage";
import SystemMessage from "./SystemMessage";
import LoadingIndicator from "./LoadingIndicator";
import { cn } from "@/lib/utils";

interface ConversationListProps {
  messages: Message[];
  status: string;
  toolCall: string | undefined;
}

export default function ConversationList({
  messages,
  status,
  toolCall,
}: ConversationListProps) {
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change or when loading state changes
  useEffect(() => {
    if (chatContainerRef.current) {
      const scrollContainer = chatContainerRef.current;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [messages, status]);

  const currentToolCall = useMemo(() => {
    const tools = messages?.slice(-1)[0]?.toolInvocations;
    if (tools && toolCall === tools[0]?.toolName) {
      return tools[0].toolName;
    } else {
      return undefined;
    }
  }, [toolCall, messages]);

  // Process messages into pairs with special handling for system messages
  const conversationItems = useMemo(() => {
    const items: Array<{
      type: "pair" | "system";
      userMessage?: Message;
      assistantMessage?: Message;
      systemMessage?: Message;
    }> = [];

    // Filter out any hidden prompt messages that we added programmatically
    const visibleMessages = messages.filter(
      (msg) =>
        !(
          msg.role === "user" &&
          msg.content.includes("The image analysis detected")
        ),
    );

    let i = 0;
    while (i < visibleMessages.length) {
      const message = visibleMessages[i];

      if (message.role === "system") {
        // Handle system message
        items.push({
          type: "system",
          systemMessage: message,
        });
        i++;
      } else if (
        message.role === "assistant" &&
        message.id === "welcome-message"
      ) {
        // Handle welcome message
        items.push({
          type: "pair",
          assistantMessage: message,
        });
        i++;
      } else if (message.role === "user") {
        // Handle user-assistant pair
        const assistantMessage = visibleMessages[i + 1];
        items.push({
          type: "pair",
          userMessage: message,
          assistantMessage:
            assistantMessage && assistantMessage.role === "assistant"
              ? assistantMessage
              : undefined,
        });
        i += assistantMessage && assistantMessage.role === "assistant" ? 2 : 1;
      } else {
        // Skip any other message types
        i++;
      }
    }

    return items;
  }, [messages]);

  return (
    <div
      ref={chatContainerRef}
      className={cn(
        "max-h-[60vh] md:max-h-[70vh] overflow-y-auto pb-4 px-2 md:px-4",
        "scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent",
      )}
    >
      <div className="min-h-fit flex flex-col gap-6">
        {conversationItems.map((item, index) => (
          <div
            key={`item-${index}-${
              item.type === "system"
                ? item.systemMessage?.id
                : item.assistantMessage?.id || item.userMessage?.id
            }`}
            className="flex flex-col gap-3"
          >
            {item.type === "system" ? (
              // System message
              <SystemMessage message={item.systemMessage!} />
            ) : (
              // User-assistant pair
              <>
                {item.userMessage && (
                  <div className="dark:text-neutral-300 text-neutral-600 text-sm md:text-base w-fit mb-1 bg-neutral-100 dark:bg-neutral-700 px-3 py-2 rounded-lg self-end">
                    {item.userMessage.content}
                  </div>
                )}

                {item.assistantMessage ? (
                  <AssistantMessage
                    message={item.assistantMessage}
                    isStreaming={status === "streaming"}
                  />
                ) : item.userMessage ? (
                  <LoadingIndicator tool={currentToolCall} />
                ) : null}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
