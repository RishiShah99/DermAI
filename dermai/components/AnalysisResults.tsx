import { LoadingIcon } from "@/components/icons";
import getSkinConditionInfo from "@/lib/classification";
import { UseMutationResult } from "@tanstack/react-query";

interface AnalysisResultsProps {
  mutation: UseMutationResult<any, Error, string, unknown>;
  classification: {
    image_id: string;
    predicted_class: string;
  } | null;
}

export default function AnalysisResults({
  mutation,
  classification,
}: AnalysisResultsProps) {
  return (
    <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-md border-2 border-neutral-200 dark:border-neutral-700">
      <h2 className="text-lg font-medium mb-2 text-neutral-800 dark:text-neutral-200">
        Analysis Results
      </h2>

      {mutation.isPending && !classification ? (
        <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
          {!mutation.error && (
            <div className="animate-spin">
              <LoadingIcon className="animate-spin h-4 w-4" />
            </div>
          )}
          <span
            className={
              mutation.error
                ? "text-red-500"
                : "text-neutral-600 dark:text-neutral-400"
            }
          >
            {mutation.error
              ? mutation.error.message
              : mutation.isIdle
                ? "Analysis is starting..."
                : mutation.isPending
                  ? "Analyzing your image..."
                  : ""}
          </span>
        </div>
      ) : mutation.error && !classification ? (
        <p className="text-neutral-600 dark:text-neutral-400">
          An error occurred while analyzing your image. Please try again later.
        </p>
      ) : classification || mutation.isSuccess ? (
        <div className="text-neutral-700 dark:text-neutral-300">
          <p className="mb-2">
            <span className="font-semibold">Classification:</span>{" "}
            {classification.predicted_class}
          </p>
          <p>{getSkinConditionInfo(classification.predicted_class)}</p>
          <p className="text-xs text-neutral-500">
            Note: This is an AI-powered analysis and should not be considered
            medical advice.
          </p>
        </div>
      ) : null}
    </div>
  );
}
