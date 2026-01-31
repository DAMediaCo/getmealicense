#!/usr/bin/env python3
"""Update manifest.json with all available voice folders"""
import json
from pathlib import Path

VOICES = ['aria', 'jenny', 'michelle', 'christopher', 'eric', 'guy']
BASE_DIR = Path(__file__).parent.parent
AUDIO_DIR = BASE_DIR / 'public' / 'courses' / 'audio'

def update_manifest():
    manifest = {
        'voices': [],
        'defaultVoice': 'aria',
        'audio': {}
    }
    
    for voice_id in VOICES:
        voice_dir = AUDIO_DIR / voice_id
        if not voice_dir.exists():
            continue
        
        files = list(voice_dir.glob('*.mp3'))
        if not files:
            continue
            
        manifest['voices'].append(voice_id)
        manifest['audio'][voice_id] = {
            'florida_laws_lh': {},
            'review_notes_lh': {}
        }
        
        for mp3 in files:
            name = mp3.stem
            if name.startswith('florida_laws_lh_'):
                chapter = name[16:]
                manifest['audio'][voice_id]['florida_laws_lh'][chapter] = f"/courses/audio/{voice_id}/{mp3.name}"
            elif name.startswith('review_notes_lh_'):
                chapter = name[16:]
                manifest['audio'][voice_id]['review_notes_lh'][chapter] = f"/courses/audio/{voice_id}/{mp3.name}"
    
    manifest_path = AUDIO_DIR / 'manifest.json'
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)
    
    print(f"✅ Manifest updated!")
    print(f"   Voices: {manifest['voices']}")
    for v in manifest['voices']:
        fl = len(manifest['audio'][v]['florida_laws_lh'])
        rn = len(manifest['audio'][v]['review_notes_lh'])
        print(f"   {v}: {fl} FL + {rn} RN = {fl+rn} files")

if __name__ == '__main__':
    update_manifest()
