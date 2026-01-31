#!/usr/bin/env python3
"""Parse insurance PDFs into structured JSON courses."""
import json
import re

def clean_text(text):
    """Remove XCEL branding and clean up text."""
    # Remove XCEL branding variations
    patterns = [
        r'xcel\s+an?\s+stc\s+company',
        r'XCEL\s+Solutions',
        r'XCELsolutions\.com',
        r'Copyright\s*©\s*\d{4}\s*XCEL\s*Solutions\.?',
        r'Copyright\s*©\s*XCEL\s*Solutions\.?\s*All\s*rights\s*reserved',
        r'904\s*-\s*999\s*-\s*4923',
        r'\|\s*Review Notes - Life and Health Insurance\s*\|',
        r'Page\s+\d+',
    ]
    for pattern in patterns:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)
    
    # Clean up extra whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]+', ' ', text)
    return text.strip()

def parse_florida_laws(filepath):
    """Parse Florida Laws PDF into chapters."""
    with open(filepath, 'r') as f:
        content = f.read()
    
    content = clean_text(content)
    
    # Split into sections based on headers
    chapters = []
    
    # Main sections we can identify
    sections = [
        ("Office of Insurance Regulation", "office_of_insurance_regulation"),
        ("Licensing", "licensing"),
        ("Agent", "agent"),
        ("Agencies", "agencies"),
        ("Insurance Transaction", "insurance_transaction"),
        ("Twisting", "twisting_churning_sliding"),
        ("Insurance companies are classified", "insurance_company_types"),
        ("Advertisement", "advertisement"),
        ("Florida Life and Health Insurance Guaranty Association", "guaranty_association"),
        ("Trade practices", "trade_practices"),
        ("FLORIDA LAWS, RULES, AND REGULATIONS PERTINENT TO LIFE INSURANCE", "life_insurance_laws"),
        ("FLORIDA LAWS, RULES, AND REGULATIONS PERTINENT TO HEALTH INSURANCE", "health_insurance_laws"),
    ]
    
    lines = content.split('\n')
    current_chapter = {"title": "Introduction", "id": "intro", "content": []}
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Check if this line starts a new section
        new_section = False
        for section_start, section_id in sections:
            if section_start.lower() in line.lower()[:80]:
                if current_chapter["content"]:
                    chapters.append(current_chapter)
                current_chapter = {
                    "title": line[:100].strip(),
                    "id": section_id,
                    "content": []
                }
                new_section = True
                break
        
        if not new_section:
            current_chapter["content"].append(line)
    
    if current_chapter["content"]:
        chapters.append(current_chapter)
    
    # Convert content arrays to text
    for chapter in chapters:
        chapter["content"] = '\n'.join(chapter["content"])
    
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
    
    # Review notes has clear chapter headers like "REVIEW NOTES: TOPIC NAME"
    chapters = []
    
    # Split by "REVIEW NOTES:" headers
    parts = re.split(r'REVIEW NOTES:\s*', content, flags=re.IGNORECASE)
    
    for i, part in enumerate(parts):
        if not part.strip():
            continue
            
        lines = part.strip().split('\n')
        if not lines:
            continue
            
        # First line is the title
        title = lines[0].strip()
        if not title:
            continue
            
        # Create chapter ID from title
        chapter_id = re.sub(r'[^a-z0-9]+', '_', title.lower()).strip('_')[:50]
        
        # Rest is content
        content_text = '\n'.join(lines[1:]).strip()
        
        if content_text:
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
    print(f"Florida Laws: {fl_laws['totalChapters']} chapters")
    for ch in fl_laws['chapters']:
        print(f"  - {ch['title'][:60]}...")
    
    print()
    
    # Parse Review Notes
    review = parse_review_notes(f"{base_path}/review_notes_raw.txt")
    with open(f"{base_path}/review_notes.json", 'w') as f:
        json.dump(review, f, indent=2)
    print(f"Review Notes: {review['totalChapters']} chapters")
    for ch in review['chapters']:
        print(f"  - {ch['title'][:60]}...")
