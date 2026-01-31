#!/usr/bin/env python3
"""Generate course audio for one voice using Edge TTS."""
import asyncio
import json
import sys
import edge_tts
from pathlib import Path

VOICES = {
    'aria': 'en-US-AriaNeural',
    'jenny': 'en-US-JennyNeural', 
    'michelle': 'en-US-MichelleNeural',
    'christopher': 'en-US-ChristopherNeural',
    'eric': 'en-US-EricNeural',
    'guy': 'en-US-GuyNeural',
}

BASE_DIR = Path(__file__).parent.parent
COURSES_DIR = BASE_DIR / 'public' / 'courses'
AUDIO_DIR = COURSES_DIR / 'audio'

def load_pages():
    pages = []
    for course_file, course_id in [('florida_laws.json', 'florida_laws_lh'), ('review_notes.json', 'review_notes_lh')]:
        path = COURSES_DIR / course_file
        with open(path) as f:
            course = json.load(f)
            for page in course['pages']:
                pages.append({
                    'course_id': course['courseId'],
                    'chapter_id': page['id'],
                    'content': page['content'],
                })
    return pages

async def generate(voice_id):
    voice_name = VOICES[voice_id]
    voice_dir = AUDIO_DIR / voice_id
    voice_dir.mkdir(parents=True, exist_ok=True)
    
    pages = load_pages()
    total = len(pages)
    
    print(f"🎤 Generating {total} files for {voice_id} ({voice_name})", flush=True)
    
    for i, page in enumerate(pages, 1):
        filename = f"{page['course_id']}_{page['chapter_id']}.mp3"
        output = voice_dir / filename
        
        if output.exists():
            print(f"  [{i}/{total}] SKIP (exists): {page['chapter_id']}", flush=True)
            continue
        
        try:
            comm = edge_tts.Communicate(page['content'], voice_name)
            await comm.save(str(output))
            print(f"  [{i}/{total}] ✅ {page['chapter_id']}", flush=True)
        except Exception as e:
            print(f"  [{i}/{total}] ❌ {page['chapter_id']}: {e}", flush=True)
    
    print(f"✅ {voice_id} complete!", flush=True)

if __name__ == '__main__':
    voice = sys.argv[1] if len(sys.argv) > 1 else 'aria'
    if voice not in VOICES:
        print(f"Unknown voice: {voice}. Options: {list(VOICES.keys())}")
        sys.exit(1)
    asyncio.run(generate(voice))
