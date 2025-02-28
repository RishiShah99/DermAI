import os
import pandas as pd
import numpy as np
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def upload_embeddings_to_supabase():
    # Get Supabase credentials from environment variables
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")

    if not supabase_url or not supabase_key:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment variables")

    # Create Supabase client
    supabase = create_client(supabase_url, supabase_key)

    # Load embeddings and text chunks
    embed_file_path = "/Users/vs/Coding/DermAI/backend/RAG/embed.csv"
    text_file_path = "/Users/vs/Coding/DermAI/backend/RAG/embed_text.csv"

    df_embeddings = pd.read_csv(embed_file_path)
    df_text = pd.read_csv(text_file_path)

    print(f"Loaded {len(df_embeddings)} embeddings and {len(df_text)} text chunks")

    # Check that we have the same number of embeddings as text chunks
    if len(df_embeddings) != len(df_text):
        raise ValueError(f"Number of embeddings ({len(df_embeddings)}) doesn't match number of text chunks ({len(df_text)})")

    # Convert embeddings to list format
    embeddings = df_embeddings.values.tolist()
    text_chunks = df_text['text'].tolist()

    # Prepare data for insertion
    data_to_insert = []
    for i, (embedding, text) in enumerate(zip(embeddings, text_chunks)):
        data_to_insert.append({
            "title": f"Resume Chunk {i+1}",  # Using chunk number as title
            "body": text,                    # The text content goes in the body field
            "embedding": embedding           # The embedding vector
        })

    print(f"Prepared {len(data_to_insert)} items for insertion")

    # Insert data into Supabase in batches
    batch_size = 100
    for i in range(0, len(data_to_insert), batch_size):
        batch = data_to_insert[i:i+batch_size]
        print(f"Uploading batch {i//batch_size + 1}/{(len(data_to_insert)-1)//batch_size + 1}")

        try:
            response = supabase.table("documents").insert(batch).execute()
            print(f"Successfully uploaded batch")
        except Exception as e:
            print(f"Error uploading batch: {str(e)}")

    print("Upload complete!")

def main():
    upload_embeddings_to_supabase()

if __name__ == "__main__":
    main()
