import { Message } from "ai";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import ConversationList from "./ConversationList";
import MessageInput from "./MessageInput";

interface ChatContainerProps {
  isExpanded: boolean;
  messages: Message[];
  status: string;
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  toolCall: string | undefined;
}

export default function ChatContainer({
  isExpanded,
  messages,
  status,
  input,
  handleInputChange,
  handleSubmit,
  toolCall,
}: ChatContainerProps) {
  return (
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
        <ConversationList
          messages={messages}
          status={status}
          toolCall={toolCall}
        />

        <MessageInput
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isStreaming={status === "streaming"}
        />
      </div>
    </motion.div>
  );
}
