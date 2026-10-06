import os
from dotenv import load_dotenv

load_dotenv("backend/.env")
api_key = os.getenv("GEMINI_API_KEY")
print("API key loaded:", bool(api_key))

from google import genai
from google.genai import types

client = genai.Client(api_key=api_key)

prompt = "Please read the following text aloud: Let's debug this together. Look at how you track seen numbers in your hash map."
print("Calling gemini-3.1-flash-tts-preview with voice Kore...")
try:
    response = client.models.generate_content(
        model="gemini-3.1-flash-tts-preview",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name="Kore"
                    )
                )
            ),
        ),
    )
    if response and response.candidates and response.candidates[0].content.parts:
        pcm = response.candidates[0].content.parts[0].inline_data.data
        print(f"SUCCESS with gemini-3.1-flash-tts-preview! PCM bytes: {len(pcm)}")
    else:
        print("No audio parts returned")
except Exception as e:
    print(f"FAILED with gemini-3.1-flash-tts-preview: {e}")
