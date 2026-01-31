#!/usr/bin/env python3
"""Generate TTS audio for all course chapters using Edge TTS."""
import asyncio
import json
import os
import edge_tts

# Voice options - these are the best neural voices
VOICE = "en-US-AriaNeural"  # Clear, professional female voice
# Alternatives: "en-US-GuyNeural" (male), "en-US-JennyNeural" (female)

OUTPUT_DIR = "../public/audio"
COURSES_DIR = "../public/courses"

async def generate_chapter_audio(text: str, output_path: str, voice: str = VOICE):
    """Generate audio for a single chapter."""
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)

async def process_course(course_file: str):
    """Process all chapters in a course."""
    with open(os.path.join(COURSES_DIR, course_file), 'r') as f:
        course = json.load(f)
    
    course_id = course['courseId']
    print(f"\n📚 Processing: {course['title']}")
    print(f"   Chapters: {len(course['chapters'])}")
    
    for i, chapter in enumerate(course['chapters']):
        chapter_id = chapter['id']
        output_file = f"{course_id}_{chapter_id}.mp3"
        output_path = os.path.join(OUTPUT_DIR, output_file)
        
        # Skip if already generated
        if os.path.exists(output_path):
            print(f"   ⏭️  Chapter {i+1}: {chapter['title']} (already exists)")
            continue
        
        print(f"   🎙️  Chapter {i+1}: {chapter['title']}...")
        
        # Clean text for TTS
        text = chapter['content']
        # Remove symbols that don't speak well
        text = text.replace('•', '')
        text = text.replace('◦', '')
        text = text.replace('→', '')
        text = text.replace('✓', '')
        
        try:
            await generate_chapter_audio(text, output_path)
            size_mb = os.path.getsize(output_path) / (1024 * 1024)
            print(f"      ✅ Generated: {output_file} ({size_mb:.1f}MB)")
        except Exception as e:
            print(f"      ❌ Error: {e}")

async def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    print("🎧 Edge TTS Audio Generator for GetMeALicense")
    print("=" * 50)
    
    # Process all course files
    course_files = [f for f in os.listdir(COURSES_DIR) if f.endswith('.json')]
    
    for course_file in course_files:
        await process_course(course_file)
    
    # Calculate total size
    total_size = sum(
        os.path.getsize(os.path.join(OUTPUT_DIR, f))
        for f in os.listdir(OUTPUT_DIR) if f.endswith('.mp3')
    )
    print(f"\n✅ Done! Total audio size: {total_size / (1024*1024):.1f}MB")
    
    # Generate manifest for the frontend
    manifest = {}
    for f in os.listdir(OUTPUT_DIR):
        if f.endswith('.mp3'):
            # Parse filename: courseId_chapterId.mp3
            parts = f.replace('.mp3', '').split('_', 1)
            if len(parts) == 2:
                course_id, chapter_id = parts
                if course_id not in manifest:
                    manifest[course_id] = {}
                manifest[course_id][chapter_id] = f"/audio/{f}"
    
    with open(os.path.join(OUTPUT_DIR, 'manifest.json'), 'w') as f:
        json.dump(manifest, f, indent=2)
    print("📋 Generated manifest.json")

if __name__ == '__main__':
    asyncio.run(main())
