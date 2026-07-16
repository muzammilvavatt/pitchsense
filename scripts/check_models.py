import os
import requests
from dotenv import load_dotenv

load_dotenv('d:/projects/pitchsense/scripts/.env')
key = os.getenv('GEMINI_API_KEY')
url = f'https://generativelanguage.googleapis.com/v1beta/models?key={key}'
res = requests.get(url)
models = res.json().get('models', [])
for m in models:
    name = m.get('name')
    if 'generateContent' in m.get('supportedGenerationMethods', []):
        print(f"{name}")
