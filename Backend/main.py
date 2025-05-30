from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from dotenv import load_dotenv
import os
import io

load_dotenv()

OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY not set in environment variables")

client = OpenAI(api_key=OPENAI_API_KEY)

from supabase import create_client, Client

url: str = os.environ.get("DATABASE_URL")
key: str = os.environ.get("DATABASE_SERVICE_ROLE")

if not url or not key:
    raise RuntimeError("DATABASE_URL or DATABASE_SERVICE_ROLE not set in environment variables")

supabase: Client = create_client(url, key)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    if file.content_type not in ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/wave", "audio/x-pn-wav"]:
        raise HTTPException(status_code=400, detail="Invalid file type")

    audio_data = await file.read()
    buffer = io.BytesIO(audio_data)
    buffer.name = file.filename

    try:
        transcription = client.audio.transcriptions.create(
            model="gpt-4o-transcribe",
            file=buffer
        )
        text = transcription.text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription error: {str(e)}")

    try:
        topic_summary = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that summarizes text."},
                {"role": "user", "content": f"Summarize the main topic of this transcription in exactly 10 words:\n\n{text}"}
            ],
            max_tokens=20,
            temperature=0.3,
        )
        topic = topic_summary.choices[0].message.content.strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Topic summarization error: {str(e)}")

    try:
        sentiment_response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an AI that analyzes sentiment of text."},
                {"role": "user", "content": (
                    "Analyze the sentiment of this text. "
                    "Respond with JSON containing 'sentiment' from this list (angry, sad, happy, neutral, excited, fearful) "
                    "and 'confidence' (a number between 0 and 1). "
                    f"Text:\n\n{text}"
                )}
            ],
            max_tokens=20,
            temperature=0,
        )
        sentiment_json = sentiment_response.choices[0].message.content.strip()

        import json
        sentiment_data = json.loads(sentiment_json)
        sentiment = sentiment_data.get("sentiment", "Neutral")
        confidence = float(sentiment_data.get("confidence", 0))
    except Exception as e:
        sentiment = "Neutral"
        confidence = 0.0

    try:
        response = supabase.table("Transcriptions").insert({
            "transcription": text,
            "topic": topic,
            "sentiment": sentiment,
            "confidence": confidence
        }).execute()

        if response.data is None:
            raise HTTPException(status_code=500, detail="Database insertion error")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database insertion error: {str(e)}")

    return JSONResponse(status_code=200, content={
        "transcription_text": text,
        "topic": topic,
        "sentiment": sentiment,
        "confidence": confidence
    })
