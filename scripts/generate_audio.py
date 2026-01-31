#!/usr/bin/env python3
"""Generate TTS audio for all course pages using Edge TTS."""
import asyncio
import json
import os
import edge_tts

# Voice options - these are the best neural voices
VOICE = "en-US-AriaNeural"  # Clear, professional female voice
# Alternatives: "en-US-GuyNeural" (male), "en-US-JennyNeural" (female)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(SCRIPT_DIR, "../public/courses/audio")
COURSES_DIR = os.path.join(SCRIPT_DIR, "../public/courses")

async def generate_page_audio(text: str, output_path: str, voice: str = VOICE):
    """Generate audio for a single page."""
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)

async def process_course(course_file: str):
    """Process all pages in a course."""
    with open(os.path.join(COURSES_DIR, course_file), 'r') as f:
        course = json.load(f)
    
    course_id = course['courseId']
    
    # Handle both old (chapters) and new (pages) structure
    pages = course.get('pages', course.get('chapters', []))
    
    print(f"\n📚 Processing: {course['title']}")
    print(f"   Pages: {len(pages)}")
    
    for i, page in enumerate(pages):
        page_id = page['id']
        output_file = f"{course_id}_{page_id}.mp3"
        output_path = os.path.join(OUTPUT_DIR, output_file)
        
        # Skip if already generated
        if os.path.exists(output_path):
            print(f"   ⏭️  Page {i+1}: {page['title']} (already exists)")
            continue
        
        print(f"   🎙️  Page {i+1}/{len(pages)}: {page['title']}...")
        
        # Clean text for TTS
        text = page['content']
        # Silent pauses for bullets - just remove them (natural sentence flow)
        text = text.replace('• ', '')
        text = text.replace('◦ ', '')
        text = text.replace('→', 'to')
        text = text.replace('✓', 'check')
        text = text.replace('—', ', ')
        text = text.replace('–', ', ')
        
        try:
            await generate_page_audio(text, output_path)
            size_kb = os.path.getsize(output_path) / 1024
            print(f"      ✅ Generated: {output_file} ({size_kb:.0f}KB)")
        except Exception as e:
            print(f"      ❌ Error: {e}")

async def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    print("🎧 Edge TTS Audio Generator for GetMeALicense")
    print("=" * 50)
    
    # Process all course files
    course_files = [f for f in os.listdir(COURSES_DIR) if f.endswith('.json')]
    
    for course_file in sorted(course_files):
        await process_course(course_file)
    
    # Calculate total size
    mp3_files = [f for f in os.listdir(OUTPUT_DIR) if f.endswith('.mp3')]
    total_size = sum(
        os.path.getsize(os.path.join(OUTPUT_DIR, f))
        for f in mp3_files
    )
    print(f"\n✅ Done! Generated {len(mp3_files)} audio files")
    print(f"   Total audio size: {total_size / (1024*1024):.1f}MB")
    
    # Generate manifest for the frontend
    manifest = {}
    for f in mp3_files:
        # Parse filename: courseId_pageId.mp3
        parts = f.replace('.mp3', '').split('_', 1)
        if len(parts) == 2:
            course_id, page_id = parts
            if course_id not in manifest:
                manifest[course_id] = {}
            manifest[course_id][page_id] = f"/courses/audio/{f}"
    
    with open(os.path.join(OUTPUT_DIR, 'manifest.json'), 'w') as f:
        json.dump(manifest, f, indent=2)
    print("📋 Generated manifest.json")

if __name__ == '__main__':
    asyncio.run(main())
