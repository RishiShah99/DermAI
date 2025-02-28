import os
import requests
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
        print(f"Processing chunk starting at position {start}")
        # Find a good break point near chunk_size
        end = min(start + chunk_size, len(text))
        print(f"Initial end position: {end}")

        if end < len(text):
            print("Looking for a natural break point...")
            # Try to find a period, question mark, or newline to break at
            for char in ['. ', '? ', '! ', '\n']:
                pos = text.rfind(char, start, end)
                if pos != -1:
                    end = pos + 1
                    print(f"Found break at '{char}' at position {pos}, new end: {end}")
                    break
            else:
                print("No natural break point found")

        chunk_text = text[start:end].strip()
        print(f"Adding chunk of length {len(chunk_text)}")
        chunks.append(chunk_text)

        start = end - overlap
        print(f"Next chunk will start at position {start} (with overlap)")

    print(f"Finished splitting text into {len(chunks)} chunks")
    return chunks

def generate_embeddings_using_api(texts, model_id="sentence-transformers/all-MiniLM-L6-v2"):
    """Generate embeddings using Hugging Face API"""
    hf_token = os.getenv("HF_TOKEN")
    if not hf_token:
        raise ValueError("HF_TOKEN environment variable not set")

    api_url = f"https://api-inference.huggingface.co/pipeline/feature-extraction/{model_id}"
    headers = {"Authorization": f"Bearer {hf_token}"}

    def query(texts):
        response = requests.post(
            api_url,
            headers=headers,
            json={"inputs": texts, "options": {"wait_for_model": True}}
        )
        if response.status_code != 200:
            raise Exception(f"API request failed with status code {response.status_code}: {response.text}")
        print(response.json())
        return response.json()

    # For large documents, we might need to batch
    batch_size = 10
    all_embeddings = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i+batch_size]
        print(f"Processing batch {i//batch_size + 1}/{(len(texts)-1)//batch_size + 1}")
        output = query(batch)
        all_embeddings.extend(output)

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
    embeddings = generate_embeddings_using_api(chunks)

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
