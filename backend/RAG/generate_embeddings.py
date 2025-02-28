import os
import requests
import openai
import pandas as pd
import PyPDF2
import torch
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def extract_text_from_pdf(pdf_path):
    """Extract text from a PDF file"""
    text = ""
    with open(pdf_path, 'rb') as file:
        pdf_reader = PyPDF2.PdfReader(file)
        for page_num in range(len(pdf_reader.pages)):
            page = pdf_reader.pages[page_num]
            text += page.extract_text()
    return text

def split_text_into_chunks(text, chunk_size=1000, overlap=200):
    """Split text into overlapping chunks of approximately chunk_size characters"""
    print(f"Starting to split text of length {len(text)} into chunks with size={chunk_size}, overlap={overlap}")
    chunks = []
    start = 0

    while start < len(text):
        # Find a good break point near chunk_size
        end = min(start + chunk_size, len(text))

        # Only look for natural break points if we're not at the end of the text
        if end < len(text):
            # Try to find a period, question mark, exclamation mark, or newline to break at
            for char in ['. ', '? ', '! ', '\n']:
                pos = text.rfind(char, start, end)
                if pos != -1:
                    end = pos + 2  # Include the period and space
                    break

        # Ensure we're getting a substantial chunk
        if end <= start:
            end = min(start + chunk_size, len(text))

        chunk_text = text[start:end].strip()

        # Only add non-empty chunks
        if chunk_text:
            chunks.append(chunk_text)

        # Move the start position for the next chunk, ensuring we don't move backwards
        start = max(start + chunk_size - overlap, end - overlap)

        # If we can't advance, force advancement to avoid infinite loop
        if start >= end:
            start = end

    print(f"Finished splitting text into {len(chunks)} chunks")
    return chunks

def generate_embeddings_using_openai(texts):
    """Generate embeddings using OpenAI's text-embedding-ada-002 model"""
    # Get OpenAI API key from environment variable
    openai_api_key = os.getenv("OPENAI")
    if not openai_api_key:
        raise ValueError("OPENAI environment variable not set")

    # Initialize the OpenAI client
    client = openai.OpenAI(api_key=openai_api_key)

    # Initialize a list to store all embeddings
    all_embeddings = []

    # Process chunks in batches to avoid hitting rate limits
    batch_size = 20
    total_batches = (len(texts) - 1) // batch_size + 1

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i+batch_size]
        print(f"Processing batch {i//batch_size + 1}/{total_batches}")

        # Call OpenAI API to get embeddings for the batch (new API format)
        response = client.embeddings.create(
            model="text-embedding-ada-002",
            input=batch
        )

        # Extract embeddings from response (new response format)
        batch_embeddings = [data_item.embedding for data_item in response.data]
        all_embeddings.extend(batch_embeddings)

    return all_embeddings

def main():
    # Configuration
    pdf_path = "/Users/vs/Downloads/Jake_s_Resume__Anonymous_.pdf"
    output_path = "/Users/vs/Coding/DermAI/backend/RAG/embed.csv"
    # use_api = input("Use Hugging Face API? (y/n): ").lower().startswith('y')

    print(f"Extracting text from {pdf_path}...")
    text = extract_text_from_pdf(pdf_path)
    print(text)
    print(f"Extracted {len(text)} characters")

    print("Splitting text into chunks...")
    chunks = split_text_into_chunks(text)
    print(f"Split into {len(chunks)} chunks")

    print("Generating embeddings...")
    embeddings = generate_embeddings_using_openai(chunks)

    # Save embeddings
    df_embeddings = pd.DataFrame(embeddings)

    # Also save the text chunks for reference
    df_text = pd.DataFrame({"text": chunks})

    # Save both to CSV
    df_embeddings.to_csv(output_path, index=False)
    text_output_path = output_path.replace('.csv', '_text.csv')
    df_text.to_csv(text_output_path, index=False)

    print(f"Embeddings saved to {output_path}")
    print(f"Text chunks saved to {text_output_path}")

if __name__ == "__main__":
    main()
