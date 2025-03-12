import time
import torch
from torch import nn
import torchvision.transforms as transforms
from PIL import Image

# Load model
model = torch.hub.load('pytorch/vision:v0.10.0', 'densenet121', pretrained=False)
num_features = model.classifier.in_features
model.classifier = nn.Sequential(
    nn.Linear(num_features, 512),
    nn.ReLU(),
    nn.Dropout(0.4),
    nn.Linear(512, 256),
    nn.ReLU(),
    nn.Dropout(0.3),
    nn.Linear(256, 23)
)
model.load_state_dict(torch.load('backend\Models\model_0.pth', map_location=torch.device('cpu')))
model.eval()

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model.to(device)

# Class labels
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

# Preprocessing function
def preprocess_image(image):
    transform = transforms.Compose([
        transforms.Resize((512, 512)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    return transform(image).unsqueeze(0).to(device)

# Load image
image_path = r"backend\Scripts\UploadImages\07PerioralDermEye.jpg" 
image = Image.open(image_path).convert("RGB")

# Preprocess
image = preprocess_image(image)

# Measure inference time
start_time = time.time()
with torch.no_grad():
    output = model(image)  # Get raw predictions
end_time = time.time()

# Get predicted class
predicted_class_index = torch.argmax(output, dim=1).item()
predicted_label = class_labels[predicted_class_index]

# Print results
print(f"Predicted Label: {predicted_label}")
print(f"Time taken for prediction: {end_time - start_time:.6f} seconds")