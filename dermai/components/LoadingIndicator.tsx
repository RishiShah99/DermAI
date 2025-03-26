import { LoadingIcon } from "@/components/icons";
import { motion } from "framer-motion";

interface LoadingProps {
  tool?: string;
  status?: string;
}
export default function LoadingIndicator({ tool, status }: LoadingProps) {
  // If status is "ready", don't display anything
  if (status === "ready") return null;

  const toolName =
    tool === "understandQuery"
      ? "Understanding query"
      : tool === "getInformation"
        ? "Getting information"
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
}
