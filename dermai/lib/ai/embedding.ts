import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { createClient } from "@/supabase/server";

const embeddingModel = openai.embedding("text-embedding-ada-002");

const generateChunks = (
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200,
): string[] => {
  console.log(
    `Starting to split text of length ${text.length} into chunks with size=${chunkSize}, overlap=${overlap}`,
  );
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    // Find a good break point near chunkSize
    let end = Math.min(start + chunkSize, text.length);

    // Only look for natural break points if we're not at the end of the text
    if (end < text.length) {
      // Try to find a period, question mark, exclamation mark, or newline to break at
      const breakChars = [". ", "? ", "! ", "\n"];
      for (const char of breakChars) {
        const pos = text.lastIndexOf(char, end);
        if (pos !== -1 && pos >= start) {
          end = pos + char.length; // Include the break character(s)
          break;
        }
      }
    }

    // Ensure we're getting a substantial chunk
    if (end <= start) {
      end = Math.min(start + chunkSize, text.length);
    }

    const chunkText = text.substring(start, end).trim();

    // Only add non-empty chunks
    if (chunkText) {
      chunks.push(chunkText);
    }

    // Move the start position for the next chunk, ensuring we don't move backwards
    start = Math.max(start + chunkSize - overlap, end - overlap);

    // If we can't advance, force advancement to avoid infinite loop
    if (start >= end) {
      start = end;
    }
  }

  console.log(`Finished splitting text into ${chunks.length} chunks`);
  return chunks;
};

export async function generateEmbeddingsUsingHuggingFace(
  texts: string[],
  modelId: string = "sentence-transformers/all-MiniLM-L6-v2",
): Promise<number[][]> {
  // Make sure HF_TOKEN is set in your environment variables (.env.local for Next.js)
  const hfToken = process.env.HF_TOKEN;

  if (!hfToken) {
    throw new Error("HF_TOKEN environment variable not set");
  }

  const hf = new HfInference(hfToken);

  // For large documents, we'll batch the requests
  const batchSize = 10;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    console.log(
      `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.floor((texts.length - 1) / batchSize) + 1}`,
    );

    // Process each text in the batch
    const batchResults = await Promise.all(
      batch.map(async (text) => {
        try {
          const response = await hf.featureExtraction({
            model: modelId,
            inputs: text,
          });
          return response;
        } catch (error) {
          console.error(`Error processing text: ${error}`);
          throw error;
        }
      }),
    );

    allEmbeddings.push(...batchResults);
  }

  return allEmbeddings;
}

export const generateEmbedding = async (value: string): Promise<number[]> => {
  const input = value.replaceAll("\n", " ");
  const { embedding } = await embed({
    model: embeddingModel,
    value: input,
  });

  console.log("Embedding generated");
  console.log("Embedding:", embedding);
  return embedding;
};

export const findRelevantContent = async (userQuery: string) => {
  try {
    // Use the Google embedding model instead of HuggingFace
    const queryEmbedding = await generateEmbedding(userQuery);

    const supabase = await createClient();
    const { data: documents, error } = await supabase.rpc("hybrid_search", {
      query_text: userQuery,
      query_embedding: queryEmbedding,
      match_count: 10,
    });

    console.log("Query understanding tool completed");

    if (error) {
      console.error("Error:", error);
      return [];
    }

    console.log("Documents:", documents.length);
    return documents || [];
  } catch (error) {
    console.error("Error in findRelevantContent:", error);
    return [];
  }
};
