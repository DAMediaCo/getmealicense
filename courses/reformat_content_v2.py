#!/usr/bin/env python3
"""Reformat course content for better readability - v2."""
import json
import re

def reformat_content(text):
    """
    Reformat course content:
    1. Lines starting with 'o ' are section headers - bold the full section title
    2. Lines with bullet symbols become properly formatted bullet points
    3. Clean up spacing for readability
    """
    # First, normalize the text - join continuation lines
    # Lines starting with spaces after 'o ' lines are continuations
    text = text.replace('\f', '\n')  # Remove form feeds
    
    # Split into paragraphs (double newline separated)
    paragraphs = re.split(r'\n\s*\n', text)
    
    formatted_paragraphs = []
    
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
            
        # Join wrapped lines within paragraph
        para = re.sub(r'\n\s+', ' ', para)
        para = re.sub(r'\s+', ' ', para)
        
        # Handle "o " section headers
        if para.startswith('o '):
            header_text = para[2:].strip()
            formatted_paragraphs.append(f'**{header_text}**')
            continue
        
        # Handle bullet point markers (\uf0a7)
        if '\uf0a7' in para:
            # Split on bullet markers
            parts = para.split('\uf0a7')
            for i, part in enumerate(parts):
                part = part.strip()
                if not part:
                    continue
                if i == 0 and not para.startswith('\uf0a7'):
                    # Text before first bullet
                    formatted_paragraphs.append(part)
                else:
                    # Bullet point
                    formatted_paragraphs.append(f'  • {part}')
            continue
        
        # Handle checkbox markers (\uf09f)
        if '\uf09f' in para:
            parts = para.split('\uf09f')
            for i, part in enumerate(parts):
                part = part.strip()
                if not part:
                    continue
                if i == 0 and not para.startswith('\uf09f'):
                    formatted_paragraphs.append(part)
                else:
                    formatted_paragraphs.append(f'  ✓ {part}')
            continue
        
        # Regular paragraph
        formatted_paragraphs.append(para)
    
    return '\n\n'.join(formatted_paragraphs)

def main():
    # Load the course JSON
    with open('florida_laws.json', 'r') as f:
        data = json.load(f)
    
    # Reformat each chapter's content
    for chapter in data['chapters']:
        chapter['content'] = reformat_content(chapter['content'])
    
    # Save the reformatted version
    with open('florida_laws_formatted.json', 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print("Reformatted content saved to florida_laws_formatted.json")
    
    # Print sample to verify
    print("\n" + "="*60)
    print("SAMPLE FROM CHAPTER 1:")
    print("="*60)
    sample = data['chapters'][0]['content'][:3000]
    print(sample)

if __name__ == '__main__':
    main()
