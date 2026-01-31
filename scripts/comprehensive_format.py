#!/usr/bin/env python3
"""
Comprehensive content formatter for course JSON files.
Fixes PDF extraction issues including inline headers and bullet hierarchy.
"""
import json
import re

def is_title_case_header(text):
    """Check if text looks like a Title Case header (section name)."""
    words = text.split()
    if len(words) < 2 or len(words) > 10:
        return False
    # Most words should be capitalized
    cap_count = sum(1 for w in words if w[0].isupper())
    # Exclude common lowercase words
    skip_words = {'of', 'the', 'and', 'or', 'a', 'an', 'in', 'to', 'for', 'by', 'with', 'on', 'at', 'from', 'versus', 'vs'}
    meaningful_words = [w for w in words if w.lower() not in skip_words]
    if len(meaningful_words) < 1:
        return False
    # Check if it's likely a header
    if cap_count >= len(words) * 0.5 and not text.endswith(('.', ',', ':', ';', '?', '!')):
        # Shouldn't start with articles/prepositions for a header
        if text.split()[0].lower() not in {'a', 'an', 'the', 'if', 'when', 'for'}:
            return True
    return False

def split_inline_headers(content):
    """
    Find and separate inline headers from text.
    Pattern: "...sentence end. Title Case Header •..."
    """
    # Pattern: period/end + space + Title Case words + space + bullet
    # We need to insert newlines before these inline headers
    
    lines = content.split('\n')
    result = []
    
    for line in lines:
        # Look for pattern: sentence ending + potential header + bullet
        # e.g., "...planning process. Benefits and Costs of Insurance to Society • Insurance..."
        
        # Find potential inline headers
        # Pattern: word. [Title Case Words] •
        matches = list(re.finditer(r'([.!?])\s+([A-Z][A-Za-z]+(?:\s+(?:of|the|and|or|a|an|in|to|for|by|with|versus|vs|[A-Z][A-Za-z]+))+)\s+(•|◦)', line))
        
        if matches:
            # Split at each match
            last_end = 0
            parts = []
            for m in matches:
                # Text before the header
                parts.append(line[last_end:m.start()+1])  # Include the period
                # The header itself
                header = m.group(2).strip()
                parts.append(f'\n\n{header.upper()}\n\n')
                last_end = m.end() - 1  # Start from the bullet
            parts.append(line[last_end:])
            result.append(''.join(parts))
        else:
            result.append(line)
    
    return '\n'.join(result)

def normalize_bullets(content):
    """Ensure all bullets are followed by proper spacing and on their own lines."""
    # First split inline sub-bullets
    # Pattern: "◦ text ◦ text" -> "◦ text\n\n◦ text"
    content = re.sub(r'(◦[^◦•\n]+)\s+(◦)', r'\1\n\n\2', content)
    content = re.sub(r'(•[^◦•\n]+)\s+(•)', r'\1\n\n\2', content)
    content = re.sub(r'(•[^◦•\n]+)\s+(◦)', r'\1\n\n\2', content)
    
    return content

def apply_bullet_hierarchy(content):
    """Apply proper bullet hierarchy based on context."""
    lines = [l.strip() for l in content.split('\n') if l.strip()]
    
    result = []
    in_sublist = False
    
    for i, line in enumerate(lines):
        # Check if this is an ALL CAPS HEADER
        if line.isupper() and len(line) > 3 and not line.startswith('•') and not line.startswith('◦'):
            in_sublist = False
            result.append(line)
            continue
        
        # Check if this is a bullet
        if line.startswith('•') or line.startswith('◦'):
            bullet_content = line[1:].strip()
            
            # Is this a list introducer (ends with ":")?
            is_list_intro = line.rstrip().endswith(':')
            
            # Is this a topic phrase (short, no verb start)?
            is_topic = len(bullet_content.split()) <= 4 and bullet_content[-1:].isalpha()
            list_starters = ('must ', 'may ', 'shall ', 'an ', 'a ', 'the ', 'if ')
            if any(bullet_content.lower().startswith(s) for s in list_starters):
                is_topic = False
            
            if is_topic and not is_list_intro:
                # Topic phrase - reset to main bullet
                in_sublist = False
                result.append(f'• {bullet_content}')
            elif in_sublist:
                # In a sublist - use sub-bullet
                result.append(f'◦ {bullet_content}')
            else:
                # Main bullet
                result.append(f'• {bullet_content}')
            
            if is_list_intro:
                in_sublist = True
        else:
            # Plain text
            in_sublist = False
            result.append(line)
    
    return '\n\n'.join(result)

def format_content(content):
    """Full formatting pipeline."""
    # Step 1: Split inline headers
    content = split_inline_headers(content)
    
    # Step 2: Normalize bullets
    content = normalize_bullets(content)
    
    # Step 3: Apply bullet hierarchy
    content = apply_bullet_hierarchy(content)
    
    # Step 4: Clean up excessive whitespace
    content = re.sub(r'\n{3,}', '\n\n', content)
    
    return content.strip()

def process_file(filename):
    """Process a course JSON file."""
    with open(filename, 'r') as f:
        data = json.load(f)
    
    for page in data.get('pages', []):
        page['content'] = format_content(page['content'])
    
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)
    
    return len(data.get('pages', []))

if __name__ == '__main__':
    import sys
    files = sys.argv[1:] if len(sys.argv) > 1 else [
        'public/courses/florida_laws.json',
        'public/courses/review_notes.json'
    ]
    
    for f in files:
        n = process_file(f)
        print(f"✓ Formatted {f} ({n} pages)")
