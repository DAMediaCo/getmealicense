#!/usr/bin/env python3
"""
Generate course audio for all 6 voices using Edge TTS.
100 pages × 6 voices = 600 audio files
"""

import asyncio
import json
import os
import sys
import edge_tts
from pathlib import Path

# Voice mapping
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

async def generate_audio(text: str, voice: str, output_path: Path):
    """Generate audio file using Edge TTS"""
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(str(output_path))

async def process_voice(voice_id: str, voice_name: str, pages: list):
    """Process all pages for a single voice"""
    voice_dir = AUDIO_DIR / voice_id
    voice_dir.mkdir(parents=True, exist_ok=True)
    
    total = len(pages)
    completed = 0
    
    for page in pages:
        course_id = page['course_id']
        chapter_id = page['chapter_id']
        content = page['content']
        
        # Output filename matches original structure
        filename = f"{course_id}_{chapter_id}.mp3"
        output_path = voice_dir / filename
        
        # Skip if already exists
        if output_path.exists():
            completed += 1
            continue
        
        try:
            await generate_audio(content, voice_name, output_path)
            completed += 1
            print(f"  [{voice_id}] {completed}/{total}: {chapter_id}")
        except Exception as e:
            print(f"  [{voice_id}] ERROR on {chapter_id}: {e}")
    
    return completed

def load_courses():
    """Load all course pages"""
    pages = []
    
    # Florida Laws
    fl_path = COURSES_DIR / 'florida_laws.json'
    if fl_path.exists():
        with open(fl_path) as f:
            course = json.load(f)
            for page in course['pages']:
                pages.append({
                    'course_id': course['courseId'],
                    'chapter_id': page['id'],
                    'content': page['content'],
                    'title': page['title']
                })
    
    # Review Notes
    rn_path = COURSES_DIR / 'review_notes.json'
    if rn_path.exists():
        with open(rn_path) as f:
            course = json.load(f)
            for page in course['pages']:
                pages.append({
                    'course_id': course['courseId'],
                    'chapter_id': page['id'],
                    'content': page['content'],
                    'title': page['title']
                })
    
    return pages

def update_manifest():
    """Update manifest with multi-voice structure"""
    manifest = {
        'voices': list(VOICES.keys()),
        'defaultVoice': 'aria',
        'audio': {}
    }
    
    for voice_id in VOICES.keys():
        voice_dir = AUDIO_DIR / voice_id
        if not voice_dir.exists():
            continue
            
        manifest['audio'][voice_id] = {
            'florida_laws_lh': {},
            'review_notes_lh': {}
        }
        
        for mp3_file in voice_dir.glob('*.mp3'):
            filename = mp3_file.stem  # e.g., florida_laws_lh_chapter_id
            
            if filename.startswith('florida_laws_lh_'):
                chapter_id = filename[16:]
                manifest['audio'][voice_id]['florida_laws_lh'][chapter_id] = f"/courses/audio/{voice_id}/{mp3_file.name}"
            elif filename.startswith('review_notes_lh_'):
                chapter_id = filename[16:]
                manifest['audio'][voice_id]['review_notes_lh'][chapter_id] = f"/courses/audio/{voice_id}/{mp3_file.name}"
    
    manifest_path = AUDIO_DIR / 'manifest.json'
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)
    
    print(f"\n✅ Manifest updated: {manifest_path}")

async def main():
    # Check for specific voice argument
    target_voice = sys.argv[1] if len(sys.argv) > 1 else None
    
    print("=" * 60)
    print("GENERATING COURSE AUDIO - 6 VOICES")
    print("=" * 60)
    
    # Load all pages
    pages = load_courses()
    print(f"\nLoaded {len(pages)} pages from courses")
    
    voices_to_process = {target_voice: VOICES[target_voice]} if target_voice else VOICES
    
    for voice_id, voice_name in voices_to_process.items():
        print(f"\n🎤 Processing voice: {voice_id} ({voice_name})")
        completed = await process_voice(voice_id, voice_name, pages)
        print(f"✅ {voice_id}: {completed}/{len(pages)} files")
        
        # Update manifest after each voice completes
        update_manifest()
    
    print("\n" + "=" * 60)
    print("ALL VOICES COMPLETE!")
    print("=" * 60)

if __name__ == '__main__':
    asyncio.run(main())
