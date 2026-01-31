#!/usr/bin/env python3
"""Reformat course content for better readability."""
import json
import re

def reformat_content(text):
    """
    Reformat course content:
    1. Lines starting with 'o ' become bold section headers
    2. Lines with '\uf0a7' become separate paragraphs with bullet styling
    3. Clean up spacing for readability
    """
    lines = text.split('\n')
    formatted_lines = []
    
    for line in lines:
        stripped = line.strip()
        
        # Skip empty lines but preserve some spacing
        if not stripped:
            if formatted_lines and formatted_lines[-1] != '':
                formatted_lines.append('')
            continue
        
        # Skip form feed characters
        if stripped == '\f':
            formatted_lines.append('')
            continue
            
        # Handle lines starting with "o " - these are section headers
        if stripped.startswith('o '):
            # Add spacing before new section
            if formatted_lines and formatted_lines[-1] != '':
                formatted_lines.append('')
            # Make it bold (using ** for markdown/HTML rendering)
            header_text = stripped[2:].strip()
            formatted_lines.append(f'**{header_text}**')
            formatted_lines.append('')
            continue
        
        # Handle sub-bullets (uf0a7 character)
        if '\uf0a7' in stripped:
            # Add spacing before bullet point
            if formatted_lines and formatted_lines[-1] != '':
                formatted_lines.append('')
            # Replace the symbol with a proper bullet and indent
            bullet_text = stripped.replace('\uf0a7', '').strip()
            formatted_lines.append(f'• {bullet_text}')
            continue
        
        # Handle checkbox symbol (uf09f)
        if '\uf09f' in stripped:
            if formatted_lines and formatted_lines[-1] != '':
                formatted_lines.append('')
            bullet_text = stripped.replace('\uf09f', '').strip()
            formatted_lines.append(f'• {bullet_text}')
            continue
        
        # Regular text - append normally
        formatted_lines.append(stripped)
    
    # Join and clean up multiple blank lines
    result = '\n'.join(formatted_lines)
    result = re.sub(r'\n{3,}', '\n\n', result)
    
    return result

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
    
    # Also print a sample to verify
    print("\n--- Sample from Chapter 1 ---")
    sample = data['chapters'][0]['content'][:2000]
    print(sample)

if __name__ == '__main__':
    main()
