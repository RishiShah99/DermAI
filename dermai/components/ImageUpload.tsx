import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";

interface ImageUploadProps {
  files: File[];
  setFiles: (files: File[]) => void;
  handleUpload: () => void;
}

export default function ImageUpload({
  files,
  setFiles,
  handleUpload,
}: ImageUploadProps) {
  const handleFileUpload = (files: File[]) => {
    setFiles(files);
    console.log(files);
  };

  return (
    <div className="w-full max-w-3xl mb-8 fc items-end">
      <FileUpload
        onChange={handleFileUpload}
        files={files}
        setFiles={setFiles}
      />
      <Button
        onClick={handleUpload}
        disabled={!files.length}
        className="bg-blue-500 hover:bg-blue-600 text-white"
      >
        Upload Files
      </Button>
    </div>
  );
}
