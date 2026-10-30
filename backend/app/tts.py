"""
Chutku AI Neural Text-to-Speech Engine.
Provides human-like, warm, conversational speech synthesis supporting ElevenLabs,
Edge Neural TTS (Microsoft Azure Neural voices), and automatic multi-tier fallback.
Supports Indian English, Hindi, and Hinglish.
"""
from __future__ import annotations

import io
import os
import re
import logging
from typing import AsyncGenerator, Optional
import httpx
import edge_tts

logger = logging.getLogger("resolveai.tts")

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")  # Rachel / Warm conversational
CHUTKU_TTS_PROVIDER = os.getenv("CHUTKU_TTS_PROVIDER", "auto").lower()

# Edge Neural Voice Candidates
EDGE_VOICE_MAP = {
    # Soft, cheerful feminine voice (Default Indian English)
    "neerja": "en-IN-NeerjaExpressiveNeural",
    "female": "en-IN-NeerjaExpressiveNeural",
    # Warm, friendly masculine voice
    "prabhat": "en-IN-PrabhatNeural",
    "male": "en-IN-PrabhatNeural",
    # Gentle, youthful Hindi / Hinglish voice
    "swara": "hi-IN-SwaraNeural",
    "hindi": "hi-IN-SwaraNeural",
    "madhur": "hi-IN-MadhurNeural",
}


def sanitize_for_speech(text: str) -> str:
    """Strips Markdown syntax, URLs, raw code blocks, and technical symbols

    so the audio speaks natural conversational sentences.
    """
    if not text:
        return ""
    # Remove code blocks
    s = re.sub(r"```[\s\S]*?```", "", text)
    # Remove inline code
    s = re.sub(r"`([^`]+)`", r"\1", s)
    # Convert markdown links [Label](url) -> Label
    s = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", s)
    # Remove raw URLs
    s = re.sub(r"https?://\S+", "", s)
    # Remove bold, italics, headers, bullets
    s = re.sub(r"[*_#~>]", "", s)
    s = re.sub(r"^\s*[-•*]\s+", "", s, flags=re.MULTILINE)
    # Normalize whitespace and ellipsis
    s = re.sub(r"\s+", " ", s).strip()
    return s


async def synthesize_elevenlabs_stream(
    text: str, voice_id: Optional[str] = None
) -> AsyncGenerator[bytes, None]:
    """Streams audio from ElevenLabs API using eleven_turbo_v2_5 or eleven_multilingual_v2."""
    v_id = voice_id or ELEVENLABS_VOICE_ID or "21m00Tcm4TlvDq8ikWAM"
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{v_id}/stream"

    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    }
    payload = {
        "text": text,
        "model_id": "eleven_turbo_v2_5",
        "voice_settings": {
            "stability": 0.45,
            "similarity_boost": 0.75,
            "style": 0.25,
            "use_speaker_boost": True,
        },
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        async with client.stream("POST", url, headers=headers, json=payload) as response:
            if response.status_code != 200:
                error_body = await response.aread()
                raise RuntimeError(
                    f"ElevenLabs error {response.status_code}: {error_body.decode('utf-8', errors='ignore')}"
                )
            async for chunk in response.aiter_bytes():
                if chunk:
                    yield chunk


async def synthesize_edge_stream(
    text: str, voice: str = "neerja", speed: float = 1.0, language: str = "en-IN"
) -> AsyncGenerator[bytes, None]:
    """Streams audio from Microsoft Azure Neural Edge TTS (warm, expressive, human quality)."""
    # Auto-select Hindi voice if Hindi characters or language requested
    has_devanagari = any("\u0900" <= ch <= "\u097f" for ch in text)
    if has_devanagari or language.startswith("hi"):
        edge_voice = EDGE_VOICE_MAP.get(voice, "hi-IN-SwaraNeural")
    else:
        edge_voice = EDGE_VOICE_MAP.get(voice, "en-IN-NeerjaExpressiveNeural")

    # Format speed modifier
    speed_percent = int(round((speed - 1.0) * 100))
    rate_str = f"{speed_percent:+d}%" if speed_percent != 0 else "+0%"

    communicate = edge_tts.Communicate(text, edge_voice, rate=rate_str)
    async for chunk in communicate.stream():
        if chunk.get("type") == "audio" and chunk.get("data"):
            yield chunk["data"]


async def get_audio_stream(
    text: str,
    voice: str = "neerja",
    language: str = "en-IN",
    speed: float = 1.0,
) -> AsyncGenerator[bytes, None]:
    """Universal TTS entrypoint.

    Tries ElevenLabs if configured; otherwise seamlessly uses Edge Neural TTS.
    """
    clean_text = sanitize_for_speech(text)
    if not clean_text:
        yield b""
        return

    # Try ElevenLabs if explicitly requested or auto-configured with a valid key
    if (
        ELEVENLABS_API_KEY
        and ELEVENLABS_API_KEY != "your_elevenlabs_api_key_here"
        and (CHUTKU_TTS_PROVIDER in ("elevenlabs", "auto"))
    ):
        try:
            logger.info("Synthesizing speech via ElevenLabs...")
            async for chunk in synthesize_elevenlabs_stream(clean_text, voice_id=voice if len(voice) > 15 else None):
                yield chunk
            return
        except Exception as e:
            logger.warning("ElevenLabs failed; falling back to Edge Neural TTS: %s", e)

    # Use Edge Neural TTS
    logger.info("Synthesizing speech via Edge Neural TTS (%s)...", voice)
    async for chunk in synthesize_edge_stream(clean_text, voice=voice, speed=speed, language=language):
        yield chunk

