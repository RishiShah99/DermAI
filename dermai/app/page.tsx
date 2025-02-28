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
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      maxSteps: 4,
      onToolCall({ toolCall }) {
        setToolCall(toolCall.toolName);
      },
      onError: (error) => {
        toast.error("You've been rate limited, please try again later!");
      },
    });

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

  // Group messages into conversation pairs
  const conversationPairs = useMemo(() => {
    const pairs = [];
    for (let i = 0; i < messages.length; i += 2) {
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
      messages.length % 2 !== 0 &&
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
    <div className="flex justify-center items-start sm:pt-16 min-h-screen w-full dark:bg-neutral-900 px-4 md:px-0 py-4">
      <FileUpload onChange={handleFileUpload} />

      <div className="flex flex-col items-center w-full max-w-[500px]">
        <motion.div
          animate={{
            minHeight: isExpanded ? 200 : 0,
            padding: isExpanded ? 12 : 0,
          }}
          transition={{
            type: "spring",
            bounce: 0.5,
          }}
          className={cn(
            "rounded-lg w-full ",
            isExpanded
              ? "bg-neutral-200 dark:bg-neutral-800"
              : "bg-transparent",
          )}
        >
          <div className="flex flex-col w-full justify-between gap-2">
            <div
              ref={chatContainerRef}
              className="max-h-[70vh] overflow-y-auto pb-4 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent"
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
                    key={`conversation-${index}-${pair.userMessage.id}`}
                    className="flex flex-col gap-2"
                  >
                    <div className="px-2">
                      <div className="dark:text-neutral-400 text-neutral-500 text-sm w-fit mb-1">
                        {pair.userMessage.content}
                      </div>

                      {/* If there's an assistant response, show it */}
                      {pair.assistantMessage ? (
                        <AssistantMessage
                          key={`assistant-${index}-${pair.assistantMessage.id}`}
                          message={pair.assistantMessage}
                        />
                      ) : (
                        /* If this is the latest message without response yet */
                        index === conversationPairs.length - 1 && (
                          <Loading
                            key={`loading-${index}-${pair.userMessage.id}`}
                            tool={currentToolCall}
                          />
                        )
                      )}
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>

            <form onSubmit={handleSubmit} className="flex space-x-2 mt-2">
              <Input
                className={`bg-neutral-100 text-base w-full text-neutral-700 dark:bg-neutral-700 dark:placeholder:text-neutral-400 dark:text-neutral-300`}
                required
                value={input}
                placeholder={"Ask me anything..."}
                onChange={handleInputChange}
              />
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

const AssistantMessage = ({ message }: { message: Message | undefined }) => {
  if (message === undefined) return null;

  return (
    <motion.div
      key={`message-${message.id}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="whitespace-pre-wrap font-mono anti text-sm text-neutral-800 dark:text-neutral-200 overflow-hidden"
      id="markdown"
    >
      <MemoizedReactMarkdown>{message.content}</MemoizedReactMarkdown>
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
      className="overflow-hidden flex justify-start items-center"
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

const MemoizedReactMarkdown: React.FC<Options> = React.memo(
  ReactMarkdown,
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.className === nextProps.className,
);
