#!/usr/bin/env python3
"""Reformat course content for plain text readability."""
import json
import re

def reformat_content(text):
    """
    Reformat for plain text display:
    - Topic headers in UPPERCASE
    - Clear bullet point formatting
    - Good paragraph spacing
    """
    lines = text.split('\n')
    result_lines = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        
        # Skip empty lines, form feeds, page numbers
        if not stripped or stripped == '\f' or stripped.isdigit():
            i += 1
            continue
        
        leading_spaces = len(line) - len(line.lstrip())
        
        # "o " bullet points (main level)
        if stripped.startswith('o ') and leading_spaces <= 2:
            bullet_text = stripped[2:].strip()
            i += 1
            
            # Collect continuation lines
            while i < len(lines):
                next_line = lines[i]
                next_stripped = next_line.strip()
                next_spaces = len(next_line) - len(next_line.lstrip())
                
                if not next_stripped or next_stripped == '\f' or next_stripped.isdigit():
                    i += 1
                    continue
                    
                # Stop if we hit a new bullet, header, or sub-bullet
                if next_stripped.startswith('o ') and next_spaces <= 2:
                    break
                if next_spaces == 0 and not next_stripped.startswith('o '):
                    break
                if next_spaces >= 8 or '\uf0a7' in next_stripped or '\uf09f' in next_stripped:
                    break
                    
                # Continuation
                if next_spaces >= 2 and next_spaces < 8:
                    bullet_text += ' ' + next_stripped
                    i += 1
                else:
                    break
            
            bullet_text = re.sub(r'\s+', ' ', bullet_text).strip()
            if bullet_text:
                result_lines.append(f'• {bullet_text}')
            continue
        
        # Sub-bullets (heavily indented or special chars)
        if leading_spaces >= 8 or '\uf0a7' in stripped or '\uf09f' in stripped:
            sub_text = stripped.replace('\uf0a7', '').replace('\uf09f', '').strip()
            i += 1
            
            # Collect continuation
            while i < len(lines):
                next_line = lines[i]
                next_stripped = next_line.strip()
                next_spaces = len(next_line) - len(next_line.lstrip())
                
                if not next_stripped or next_stripped == '\f' or next_stripped.isdigit():
                    i += 1
                    continue
                    
                if next_stripped.startswith('o ') or next_spaces == 0:
                    break
                if '\uf0a7' in next_stripped or '\uf09f' in next_stripped:
                    break
                    
                if next_spaces >= 8:
                    sub_text += ' ' + next_stripped.replace('\uf0a7', '').replace('\uf09f', '')
                    i += 1
                else:
                    break
            
            sub_text = re.sub(r'\s+', ' ', sub_text).strip()
            if sub_text:
                result_lines.append(f'   ◦ {sub_text}')
            continue
        
        # Topic header (no leading space, not "o ", SHORT title - not a long paragraph)
        if leading_spaces == 0 and not stripped.startswith('o '):
            # Check if next line is indented (meaning this is a multi-line paragraph, not a header)
            is_header = True
            if i + 1 < len(lines):
                next_line = lines[i + 1]
                next_stripped = next_line.strip()
                next_spaces = len(next_line) - len(next_line.lstrip())
                # If next line is indented continuation, this is a paragraph not a header
                if next_spaces >= 2 and next_stripped and not next_stripped.startswith('o '):
                    is_header = False
            
            # Also if it's very long, probably not a header
            if len(stripped) > 60:
                is_header = False
            
            if is_header:
                # Add blank line before new topic
                if result_lines and result_lines[-1] != '':
                    result_lines.append('')
                result_lines.append(stripped.upper())
                result_lines.append('')
                i += 1
                continue
            else:
                # It's a paragraph - collect all continuation lines
                para_text = stripped
                i += 1
                while i < len(lines):
                    next_line = lines[i]
                    next_stripped = next_line.strip()
                    next_spaces = len(next_line) - len(next_line.lstrip())
                    
                    if not next_stripped or next_stripped == '\f' or next_stripped.isdigit():
                        i += 1
                        continue
                    if next_stripped.startswith('o ') or next_spaces == 0:
                        break
                    if next_spaces >= 2 and next_spaces < 8:
                        para_text += ' ' + next_stripped
                        i += 1
                    else:
                        break
                
                para_text = re.sub(r'\s+', ' ', para_text).strip()
                if para_text:
                    result_lines.append(para_text)
                continue
        
        # Regular continuation text
        if leading_spaces >= 2 and leading_spaces < 8:
            # Add to previous line or as new paragraph
            if result_lines:
                last = result_lines[-1]
                if last and not last.startswith('•') and not last.startswith('   ◦') and last != '':
                    result_lines[-1] = last + ' ' + stripped
                else:
                    result_lines.append(stripped)
            else:
                result_lines.append(stripped)
            i += 1
            continue
        
        result_lines.append(stripped)
        i += 1
    
    # Join with double newlines for paragraph separation
    final_lines = []
    prev_was_bullet = False
    
    for line in result_lines:
        if not line:
            if final_lines and final_lines[-1] != '':
                final_lines.append('')
            prev_was_bullet = False
            continue
            
        is_bullet = line.startswith('•') or line.startswith('   ◦')
        is_header = line.isupper() and len(line) > 3
        
        # Add spacing before headers
        if is_header and final_lines and final_lines[-1] != '':
            final_lines.append('')
        
        final_lines.append(line)
        prev_was_bullet = is_bullet
    
    result = '\n\n'.join([l for l in final_lines if l])
    result = re.sub(r'\n{4,}', '\n\n\n', result)
    return result.strip()

def main():
    with open('florida_laws.json', 'r') as f:
        data = json.load(f)
    
    for chapter in data['chapters']:
        chapter['content'] = reformat_content(chapter['content'])
    
    # Save formatted version
    with open('florida_laws_formatted.json', 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    # Also copy to public folder for the app
    import shutil
    shutil.copy('florida_laws_formatted.json', '../public/courses/florida_laws.json')
    
    print("✅ Reformatted and deployed to public/courses/florida_laws.json")
    print("\n" + "="*60)
    print("SAMPLE:")
    print("="*60 + "\n")
    print(data['chapters'][0]['content'][:2000])

if __name__ == '__main__':
    main()
