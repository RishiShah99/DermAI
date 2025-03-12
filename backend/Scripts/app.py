from flask import Flask, request, jsonify
import requests
import torch
import torchvision.transforms as transforms
from PIL import Image
from io import BytesIO
from supabase import create_client, Client
from torch import nn

"""
Image Classification API using DenseNet121

This Flask application provides an endpoint for classifying images stored in Supabase.
The model is a fine-tuned DenseNet121 that classifies images into 23 categories.

To use this API:
1. Upload an image to your Supabase storage bucket named 'images'
2. Send a POST request to /classify with the following JSON body:
   {
       "image_id": "your-image-id-from-supabase"
   }

Example usage:
    curl -X POST http://your-server/classify 
         -H "Content-Type: application/json" 
         -d '{"image_id": "example-image-123.jpg"}'

Response format:
    Success: {"image_id": "example-image-123.jpg", "predicted_class": 5}
    Error: {"error": "error message"}
"""

# Flask App Initialization
app = Flask(__name__)

# Supabase Credentials
SUPABASE_URL = "YOUR_SUPABASE_URL"
SUPABASE_KEY = "YOUR_SUPABASE_API_KEY"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Load the pre-trained DenseNet121 model and modify for our classification task
model = torch.hub.load('pytorch/vision:v0.10.0', 'densenet121', pretrained=False)
num_features = model.classifier.in_features
model.classifier = nn.Sequential(
    nn.Linear(num_features, 512),
    nn.ReLU(),
    nn.Dropout(0.4),
    nn.Linear(512, 256),
    nn.ReLU(),
    nn.Dropout(0.3),
    nn.Linear(256, 23)  # Final layer with 23 output classes
)
model.load_state_dict(torch.load('Models/model_0.pth', map_location=torch.device('cpu')))
model.eval()

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model.to(device)

def preprocess_image(image_bytes):
    """
    Preprocess the input image for the model.
    
    Args:
        image_bytes (bytes): Raw image data in bytes
        
    Returns:
        torch.Tensor: Preprocessed image tensor ready for model input
        
    Process:
    1. Resize image to 512x512 pixels
    2. Convert to tensor
    3. Normalize using ImageNet statistics
    4. Add batch dimension
    """
    transform = transforms.Compose([
        transforms.Resize((512, 512)),  # Resize to DenseNet121 input size
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])  # ImageNet normalization
    ])
    image = Image.open(BytesIO(image_bytes)).convert("RGB")
    return transform(image).unsqueeze(0)

def fetch_image_from_supabase(image_id):
    """
    Fetch image data from Supabase storage.
    
    Args:
        image_id (str): The ID/path of the image in Supabase storage
        
    Returns:
        bytes: Raw image data
    """
    res = supabase.storage.from_('images').download(image_id)  # 'images' is the storage bucket
    return res

# Define class labels
class_labels = [
    "Acne and Rosacea Photos",
    "Actinic Keratosis Basal Cell Carcinoma and other Malignant Lesions",
    "Atopic Dermatitis Photos",
    "Bullous Disease Photos",
    "Cellulitis Impetigo and other Bacterial Infections",
    "Eczema Photos",
    "Exanthems and Drug Eruptions",
    "Hair Loss Photos Alopecia and other Hair Diseases",
    "Herpes HPV and other STDs Photos",
    "Light Diseases and Disorders of Pigmentation",
    "Lupus and other Connective Tissue Diseases",
    "Melanoma Skin Cancer Nevi and Moles",
    "Nail Fungus and other Nail Disease",
    "Poison Ivy Photos and other Contact Dermatitis",
    "Psoriasis Pictures Lichen Planus and Related Diseases",
    "Scabies Lyme Disease and other Infestations and Bites",
    "Seborrheic Keratoses and other Benign Tumors",
    "Systemic Disease",
    "Tinea Ringworm Candidiasis and other Fungal Infections",
    "Urticaria Hives",
    "Vascular Tumors",
    "Vasculitis Photos",
    "Warts Molluscum and other Viral Infections"
]

@app.route('/classify', methods=['POST'])
def classify_image():
    """
    Endpoint to classify an image stored in Supabase.
    """
    data = request.get_json()
    image_id = data.get("image_id")

    if not image_id:
        return jsonify({"error": "No image_id provided"}), 400

    try:
        # Fetch Image from Supabase
        image_bytes = fetch_image_from_supabase(image_id)
        image_tensor = preprocess_image(image_bytes)

        # Run Classification
        with torch.no_grad():
            outputs = model(image_tensor)
            predicted_class_index = outputs.argmax(1).item()
            predicted_label = class_labels[predicted_class_index]  # Get actual class name

        # Save Classification Result in Supabase DB
        supabase.table("image_results").insert({"image_id": image_id, "class": predicted_label}).execute()

        return jsonify({"image_id": image_id, "predicted_class": predicted_label}), 200  # Return class name instead of index

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Run Flask App
if __name__ == '__main__':
    app.run(debug=True)