"use client";

import { useState, useEffect } from "react";
import { FileUpload } from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { LoadingIcon } from "@/components/icons";
import { createClient } from "@/supabase/client";

interface FileStatus {
  id: string;
  name: string;
  status: "uploading" | "uploaded" | "processing" | "completed" | "error";
  error?: string;
  progress?: number;
}

const Admin = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const supabase = createClient();

  const handleFileUpload = (uploadedFiles: File[]) => {
    setFiles((prevFiles) => [...prevFiles, ...uploadedFiles]);
  };

  const uploadToSupabase = async (file: File) => {
    const fileId = crypto.randomUUID();
    const fileName = file.name;

    // Add the file to our tracking state
    setFileStatuses((prev) => [
      ...prev,
      {
        id: fileId,
        name: fileName,
        status: "uploading",
        progress: 0,
      },
    ]);

    try {
      // Upload to Supabase
      const { error: uploadError, data } = await supabase.storage
        .from("files")
        .upload(`${fileId}/${fileName}`, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw new Error(uploadError.message);

      // Update status to uploaded
      setFileStatuses((prev) =>
        prev.map((item) =>
          item.id === fileId
            ? { ...item, status: "uploaded", progress: 100 }
            : item,
        ),
      );

      // Generate embeddings
      await processFileWithEmbeddings(fileId, fileName);
    } catch (error) {
      console.error("Error uploading file:", error);
      setFileStatuses((prev) =>
        prev.map((item) =>
          item.id === fileId
            ? { ...item, status: "error", error: error.message }
            : item,
        ),
      );
      toast.error(`Failed to upload ${fileName}`, {
        description: error.message,
      });
    }
  };

  const processFileWithEmbeddings = async (
    fileId: string,
    fileName: string,
  ) => {
    try {
      // Update status to processing
      setFileStatuses((prev) =>
        prev.map((item) =>
          item.id === fileId ? { ...item, status: "processing" } : item,
        ),
      );

      // Call the embeddings API
      const response = await fetch("/api/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileId,
          fileName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to process embeddings");
      }

      // Update status to completed
      setFileStatuses((prev) =>
        prev.map((item) =>
          item.id === fileId ? { ...item, status: "completed" } : item,
        ),
      );

      toast.success(`Successfully processed ${fileName}`, {
        description: "File uploaded and embeddings generated",
      });
    } catch (error) {
      console.error("Error processing embeddings:", error);
      setFileStatuses((prev) =>
        prev.map((item) =>
          item.id === fileId
            ? { ...item, status: "error", error: error.message }
            : item,
        ),
      );
      toast.error(`Failed to process embeddings for ${fileName}`, {
        description: error.message,
      });
    }
  };

  const handleUploadAll = async () => {
    if (files.length === 0) {
      toast.error("No files selected", {
        description: "Please select at least one file to upload",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Upload each file sequentially to avoid overwhelming the server
      for (const file of files) {
        await uploadToSupabase(file);
      }

      // Clear the files list after successful upload
      setFiles([]);
    } catch (error) {
      console.error("Error in upload process:", error);
      toast.error("Upload process failed", {
        description: error.message,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusIcon = (status: FileStatus["status"]) => {
    switch (status) {
      case "uploading":
        return <LoadingIcon size={14} />;
      case "uploaded":
        return <span className="text-yellow-500">●</span>;
      case "processing":
        return <LoadingIcon size={14} />;
      case "completed":
        return <span className="text-green-500">●</span>;
      case "error":
        return <span className="text-red-500">●</span>;
      default:
        return null;
    }
  };

  const getStatusText = (status: FileStatus["status"]) => {
    switch (status) {
      case "uploading":
        return "Uploading...";
      case "uploaded":
        return "Uploaded, waiting for processing";
      case "processing":
        return "Generating embeddings...";
      case "completed":
        return "Completed";
      case "error":
        return "Error";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen w-full py-8 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">DermAI Admin</h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Upload documents to generate embeddings for the knowledge base
          </p>
        </header>

        <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-sm mb-8">
          <h2 className="text-xl font-medium mb-4">Upload Files</h2>
          <FileUpload
            onChange={handleFileUpload}
            message="Drag and drop documents to generate embeddings for the knowledge base."
          />

          <div className="mt-4 flex justify-end">
            <Button
              onClick={handleUploadAll}
              disabled={isUploading || files.length === 0}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {isUploading ? (
                <>
                  <LoadingIcon />
                  <span>Uploading...</span>
                </>
              ) : (
                <span>
                  Upload & Process {files.length > 0 && `(${files.length})`}
                </span>
              )}
            </Button>
          </div>
        </div>

        {fileStatuses.length > 0 && (
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-medium mb-4">File Status</h2>

            <div className="space-y-3">
              {fileStatuses.map((file) => (
                <div
                  key={file.id}
                  className="border border-neutral-200 dark:border-neutral-700 rounded-md p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 flex items-center justify-center">
                        {getStatusIcon(file.status)}
                      </div>
                      <span className="font-medium">{file.name}</span>
                    </div>
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">
                      {getStatusText(file.status)}
                    </span>
                  </div>

                  {file.status === "uploading" && (
                    <div className="mt-2 w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5">
                      <motion.div
                        className="bg-blue-500 h-1.5 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${file.progress || 0}%` }}
                      />
                    </div>
                  )}

                  {file.status === "error" && file.error && (
                    <p className="mt-2 text-sm text-red-500">{file.error}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
