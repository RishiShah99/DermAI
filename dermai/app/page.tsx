"use client";

import { Input } from "@/components/ui/input";
import { Message } from "ai";
import { useChat } from "@ai-sdk/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown, { Options } from "react-markdown";
import React from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { LoadingIcon } from "@/components/icons";
import { FileUpload } from "@/components/ui/file-upload";

export default function Chat() {
  const [files, setFiles] = useState<File[]>([]);
  const handleFileUpload = (files: File[]) => {
    setFiles(files);
    console.log(files);
  };

  const [toolCall, setToolCall] = useState<string>();

  // Create an initial welcome message
  const initialWelcomeMessage: Message = {
    id: "welcome-message",
    role: "assistant",
    content:
      "Welcome to DermAI! I'm your skin health assistant. How can I help you today?",
    createdAt: new Date(),
  };

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    isLoading,
    setMessages,
  } = useChat({
    maxSteps: 10,
    onToolCall({ toolCall }) {
      setToolCall(toolCall.toolName);
    },
    onError: (error) => {
      toast.error("You've been rate limited, please try again later!", {
        description: error.message,
      });
    },
  });

  // Add the welcome message when component mounts
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([initialWelcomeMessage]);
    }
  }, []);

  const [isExpanded, setIsExpanded] = useState<boolean>(true); // Set to true to show chat immediately
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log(messages);
    if (messages.length > 0) setIsExpanded(true);
  }, [messages]);

  // Scroll to bottom whenever messages change or when loading state changes
  useEffect(() => {
    if (chatContainerRef.current) {
      const scrollContainer = chatContainerRef.current;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [messages, isLoading]);

  const currentToolCall = useMemo(() => {
    const tools = messages?.slice(-1)[0]?.toolInvocations;
    if (tools && toolCall === tools[0].toolName) {
      return tools[0].toolName;
    } else {
      return undefined;
    }
  }, [toolCall, messages]);

  const awaitingResponse = useMemo(() => {
    if (
      isLoading &&
      currentToolCall === undefined &&
      messages.slice(-1)[0]?.role === "user"
    ) {
      return true;
    } else {
      return false;
    }
  }, [isLoading, currentToolCall, messages]);

  // Modified to handle assistant-only message at the beginning
  const conversationPairs = useMemo(() => {
    const pairs = [];
    let skipFirst = false;

    // Check if the first message is the welcome message
    if (
      messages.length > 0 &&
      messages[0].role === "assistant" &&
      messages[0].id === "welcome-message"
    ) {
      pairs.push({
        userMessage: undefined,
        assistantMessage: messages[0],
      });
      skipFirst = true;
    }

    // Process the rest of the messages as usual, starting after welcome message if it exists
    for (let i = skipFirst ? 1 : 0; i < messages.length; i += 2) {
      const userMessage = messages[i];
      const assistantMessage = messages[i + 1];
      if (userMessage && userMessage.role === "user") {
        pairs.push({
          userMessage,
          assistantMessage: assistantMessage || undefined,
        });
      }
    }

    // Handle odd number of messages (user message without response yet)
    if (
      messages.length > 1 &&
      messages.length % 2 !== (skipFirst ? 0 : 1) &&
      messages[messages.length - 1].role === "user"
    ) {
      pairs.push({
        userMessage: messages[messages.length - 1],
        assistantMessage: undefined,
      });
    }

    return pairs;
  }, [messages]);

  return (
    <div className="min-h-screen w-full dark:bg-neutral-900 px-4 md:px-0 py-4 flex flex-col items-center">
      {/* Title and subtitle section */}
      <header className="w-full max-w-3xl text-center mb-8 pt-8 md:pt-12">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl lg:text-6xl font-bold mb-3 bg-gradient-to-r from-neutral-800 to-neutral-600 dark:from-neutral-200 dark:to-neutral-400 text-transparent bg-clip-text"
        >
          DermAI
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-neutral-600 dark:text-neutral-300 text-lg md:text-xl max-w-xl mx-auto"
        >
          Your AI-powered assistant for skin health education and information
        </motion.p>
      </header>

      <div className="w-full max-w-3xl mb-8">
        <FileUpload onChange={handleFileUpload} />
      </div>

      <div className="flex flex-col items-center w-full max-w-3xl">
        <motion.div
          animate={{
            height: isExpanded ? "auto" : 0,
            padding: isExpanded ? 16 : 0,
            marginTop: isExpanded ? 16 : 0,
          }}
          transition={{
            type: "spring",
            bounce: 0.3,
            duration: 0.6,
          }}
          className={cn(
            "rounded-lg w-full",
            isExpanded
              ? "bg-neutral-200 dark:bg-neutral-800 shadow-md"
              : "bg-transparent",
          )}
        >
          <div className="flex flex-col w-full justify-between gap-4">
            <div
              ref={chatContainerRef}
              className="max-h-[60vh] md:max-h-[70vh] overflow-y-auto pb-4 px-2 md:px-4 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent"
            >
              <motion.div
                transition={{
                  type: "spring",
                }}
                className="min-h-fit flex flex-col gap-6"
              >
                {/* Display all conversation pairs */}
                {conversationPairs.map((pair, index) => (
                  <div
                    key={`conversation-${index}-${pair.assistantMessage?.id || pair.userMessage?.id}`}
                    className="flex flex-col gap-3"
                  >
                    {/* If there's a user message, show it */}
                    {pair.userMessage && (
                      <div className="dark:text-neutral-300 text-neutral-600 text-sm md:text-base w-fit mb-1 bg-neutral-100 dark:bg-neutral-700 px-3 py-2 rounded-lg self-end">
                        {pair.userMessage.content}
                      </div>
                    )}

                    {/* If there's an assistant response, show it */}
                    {pair.assistantMessage ? (
                      <AssistantMessage
                        key={`assistant-${index}-${pair.assistantMessage.id}`}
                        message={pair.assistantMessage}
                        isStreaming={status === "streaming"}
                      />
                    ) : (
                      /* If this is the latest message without response yet */
                      pair.userMessage &&
                      index === conversationPairs.length - 1 && (
                        <Loading
                          key={`loading-${index}-${pair.userMessage.id}`}
                          tool={currentToolCall}
                        />
                      )
                    )}
                  </div>
                ))}
              </motion.div>
            </div>

            <form onSubmit={handleSubmit} className="flex space-x-2 mt-2 px-2">
              <Input
                className={`bg-neutral-100 text-base w-full text-neutral-700 dark:bg-neutral-700 dark:placeholder:text-neutral-400 dark:text-neutral-300`}
                required
                value={input}
                disabled={status === "streaming"}
                placeholder={"Ask me anything about skin health..."}
                onChange={handleInputChange}
              />
            </form>
          </div>
        </motion.div>

        {/* Footer info */}
        <div className="text-center text-xs text-neutral-500 dark:text-neutral-400 mt-4">
          <p>
            DermAI provides educational information only. Always consult a
            healthcare professional for medical advice.
          </p>
        </div>
      </div>
    </div>
  );
}

const AssistantMessage = ({
  message,
  isStreaming,
}: {
  message: Message | undefined;
  isStreaming: boolean;
}) => {
  if (message === undefined) return null;

  return (
    <motion.div
      key={`message-${message.id}`}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="font-mono text-sm md:text-base text-neutral-800 dark:text-neutral-200 overflow-hidden bg-white dark:bg-neutral-850 p-3 rounded-lg shadow-sm"
      id="markdown"
    >
      <div className="prose">
        <MemoizedReactMarkdown>{message.content}</MemoizedReactMarkdown>
      </div>
      {/* {isStreaming && (
        <span className="ml-2 inline-flex items-center">
          <span className="h-2 w-2 bg-green-500 rounded-full inline-block animate-pulse" />
        </span>
      )} */}
    </motion.div>
  );
};

const Loading = ({ tool }: { tool?: string }) => {
  const toolName =
    tool === "getInformation"
      ? "Getting information"
      : tool === "addResource"
        ? "Adding information"
        : "Thinking";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring" }}
      className="overflow-hidden flex justify-start items-center bg-white/80 dark:bg-neutral-800/80 p-3 rounded-lg shadow-sm"
    >
      <div className="flex flex-row gap-2 items-center">
        <div className="animate-spin dark:text-neutral-400 text-neutral-500">
          <LoadingIcon />
        </div>
        <div className="text-neutral-500 dark:text-neutral-400 text-sm">
          {toolName}...
        </div>
      </div>
    </motion.div>
  );
};

export const MemoizedReactMarkdown: React.FC<Options> = React.memo(
  ReactMarkdown,
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.className === nextProps.className,
);
