#!/usr/bin/env python3
"""Reformat course content for better readability - v3."""
import json
import re

def reformat_content(text):
    """
    Reformat based on actual structure:
    - Lines without leading space that don't start with 'o' = TOPIC HEADERS (bold)
    - Lines with ' o ' = main bullet points
    - Heavily indented lines = sub-bullets
    - Regular paragraphs = normal text
    """
    lines = text.split('\n')
    formatted = []
    current_paragraph = []
    in_bullet_section = False
    
    def flush_paragraph():
        nonlocal current_paragraph
        if current_paragraph:
            text = ' '.join(current_paragraph)
            text = re.sub(r'\s+', ' ', text).strip()
            if text:
                formatted.append(text)
            current_paragraph = []
    
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        
        # Skip empty lines and form feeds
        if not stripped or stripped == '\f':
            flush_paragraph()
            i += 1
            continue
        
        # Skip page numbers (just digits)
        if stripped.isdigit():
            i += 1
            continue
        
        # Count leading spaces
        leading_spaces = len(line) - len(line.lstrip())
        
        # Check for "o " bullet point (usually has 1 leading space)
        if stripped.startswith('o ') and leading_spaces <= 2:
            flush_paragraph()
            formatted.append('')  # Add spacing
            
            # Get the bullet text, may span multiple lines
            bullet_text = stripped[2:].strip()
            i += 1
            
            # Collect continuation lines (indented more than the 'o')
            while i < len(lines):
                next_line = lines[i]
                next_stripped = next_line.strip()
                next_spaces = len(next_line) - len(next_line.lstrip())
                
                # If next line is heavily indented and doesn't start with special chars
                if next_spaces > 3 and next_stripped and not next_stripped.startswith('o '):
                    # Check if it's a sub-bullet (very indented)
                    if next_spaces >= 8:
                        # Finish current bullet
                        formatted.append(f'**•** {bullet_text}')
                        formatted.append('')
                        break
                    else:
                        # Continuation of current bullet
                        bullet_text += ' ' + next_stripped
                        i += 1
                else:
                    break
            
            bullet_text = re.sub(r'\s+', ' ', bullet_text).strip()
            if bullet_text:
                formatted.append(f'**•** {bullet_text}')
            in_bullet_section = True
            continue
        
        # Sub-bullets (heavily indented, often have special chars)
        if leading_spaces >= 8 or '\uf0a7' in stripped or '\uf09f' in stripped:
            flush_paragraph()
            
            # Clean the text
            sub_text = stripped.replace('\uf0a7', '').replace('\uf09f', '').strip()
            
            # Collect continuation lines
            i += 1
            while i < len(lines):
                next_line = lines[i]
                next_stripped = next_line.strip()
                next_spaces = len(next_line) - len(next_line.lstrip())
                
                if next_spaces >= 10 and next_stripped and not next_stripped.startswith('o '):
                    sub_text += ' ' + next_stripped.replace('\uf0a7', '').replace('\uf09f', '')
                    i += 1
                else:
                    break
            
            sub_text = re.sub(r'\s+', ' ', sub_text).strip()
            if sub_text:
                formatted.append(f'    → {sub_text}')
            continue
        
        # Topic header (no leading space, not starting with 'o')
        if leading_spaces == 0 and not stripped.startswith('o '):
            flush_paragraph()
            formatted.append('')  # Spacing before header
            formatted.append(f'**{stripped}**')
            formatted.append('')
            i += 1
            in_bullet_section = False
            continue
        
        # Regular text - add to paragraph
        current_paragraph.append(stripped)
        i += 1
    
    flush_paragraph()
    
    # Clean up excessive blank lines
    result = '\n'.join(formatted)
    result = re.sub(r'\n{3,}', '\n\n', result)
    return result.strip()

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
    
    print("✅ Reformatted content saved to florida_laws_formatted.json")
    
    # Print sample
    print("\n" + "="*60)
    print("SAMPLE FROM CHAPTER 1:")
    print("="*60 + "\n")
    sample = data['chapters'][0]['content'][:2500]
    print(sample)

if __name__ == '__main__':
    main()
