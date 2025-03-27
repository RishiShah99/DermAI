import os
import numpy as np
import pandas as pd
import plotly.express as px
from supabase import create_client
from sklearn.decomposition import PCA
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Supabase credentials
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment variables")

# Initialize Supabase client
supabase = create_client(supabase_url, supabase_key)

def fetch_documents_with_embeddings():
    """Fetch documents with their embeddings from Supabase."""
    try:
        response = supabase.table('documents').select('id, title, embedding').execute()
        return response.data
    except Exception as e:
        print(f"Error fetching data from Supabase: {e}")
        return []

def parse_embedding_string(embedding_str):
    """Parse a string representation of a vector into a numpy array."""
    try:
        # Clean the string (remove brackets if present)
        cleaned_str = embedding_str.strip('{}[]')

        # Split the string by commas
        values = cleaned_str.split(',')

        # Convert to float values
        float_values = [float(val.strip()) for val in values if val.strip()]

        return np.array(float_values)
    except Exception as e:
        print(f"Error parsing embedding: {e}")
        return None

def visualize_embeddings(documents):
    """Visualize embeddings in 3D space using PCA."""
    if not documents:
        print("No documents found.")
        return

    # Process documents with embeddings
    documents_with_embeddings = []
    embeddings = []
    titles = []
    ids = []

    for doc in documents:
        if 'embedding' in doc and doc['embedding'] is not None:
            if isinstance(doc['embedding'], str):
                # Parse the string representation of the vector
                embedding_array = parse_embedding_string(doc['embedding'])
                if embedding_array is not None and len(embedding_array) > 0:
                    embeddings.append(embedding_array)
                    titles.append(doc['title'])
                    ids.append(doc['id'])
                    documents_with_embeddings.append(doc)
            elif isinstance(doc['embedding'], list):
                embeddings.append(np.array(doc['embedding']))
                titles.append(doc['title'])
                ids.append(doc['id'])
                documents_with_embeddings.append(doc)

    if not documents_with_embeddings:
        print("No documents with valid embeddings found.")
        return

    print(f"Successfully parsed {len(embeddings)} embeddings.")

    try:
        # Convert to numpy array
        embeddings_array = np.array(embeddings)

        print(f"Embeddings shape: {embeddings_array.shape}")

        # If embeddings are high-dimensional, reduce to 3D using PCA
        if embeddings_array.shape[1] > 3:
            print(f"Reducing embeddings from {embeddings_array.shape[1]} dimensions to 3 using PCA...")
            pca = PCA(n_components=3)
            embeddings_3d = pca.fit_transform(embeddings_array)

            # Print explained variance
            explained_variance = pca.explained_variance_ratio_
            print(f"Explained variance by the 3 components: {explained_variance}")
            print(f"Total explained variance: {np.sum(explained_variance):.4f}")
        else:
            embeddings_3d = embeddings_array

        # Create DataFrame for Plotly
        df = pd.DataFrame({
            'ID': ids,
            'Title': titles,
            'x': embeddings_3d[:, 0],
            'y': embeddings_3d[:, 1],
            'z': embeddings_3d[:, 2]
        })

        # Create 3D scatter plot
        fig = px.scatter_3d(
            df, x='x', y='y', z='z',
            color='ID',  # Color points by document ID
            hover_name='Title',
            title='Document Embeddings Visualization in 3D Space',
            labels={'x': 'x', 'y': 'y', 'z': 'z'},
            opacity=0.7
        )

        # Improve layout
        fig.update_layout(
            scene=dict(
                xaxis_title='x',
                yaxis_title='y',
                zaxis_title='z'
            ),
            margin=dict(l=0, r=0, b=0, t=30)
        )

        # Show the plot
        fig.show()

    except Exception as e:
        print(f"Error processing embeddings: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("Fetching documents with embeddings from Supabase...")
    documents = fetch_documents_with_embeddings()
    print(f"Found {len(documents)} documents.")
    visualize_embeddings(documents)
