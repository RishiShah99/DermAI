# Flask Pipeline for HOSA Project
# TODO: Figure out exactly what the return of the machine learning model is, and how I can fix it. 

from flask import Flask, request, render_template, send_file, redirect, url_for
import os
import numpy as np
import torch
from torch import nn
import torchvision.transforms as transforms
from PIL import Image

def create_app():
    app = Flask(__name__)

    # Load the model
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
    model.load_state_dict(torch.load('Models/model_0.pth', map_location=torch.device('cpu')))
    model.eval()

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model.to(device)

    # Preprocessing function
    def preprocess_image(image):
        transform = transforms.Compose([
            transforms.Resize((512, 512)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        return transform(image).unsqueeze(0).to(device)

    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/upload', methods=['POST'])
    def upload():
        if 'image' not in request.files:
            print("No file part in request")
            return redirect(url_for('index', error="No file selected"))

        file = request.files['image']
        if file.filename == '':
            print("No selected file")
            return redirect(url_for('index', error="No selected file"))

        if allowed_file(file.filename):
            filepath = os.path.join('static/uploads', file.filename)
            file.save(filepath)
            print(f"File saved at: {filepath}")

            # Open image
            image = Image.open(filepath).convert("RGB")
            image = preprocess_image(image)

            # Make prediction
            with torch.no_grad():
                outputs = model(image)
                predicted_class = torch.argmax(outputs, dim=1).item()
            
            print(f"Prediction: {predicted_class}")

            return render_template('index.html', result=predicted_class, image_url=filepath)
        
        print("Invalid file format")
        return redirect(url_for('index', error="Invalid file format"))


    def allowed_file(filename):
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg'}

    if not os.path.exists('static/uploads'):
        os.makedirs('static/uploads')
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)