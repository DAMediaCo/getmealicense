#!/usr/bin/env python3
"""Parse insurance PDFs into structured JSON courses - v2."""
import json
import re

def clean_text(text):
    """Remove XCEL branding and clean up text."""
    patterns = [
        r'xcel\s+an?\s+stc\s+company',
        r'XCEL\s+Solutions',
        r'XCELsolutions\.com',
        r'Copyright\s*©\s*\d{4}\s*XCEL\s*Solutions\.?',
        r'Copyright\s*©\s*XCEL\s*Solutions\.?\s*All\s*rights\s*reserved',
        r'904\s*-\s*999\s*-\s*4923',
        r'\|\s*Review Notes - Life and Health Insurance\s*\|',
        r'Page\s+\d+\s*$',
        r'^\s*\d{2,3}\s*$',  # Page numbers on their own line
    ]
    for pattern in patterns:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE | re.MULTILINE)
    
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def parse_florida_laws(filepath):
    """Parse Florida Laws PDF into 3 main sections with subsections."""
    with open(filepath, 'r') as f:
        content = f.read()
    
    content = clean_text(content)
    
    # Split into 3 main sections
    sections = re.split(r'(FLORIDA LAWS, RULES, AND REGULATIONS (?:COMMON TO ALL LINES OF\s*INSURANCE|PERTINENT TO LIFE INSURANCE|PERTINENT TO HEALTH))', content, flags=re.IGNORECASE)
    
    chapters = []
    
    main_sections = [
        ("COMMON TO ALL LINES", "common_all_lines", "Florida Laws Common to All Lines of Insurance"),
        ("PERTINENT TO LIFE", "life_insurance", "Florida Laws Pertinent to Life Insurance"),
        ("PERTINENT TO HEALTH", "health_insurance", "Florida Laws Pertinent to Health Insurance"),
    ]
    
    current_main = None
    current_content = []
    
    for i, section in enumerate(sections):
        if not section.strip():
            continue
            
        # Check if this is a header
        is_header = False
        for pattern, sec_id, title in main_sections:
            if pattern.lower() in section.lower():
                # Save previous section
                if current_main and current_content:
                    chapters.append({
                        "title": current_main[2],
                        "id": current_main[1],
                        "content": '\n'.join(current_content).strip()
                    })
                current_main = (pattern, sec_id, title)
                current_content = []
                is_header = True
                break
        
        if not is_header and current_main:
            current_content.append(section)
    
    # Don't forget last section
    if current_main and current_content:
        chapters.append({
            "title": current_main[2],
            "id": current_main[1],
            "content": '\n'.join(current_content).strip()
        })
    
    return {
        "courseId": "florida_laws_lh",
        "title": "Florida Laws - Life & Health Insurance",
        "description": "Florida-specific laws, rules, and regulations for Life and Health Insurance licensing.",
        "totalChapters": len(chapters),
        "chapters": chapters
    }

def parse_review_notes(filepath):
    """Parse Review Notes PDF into chapters."""
    with open(filepath, 'r') as f:
        content = f.read()
    
    content = clean_text(content)
    
    # Split by "REVIEW NOTES:" headers
    parts = re.split(r'REVIEW NOTES:\s*', content, flags=re.IGNORECASE)
    
    chapters = []
    
    for i, part in enumerate(parts):
        if not part.strip():
            continue
            
        lines = part.strip().split('\n')
        if not lines:
            continue
            
        # First non-empty line is the title
        title = ""
        content_start = 0
        for j, line in enumerate(lines):
            if line.strip():
                title = line.strip()
                content_start = j + 1
                break
        
        if not title:
            continue
        
        # Clean title
        title = re.sub(r'\s+', ' ', title).strip()
        
        # Create chapter ID
        chapter_id = re.sub(r'[^a-z0-9]+', '_', title.lower()).strip('_')[:50]
        
        # Get content
        content_text = '\n'.join(lines[content_start:]).strip()
        
        if content_text and len(content_text) > 100:  # Skip tiny sections
            chapters.append({
                "title": title,
                "id": chapter_id or f"chapter_{i}",
                "content": content_text
            })
    
    return {
        "courseId": "review_notes_lh",
        "title": "Review Notes - Life & Health Insurance",
        "description": "Comprehensive review notes covering all topics for Life and Health Insurance licensing exam.",
        "totalChapters": len(chapters),
        "chapters": chapters
    }

if __name__ == "__main__":
    base_path = "/Users/dave/clawd/projects/getmealicense/courses"
    
    # Parse Florida Laws
    fl_laws = parse_florida_laws(f"{base_path}/florida_laws_raw.txt")
    with open(f"{base_path}/florida_laws.json", 'w') as f:
        json.dump(fl_laws, f, indent=2)
    print(f"✅ Florida Laws: {fl_laws['totalChapters']} chapters")
    for ch in fl_laws['chapters']:
        word_count = len(ch['content'].split())
        print(f"   • {ch['title']} ({word_count} words)")
    
    print()
    
    # Parse Review Notes
    review = parse_review_notes(f"{base_path}/review_notes_raw.txt")
    with open(f"{base_path}/review_notes.json", 'w') as f:
        json.dump(review, f, indent=2)
    print(f"✅ Review Notes: {review['totalChapters']} chapters")
    for ch in review['chapters']:
        word_count = len(ch['content'].split())
        print(f"   • {ch['title']} ({word_count} words)")
