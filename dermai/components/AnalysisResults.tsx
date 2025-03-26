import { motion } from "framer-motion";
import { LoadingIcon } from "@/components/icons";
import {
  getPrettifiedConditionName,
  getSkinConditionInfo,
} from "@/lib/classification";
import { UseMutationResult } from "@tanstack/react-query";
import { useEffect, useState } from "react";

interface AnalysisResultsProps {
  mutation: UseMutationResult<any, Error, string, unknown>;
  classification: {
    image_id: string;
    confidence: number;
    predicted_class: string;
  } | null;
  classificationTime: string;
}

export default function AnalysisResults({
  mutation,
  classification,
  classificationTime,
}: AnalysisResultsProps) {
  // Convert time string to numeric value for progress
  const timeValue = parseFloat(classificationTime.replace("s", ""));
  const progress = Math.min(timeValue / 5, 1); // Assume 5 seconds is 100%

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-lg border-2 border-neutral-200 dark:border-neutral-700 w-full"
    >
      <div className="w-full flex justify-between items-center mb-4">
        <motion.h2
          layout
          className="text-xl font-semibold text-neutral-800 dark:text-neutral-100 flex items-center"
        >
          Analysis Results
          {mutation.isPending && !classification && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="ml-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 text-xs rounded-full"
            >
              Processing
            </motion.span>
          )}
          {mutation.isSuccess && classification && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="ml-2 px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 text-xs rounded-full"
            >
              Complete
            </motion.span>
          )}
        </motion.h2>

        {timeValue > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center"
          >
            <div className="relative h-8 w-8 mr-2">
              <motion.div className="absolute inset-0 rounded-full border-2 border-neutral-200 dark:border-neutral-700" />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-blue-500 dark:border-blue-400"
                style={{
                  pathLength: progress,
                  strokeDasharray: "1px 1px",
                }}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: progress }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute inset-0 flex items-center justify-center text-xs font-medium text-neutral-600 dark:text-neutral-300"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
              >
                {classificationTime}
              </motion.div>
            </div>
          </motion.div>
        )}
      </div>

      {mutation.isPending && !classification ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-6"
        >
          <div className="flex flex-col items-center justify-center space-y-4">
            <motion.div
              animate={{
                rotate: 360,
                transition: { duration: 1.5, repeat: Infinity, ease: "linear" },
              }}
              className="rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 p-5"
            >
              <LoadingIcon className="h-8 w-8 text-white" />
            </motion.div>
            <motion.p
              className="text-neutral-600 dark:text-neutral-300 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {mutation.error
                ? mutation.error.message
                : mutation.isIdle
                  ? "Analysis is starting..."
                  : "AI is analyzing your skin image..."}
            </motion.p>
          </div>
        </motion.div>
      ) : mutation.error && !classification ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
        >
          <p className="text-red-600 dark:text-red-300 text-center">
            An error occurred while analyzing your image. Please try again
            later.
          </p>
        </motion.div>
      ) : classification || mutation.isSuccess ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100 }}
          className="text-neutral-700 dark:text-neutral-300 space-y-4"
        >
          <motion.div
            className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 flex items-center justify-between"
            layout
          >
            <div className="flex items-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                className="bg-green-100 dark:bg-green-800 rounded-full p-2 mr-3"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-green-600 dark:text-green-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </motion.div>
              <div>
                <p className="font-medium text-green-800 dark:text-green-300 mb-1">
                  Analysis Complete
                </p>
                <p className="text-green-700 dark:text-green-200">
                  Detected:{" "}
                  <span className="font-bold">
                    {getPrettifiedConditionName(classification.predicted_class)}
                  </span>
                </p>
              </div>
            </div>

            {classification && classification.confidence && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col items-center bg-white dark:bg-neutral-700 px-3 py-2 rounded-lg shadow-sm"
              >
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                  Confidence
                </div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {classification.confidence}%
                </div>
                <div className="h-1.5 w-16 bg-neutral-200 dark:bg-neutral-600 rounded-full mt-1 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${classification.confidence}%` }}
                    transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
                    className="h-full bg-blue-500 dark:bg-blue-400 rounded-full"
                  />
                </div>
              </motion.div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700"
          >
            <h3 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
              About this condition:
            </h3>
            <p className="leading-relaxed">
              {getSkinConditionInfo(classification.predicted_class)}
            </p>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg border-l-4 border-amber-400"
          >
            <span className="font-medium">Important:</span> This is an
            AI-powered analysis for educational purposes only and should not be
            considered medical advice. Always consult with a healthcare
            professional for proper diagnosis and treatment.
          </motion.p>
        </motion.div>
      ) : null}
    </motion.div>
  );
}
