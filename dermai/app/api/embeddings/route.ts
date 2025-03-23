import { NextResponse } from "next/server";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import pdf from "pdf-parse/lib/pdf-parse.js";

import { createClient } from "@/supabase/server";

// Define the OpenAI embedding model
const embeddingModel = openai.embedding("text-embedding-ada-002");

// Helper function to extract text from PDF
async function extractTextFromPdf(fileBuffer: ArrayBuffer): Promise<string> {
  try {
    // Extract text from PDF
    const text = await pdf(fileBuffer);
    return text.text;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw error;
  }
}

// Helper function to split text into chunks
function splitTextIntoChunks(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200,
): string[] {
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
}

// Helper function to generate embeddings using OpenAI
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  console.log("Generating embeddings using OpenAI...");

  // Process chunks in batches to avoid hitting rate limits
  const batchSize = 20;
  const totalBatches = Math.ceil(texts.length / batchSize);

  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    console.log(
      `Processing batch ${Math.floor(i / batchSize) + 1}/${totalBatches}`,
    );

    // Generate embeddings in parallel for each chunk in the batch
    const batchEmbeddings = await Promise.all(
      batch.map(async (text) => {
        const { embedding } = await embed({
          model: embeddingModel,
          value: sanitizeText(text.replaceAll("\n", " ")),
        });
        return embedding;
      }),
    );

    allEmbeddings.push(...batchEmbeddings);
  }

  return allEmbeddings;
}
function sanitizeText(text: string): string {
  // Remove NULL bytes and other control characters
  return text
    .replace(/\u0000/g, "") // Remove NULL bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove other control characters
    .replace(/\\u0000/g, ""); // Remove string representation of NULL bytes
}
export async function POST(request: Request) {
  try {
    const { fileId, fileName, publicURL } = await request.json();

    if (!fileId) {
      return NextResponse.json(
        { message: "File ID is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Get the file from storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from("files")
      .download(`${fileId}/${fileName}`);

    if (fileError) {
      console.error("Error downloading file:", fileError);
      return NextResponse.json(
        { message: "Failed to download file from storage" },
        { status: 500 },
      );
    }

    // Extract text based on file type
    let text = "";
    const buffer = await fileData.arrayBuffer();
    text = await extractTextFromPdf(buffer);

    console.log(`Extracted ${text.length} characters from ${fileName}`);

    // Split text into chunks
    const chunks = splitTextIntoChunks(text);
    console.log(`Split into ${chunks.length} chunks`);
    // Generate embeddings for all chunks
    const embeddings = await generateEmbeddings(chunks);
    console.log(`Generated ${embeddings.length} embeddings`);
    // Store chunks and embeddings in the database
    console.log(publicURL);
    const insertPromises = chunks.map((chunk, index) => {
      return supabase.from("documents").insert({
        title: fileName,
        body: sanitizeText(chunk),
        embedding: embeddings[index],
        file_metadata: {
          id: fileId,
          source: fileName,
          chunk_index: index,
          total_chunks: chunks.length,
          public_url: publicURL,
        },
      });
    });

    // Execute all database insertions in parallel
    const results = await Promise.all(insertPromises);

    // Check for errors
    const errors = results.filter((result) => result.error);
    if (errors.length > 0) {
      console.error("Errors storing embeddings:", errors);
      return NextResponse.json(
        { message: "Some embeddings failed to store", errors },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${chunks.length} chunks from ${fileName}`,
      fileId,
      chunkCount: chunks.length,
      embeddingCount: embeddings.length,
    });
  } catch (error) {
    console.error("Error processing embeddings:", error);
    return NextResponse.json(
      { message: error.message || "Failed to process embeddings" },
      { status: 500 },
    );
  }
}
