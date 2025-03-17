import { Message } from "ai";
import { motion } from "framer-motion";

interface SystemMessageProps {
  message: Message;
}

export default function SystemMessage({ message }: SystemMessageProps) {
  return (
    <motion.div
      key={`system-${message.id}`}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="font-mono text-sm md:text-base text-neutral-800 dark:text-neutral-200 overflow-hidden bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg shadow-sm border-l-4 border-blue-500"
    >
      <div className="flex items-center gap-2">
        <span className="text-blue-600 dark:text-blue-400 font-semibold">
          System:
        </span>
        <span>{message.content}</span>
      </div>
    </motion.div>
  );
}
