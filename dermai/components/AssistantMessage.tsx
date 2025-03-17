import { Message } from "ai";
import { motion } from "framer-motion";
import React from "react";
import ReactMarkdown, { Options } from "react-markdown";

export const MemoizedReactMarkdown: React.FC<Options> = React.memo(
  ReactMarkdown,
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.className === nextProps.className,
);

interface AssistantMessageProps {
  message: Message | undefined;
  isStreaming: boolean;
}

export default function AssistantMessage({
  message,
  isStreaming,
}: AssistantMessageProps) {
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
    </motion.div>
  );
}
