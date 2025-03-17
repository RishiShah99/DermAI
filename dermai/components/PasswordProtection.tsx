interface PasswordProtectionProps {
  isLoading: boolean;
}

export default function PasswordProtection({
  isLoading,
}: PasswordProtectionProps) {
  if (isLoading) {
    return (
      <div className="w-full h-screen fc">
        <p className="text-neutral-600 dark:text-neutral-300 text-lg md:text-xl max-w-xl mx-auto">
          Chat loading...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-screen fc">
      <p className="text-neutral-600 dark:text-neutral-300 text-lg md:text-xl max-w-xl mx-auto">
        You cannot access this chat.
      </p>
      <p className="text-neutral-600 dark:text-neutral-300 text-sm md:text-base max-w-xl mx-auto">
        Your device is not authorized to access this chat.
      </p>
    </div>
  );
}
