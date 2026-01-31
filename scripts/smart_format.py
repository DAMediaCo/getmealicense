#!/usr/bin/env python3
"""
Smart formatter for course content.
Fixes bullet hierarchy based on context.
"""
import json
import re

def smart_format(content):
    """
    Rules:
    1. After a line ending with ":" (list introducer), subsequent bullets become sub-bullets
    2. Continue sub-bullets until: next HEADER, or a bullet that ends with ":" (new list), or plain text
    3. Convert orphan topic bullets (short bullets that introduce content) to headers
    4. Clean up spacing
    """
    lines = content.split('\n')
    result = []
    in_sublist = False
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        
        # Skip empty lines, just pass through
        if not stripped:
            result.append(line)
            continue
        
        # Check if this is a HEADER (all caps, reasonable length)
        is_header = (stripped.isupper() and 
                    len(stripped) > 3 and 
                    not stripped.startswith('•') and 
                    not stripped.startswith('◦'))
        
        # Check if previous non-empty line ended with ":"
        prev_ends_colon = False
        for j in range(i-1, -1, -1):
            if lines[j].strip():
                prev_ends_colon = lines[j].strip().endswith(':')
                break
        
        # Check if current line ends with ":" (list introducer)
        current_ends_colon = stripped.endswith(':')
        
        if is_header:
            # Headers end sublists
            in_sublist = False
            result.append(line)
        elif stripped.startswith('•'):
            # It's a main bullet
            bullet_content = stripped[1:].strip()
            
            # Check if this bullet is a short "topic" (like "• Agent") followed by a definition
            # These should become headers
            if len(bullet_content) < 30 and not current_ends_colon:
                # Look ahead - if next bullet defines this term, make it a header
                next_line = ""
                for j in range(i+1, len(lines)):
                    if lines[j].strip():
                        next_line = lines[j].strip()
                        break
                
                # If next line starts with "• An/A/The [same word]" it's a definition
                if next_line.startswith('• '):
                    next_content = next_line[2:].lower()
                    if next_content.startswith(('an ', 'a ', 'the ')) and bullet_content.lower().split()[0] in next_content[:50]:
                        # Convert to header
                        result.append(bullet_content.upper())
                        in_sublist = False
                        continue
            
            if in_sublist:
                # We're in a sublist, convert to sub-bullet
                result.append(f'◦ {bullet_content}')
            else:
                # Keep as main bullet
                result.append(stripped)
            
            # If this bullet ends with ":", start a sublist
            if current_ends_colon:
                in_sublist = True
                
        elif stripped.startswith('◦'):
            # Already a sub-bullet, keep it
            result.append(stripped)
            # Don't change in_sublist state
        else:
            # Plain text - ends sublist unless it's a continuation
            if not prev_ends_colon:
                in_sublist = False
            result.append(stripped)
    
    # Join and clean up spacing
    text = '\n\n'.join(line for line in result if line.strip())
    
    # Ensure proper double-newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    return text

def process_file(filename):
    with open(filename, 'r') as f:
        data = json.load(f)
    
    changes = 0
    for page in data.get('pages', []):
        original = page['content']
        page['content'] = smart_format(original)
        if page['content'] != original:
            changes += 1
    
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)
    
    return changes, len(data.get('pages', []))

if __name__ == '__main__':
    import sys
    
    files = sys.argv[1:] if len(sys.argv) > 1 else ['florida_laws.json', 'review_notes.json']
    
    for fname in files:
        changes, total = process_file(fname)
        print(f"{fname}: {changes}/{total} pages modified")
