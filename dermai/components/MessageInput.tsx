import { Input } from "@/components/ui/input";

interface MessageInputProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isStreaming: boolean;
}

export default function MessageInput({
  input,
  handleInputChange,
  handleSubmit,
  isStreaming,
}: MessageInputProps) {
  return (
    <form onSubmit={handleSubmit} className="flex space-x-2 mt-2 px-2">
      <Input
        className="bg-neutral-100 text-base w-full text-neutral-700 dark:bg-neutral-700 dark:placeholder:text-neutral-400 dark:text-neutral-300"
        required
        value={input}
        disabled={isStreaming}
        placeholder="Ask me anything about skin health..."
        onChange={handleInputChange}
      />
    </form>
  );
}
