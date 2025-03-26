"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingIcon } from "@/components/icons";
import { Progress } from "@/components/ui/progress";

interface Document {
  id: string;
  title: string;
  source?: string;
  file_metadata: {
    source?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

// Interface for grouped documents
interface GroupedDocument {
  title: string;
  docIds: string[];
  source: string;
  status: "synced" | "not_synced" | "different";
}

export default function DocumentSourceEditor() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [groupedDocuments, setGroupedDocuments] = useState<GroupedDocument[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncTotal, setSyncTotal] = useState(0);
  const supabase = createClient();

  // Function to check if a document's source is synced with file_metadata.source
  const getDocumentSyncStatus = (
    doc: Document,
  ): "synced" | "not_synced" | "different" => {
    if (!doc.source && !doc.file_metadata?.source) return "synced";
    if (!doc.source) return "not_synced";
    if (!doc.file_metadata?.source) return "not_synced";
    return doc.source === doc.file_metadata.source ? "synced" : "different";
  };

  // Function to group documents by title
  const groupDocumentsByTitle = (docs: Document[]): GroupedDocument[] => {
    const groupedMap = new Map<
      string,
      {
        ids: string[];
        source: string;
        status: "synced" | "not_synced" | "different";
      }
    >();

    docs.forEach((doc) => {
      const title = doc.title;
      const source = doc.source || "";
      const status = getDocumentSyncStatus(doc);

      if (!groupedMap.has(title)) {
        groupedMap.set(title, { ids: [doc.id], source, status });
      } else {
        groupedMap.get(title)!.ids.push(doc.id);
        // If any document in the group is not synced, mark the whole group as not synced
        if (status !== "synced") {
          groupedMap.get(title)!.status = status;
        }
      }
    });

    return Array.from(groupedMap.entries()).map(([title, data]) => ({
      title,
      docIds: data.ids,
      source: data.source,
      status: data.status,
    }));
  };

  // Fetch documents from Supabase
  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("id, title, source, file_metadata")
        .order("title", { ascending: true })
        .limit(1000);

      if (error) throw error;

      setDocuments(data || []);

      // Group documents by title
      const grouped = groupDocumentsByTitle(data || []);
      setGroupedDocuments(grouped);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  // Update document source in Supabase for all documents with the same title
  const updateDocumentSource = async (
    title: string,
    newSource: string,
    docIds: string[],
  ) => {
    // Mark this group as updating
    setUpdating((prev) => ({ ...prev, [title]: true }));

    try {
      // For each document ID in the group, update both source and file_metadata.source
      const promises = docIds.map(async (id) => {
        const doc = documents.find((d) => d.id === id);
        if (!doc) return { error: { message: `Document ${id} not found` } };

        // Create updated metadata with new source
        const updatedMetadata = {
          ...(doc.file_metadata || {}),
          source: newSource,
        };

        return supabase
          .from("documents")
          .update({
            source: newSource,
            file_metadata: updatedMetadata,
          })
          .eq("id", id);
      });

      // Wait for all updates to complete
      const results = await Promise.all(promises);

      // Check for errors
      const errors = results.filter((result) => result.error);
      if (errors.length > 0) {
        throw new Error(`${errors.length} updates failed`);
      }

      // Update local state
      setGroupedDocuments((groups) =>
        groups.map((group) =>
          group.title === title
            ? { ...group, source: newSource, status: "synced" }
            : group,
        ),
      );

      setDocuments((docs) =>
        docs.map((doc) =>
          doc.title === title
            ? {
                ...doc,
                source: newSource,
                file_metadata: { ...doc.file_metadata, source: newSource },
              }
            : doc,
        ),
      );

      toast.success(
        `Updated source for ${docIds.length} documents with title "${title}"`,
      );
    } catch (error) {
      console.error("Error updating document sources:", error);
      toast.error("Failed to update sources");
    } finally {
      // Remove updating state for this group
      setUpdating((prev) => ({ ...prev, [title]: false }));
    }
  };

  // Sync all sources - copy from source column to file_metadata.source for all documents
  const syncAllSources = async () => {
    setSyncInProgress(true);
    setSyncProgress(0);

    try {
      // Get list of documents that need syncing
      const docsToUpdate = documents.filter(
        (doc) =>
          doc.source !== doc.file_metadata?.source ||
          !doc.file_metadata?.source,
      );

      setSyncTotal(docsToUpdate.length);
      let completed = 0;

      // Process in smaller batches to avoid overwhelming the database
      const batchSize = 20;
      for (let i = 0; i < docsToUpdate.length; i += batchSize) {
        const batch = docsToUpdate.slice(i, i + batchSize);

        // Update each document in the batch
        await Promise.all(
          batch.map(async (doc) => {
            const updatedMetadata = {
              ...(doc.file_metadata || {}),
              source: doc.source || "",
            };

            await supabase
              .from("documents")
              .update({ file_metadata: updatedMetadata })
              .eq("id", doc.id);

            completed++;
            setSyncProgress(completed);
          }),
        );
      }

      // Refresh the document list to show updated status
      await fetchDocuments();

      toast.success(
        `Successfully synced sources for ${docsToUpdate.length} documents`,
      );
    } catch (error) {
      console.error("Error syncing sources:", error);
      toast.error("Failed to sync sources");
    } finally {
      setSyncInProgress(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Calculate sync stats
  const syncStats = {
    total: documents.length,
    synced: documents.filter((doc) => getDocumentSyncStatus(doc) === "synced")
      .length,
    notSynced: documents.filter(
      (doc) => getDocumentSyncStatus(doc) !== "synced",
    ).length,
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Document Source Editor</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Edit the source field for documents in your database. Documents with
          the same title are grouped together.
        </p>
      </header>

      <div className="mb-6 bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-medium mb-1">Sync Status</h2>
            <div className="flex gap-4">
              <div className="text-sm">
                <span className="font-semibold">{syncStats.total}</span> total
              </div>
              <div className="text-sm text-green-600 dark:text-green-500">
                <span className="font-semibold">{syncStats.synced}</span> synced
              </div>
              <div className="text-sm text-amber-600 dark:text-amber-500">
                <span className="font-semibold">{syncStats.notSynced}</span> not
                synced
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="default"
              onClick={syncAllSources}
              disabled={syncInProgress || syncStats.notSynced === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {syncInProgress ? (
                <>
                  <LoadingIcon className="mr-2 h-4 w-4" />
                  Syncing...
                </>
              ) : (
                "Sync All Sources"
              )}
            </Button>
            <Button
              onClick={fetchDocuments}
              variant="outline"
              disabled={loading}
            >
              {loading ? <LoadingIcon className="mr-2 h-4 w-4" /> : null}
              Refresh
            </Button>
          </div>
        </div>

        {syncInProgress && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Syncing documents...</span>
              <span>
                {syncProgress} of {syncTotal}
              </span>
            </div>
            <Progress
              value={(syncProgress / syncTotal) * 100}
              className="h-2"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 bg-white dark:bg-neutral-800 rounded-lg shadow-sm">
          <LoadingIcon className="h-8 w-8 animate-spin" />
          <span className="ml-3">Loading documents...</span>
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Source
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
              {groupedDocuments.map((group) => (
                <tr key={group.title}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {group.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-300">
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      {group.docIds.length}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {group.status === "synced" ? (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                        Synced
                      </span>
                    ) : group.status === "different" ? (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                        Different
                      </span>
                    ) : (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                        Not Synced
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center">
                      <Input
                        defaultValue={group.source || ""}
                        className="w-full"
                        disabled={updating[group.title] || syncInProgress}
                        onBlur={(e) => {
                          const newValue = e.target.value;
                          if (newValue !== group.source) {
                            updateDocumentSource(
                              group.title,
                              newValue,
                              group.docIds,
                            );
                          }
                        }}
                      />
                      {updating[group.title] && (
                        <div className="ml-2 flex items-center">
                          <LoadingIcon className="h-4 w-4 animate-spin" />
                          <span className="ml-1 text-xs text-neutral-500">
                            Updating...
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {groupedDocuments.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-neutral-500 dark:text-neutral-400"
                  >
                    No documents found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 text-xs text-neutral-500 text-right">
        Showing up to 1000 documents grouped by title ({documents.length} total
        documents)
      </div>
    </div>
  );
}
