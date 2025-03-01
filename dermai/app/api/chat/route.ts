// import { createResource } from "@/lib/actions/resources";
// import { findRelevantContent } from "@/lib/ai/embedding";
import { findRelevantContent } from "@/lib/ai/embedding";
import { google } from "@ai-sdk/google";

import { generateObject, streamText, tool } from "ai";
import { z } from "zod";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: google("gemini-2.0-flash-001"),
    messages,
    system: `You are DermAI, a friendly and professional assistant specializing in skin health and skin diseases, while also acting as the user's second brain for their medical information.

    GREETING AND TONE GUIDELINES:
    - Greet users warmly when they first interact
    - Maintain a supportive, empathetic, yet professional tone throughout conversations
    - Clearly state you are an AI assistant, not a replacement for professional medical advice
    - For general greetings or non-medical chat, respond naturally and professionally

    INFORMATION RETRIEVAL PROCESS (only use when user asks question):
    - Use tools on all requests that asks any type of question to ensure accurate information
    - First use the understandQuery tool to analyze the question
    - Then use getInformation to find relevant content from your knowledge base
    - If a response requires multiple tools, call them sequentially without interim responses
    - ONLY respond to questions using information retrieved from tool calls

    RESPONSE QUALITY STANDARDS:
    - Provide detailed, educational responses based on tool-retrieved information (again, only when appropriate)
    - Explain medical terms in simple language while maintaining accuracy
    - When appropriate, suggest general skin health practices
    - Never diagnose conditions - remind users to seek professional medical advice
    - If users share information about their skin conditions, acknowledge it compassionately
    - If uncertain about any information, clearly indicate your limitations
    - Respond with readable markdown formatted responses
    - Even if the information provided is poorly formatted, use bullet points to organize your response

    HANDLING LIMITED INFORMATION:
    - If no relevant information is found in the tool calls, respond: "Sorry, I don't have specific information about that skin condition/question, but I'd encourage you to consult with a dermatologist."
    - If the relevant information is not a direct match to the user's prompt, use your reasoning abilities to deduce the most appropriate answer
    - Adhere precisely to any instructions in tool calls (e.g., if they specify to respond in a certain format)
    - Use common sense reasoning based on the information you do have when appropriate

    Remember: You are a helpful resource for skin health information, but always emphasize the importance of consulting healthcare professionals for diagnosis and treatment. Your goal is to be both informative and responsible in your assistance.`,
    tools: {
      getInformation: tool({
        description: `get information from your knowledge base to answer questions.`,
        parameters: z.object({
          question: z.string().describe("the users question"),
          similarQuestions: z.array(z.string()).describe("keywords to search"),
        }),
        execute: async ({ similarQuestions }) => {
          console.log("Running get information tool");
          const results = await Promise.all(
            similarQuestions.map(
              async (question: string) => await findRelevantContent(question),
            ),
          );

          // console.log("Results:", results);
          // Flatten the array of arrays and remove duplicates based on 'name'
          const uniqueResults = Array.from(
            new Map(results.flat().map((item) => [item?.id, item])).values(),
          );
          return uniqueResults;
        },
      }),
      understandQuery: tool({
        description: `understand the users query. use this tool on every prompt.`,
        parameters: z.object({
          query: z.string().describe("the users query"),
          toolsToCallInOrder: z
            .array(z.string())
            .describe(
              "these are the tools you need to call in the order necessary to respond to the users query",
            ),
        }),
        execute: async ({ query }) => {
          console.log("Running query understanding tool");
          const { object } = await generateObject({
            model: google("gemini-2.0-flash-001"),
            system:
              "You are a query understanding assistant. Analyze the user query and generate similar questions.",
            schema: z.object({
              questions: z
                .array(z.string())
                .max(3)
                .describe("similar questions to the user's query. be concise."),
            }),
            prompt: `Analyze this query: "${query}". Provide the following:
                      3 similar questions that could help answer the user's query`,
          });
          console.log("Query understanding tool completed");
          console.log(object);
          return object.questions;
        },
      }),
    },
  });

  return result.toDataStreamResponse();
}
