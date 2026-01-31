#!/usr/bin/env python3
"""
Final comprehensive formatter for course JSON files.
"""
import json
import re

def split_inline_headers(content):
    """Separate headers that are stuck inline with other text."""
    
    # Pattern 1: At start of line: "Header Name • text"
    content = re.sub(
        r'^([A-Z][A-Za-z]+(?:\s+(?:of|the|and|or|to|for|by|with|in|versus|vs|[A-Z][A-Za-z]+))+)\s+(•)',
        r'\n\n\1\n\n\2',
        content,
        flags=re.MULTILINE
    )
    
    # Pattern 2: After punctuation: "sentence. Header Name •"
    content = re.sub(
        r'([.!?])\s+([A-Z][A-Za-z]+(?:\s+(?:of|the|and|or|to|for|by|with|in|versus|vs|[A-Z][A-Za-z]+))+)\s+(•|◦)',
        r'\1\n\n\2\n\n\3',
        content
    )
    
    # Pattern 3: "word Header Name" where Header is "X versus/and/or Y"
    content = re.sub(
        r'(\b[a-z]+)\s+([A-Z][A-Za-z]+(?:\s+(?:and|or|versus|vs)\s+[A-Z][A-Za-z]+)+)',
        r'\1\n\n\2',
        content
    )
    
    # Pattern 4: Catch remaining inline headers after lowercase word
    content = re.sub(
        r'(\b[a-z]{3,})\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)+)\s+(•)',
        r'\1\n\n\2\n\n\3',
        content
    )
    
    return content

def normalize_bullets_to_lines(content):
    """Ensure bullets are on their own lines."""
    # Split inline bullets: "◦ text ◦ text" -> "◦ text\n\n◦ text"
    content = re.sub(r'(◦[^◦•\n]+)\s+(◦)', r'\1\n\n\2', content)
    content = re.sub(r'(•[^◦•\n]+)\s+(•)', r'\1\n\n\2', content)
    content = re.sub(r'(•[^◦•\n]+)\s+(◦)', r'\1\n\n\2', content)
    return content

def apply_formatting(content):
    """Apply final formatting rules."""
    lines = content.split('\n')
    result = []
    in_sublist = False
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        
        # Check if this is an ALL CAPS header already
        if stripped.isupper() and len(stripped) > 3 and not stripped.startswith('•') and not stripped.startswith('◦'):
            in_sublist = False
            result.append(stripped)
            continue
        
        # Check if this is a Title Case header (should become ALL CAPS)
        words = stripped.split()
        is_header = (
            2 <= len(words) <= 10 and
            not stripped.startswith('•') and
            not stripped.startswith('◦') and
            stripped[-1].isalpha() and
            sum(1 for w in words if w[0].isupper()) >= len(words) * 0.5 and
            not stripped.lower().startswith(('a ', 'an ', 'the ', 'if ', 'for ', 'in ', 'to ', 'must ', 'may '))
        )
        
        if is_header:
            in_sublist = False
            result.append(stripped.upper())
            continue
        
        # Handle bullets
        if stripped.startswith('•') or stripped.startswith('◦'):
            bullet_content = stripped[1:].strip()
            is_list_intro = stripped.rstrip().endswith(':')
            
            # Check if this is a topic phrase (short, naming a concept)
            is_topic = (
                len(bullet_content.split()) <= 4 and 
                bullet_content[-1:].isalpha() and
                not any(bullet_content.lower().startswith(s) for s in 
                    ('must ', 'may ', 'shall ', 'an ', 'a ', 'the ', 'if ', 'for ', 'in '))
            )
            
            if is_topic and not is_list_intro:
                in_sublist = False
                result.append(f'• {bullet_content}')
            elif in_sublist:
                result.append(f'◦ {bullet_content}')
            else:
                result.append(f'• {bullet_content}')
            
            if is_list_intro:
                in_sublist = True
        else:
            in_sublist = False
            result.append(stripped)
    
    return '\n\n'.join(result)

def format_content(content):
    """Full pipeline."""
    content = split_inline_headers(content)
    content = normalize_bullets_to_lines(content)
    content = apply_formatting(content)
    content = re.sub(r'\n{3,}', '\n\n', content)
    return content.strip()

def process_file(filename):
    with open(filename, 'r') as f:
        data = json.load(f)
    
    for page in data.get('pages', []):
        page['content'] = format_content(page['content'])
    
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)
    
    return len(data.get('pages', []))

if __name__ == '__main__':
    for f in ['public/courses/florida_laws.json', 'public/courses/review_notes.json']:
        n = process_file(f)
        print(f"✓ {f}: {n} pages")
