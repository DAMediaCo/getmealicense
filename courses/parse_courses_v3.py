#!/usr/bin/env python3
"""Parse insurance PDFs into structured JSON courses - v3."""
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
        r'^\s*\d{2,3}\s*$',
    ]
    for pattern in patterns:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE | re.MULTILINE)
    
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def parse_florida_laws(filepath):
    """Parse Florida Laws PDF into 3 main sections."""
    with open(filepath, 'r') as f:
        content = f.read()
    
    content = clean_text(content)
    
    sections = re.split(r'(FLORIDA LAWS, RULES, AND REGULATIONS (?:COMMON TO ALL LINES OF\s*INSURANCE|PERTINENT TO LIFE INSURANCE|PERTINENT TO HEALTH))', content, flags=re.IGNORECASE)
    
    chapters = []
    main_sections = [
        ("COMMON TO ALL LINES", "common_all_lines", "Florida Laws Common to All Lines of Insurance"),
        ("PERTINENT TO LIFE", "life_insurance", "Florida Laws Pertinent to Life Insurance"),
        ("PERTINENT TO HEALTH", "health_insurance", "Florida Laws Pertinent to Health Insurance"),
    ]
    
    current_main = None
    current_content = []
    
    for section in sections:
        if not section.strip():
            continue
            
        is_header = False
        for pattern, sec_id, title in main_sections:
            if pattern.lower() in section.lower():
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
    """Parse Review Notes PDF into chapters with proper multi-line titles."""
    with open(filepath, 'r') as f:
        content = f.read()
    
    content = clean_text(content)
    
    # Full chapter titles (manually matched from PDF)
    chapter_titles = {
        "BASIC PRINCIPLES OF LIFE AND": "Basic Principles of Life and Health Insurance",
        "THE NATURE OF INSURANCE": "The Nature of Insurance",
        "LEGAL CONCEPTS OF INSURANCE": "Legal Concepts of Insurance",
        "LIFE INSURANCE POLICY TYPES": "Life Insurance Policy Types",
        "LIFE INSURANCE POLICY\nPROVISIONS": "Life Insurance Policy Provisions, Options, and Riders",
        "LIFE INSURANCE PREMIUMS": "Life Insurance Premiums, Proceeds, and Beneficiaries",
        "LIFE INSURANCE UNDERWRITING": "Life Insurance Underwriting and Policy Issue",
        "GROUP LIFE INSURANCE": "Group Life Insurance",
        "ANNUITIES": "Annuities",
        "SOCIAL SECURITY": "Social Security",
        "RETIREMENT PLANS": "Retirement Plans",
        "USES OF LIFE INSURANCE": "Uses of Life Insurance",
        "INTRODUCTION TO HEALTH AND": "Introduction to Health and Accident Insurance",
        "HEALTH INSURANCE PROVIDERS": "Health Insurance Providers",
        "MEDICAL EXPENSE INSURANCE": "Medical Expense Insurance",
        "DISABILITY INCOME INSURANCE": "Disability Income Insurance",
        "INSURANCE PLANS FOR SENIORS": "Insurance Plans for Seniors and Special Needs",
        "HEALTH INSURANCE POLICY": "Health Insurance Policy Provisions",
        "HEALTH INSURANCE\n": "Health Insurance",
    }
    
    parts = re.split(r'REVIEW NOTES:\s*', content, flags=re.IGNORECASE)
    
    chapters = []
    
    for i, part in enumerate(parts):
        if not part.strip() or i == 0:
            continue
            
        lines = part.strip().split('\n')
        if not lines:
            continue
        
        # Find title by matching known patterns
        raw_title = lines[0].strip()
        full_title = None
        content_start = 1
        
        # Check if title continues to next line
        for pattern, clean_title in chapter_titles.items():
            if raw_title.upper().startswith(pattern.split('\n')[0].upper()):
                full_title = clean_title
                # If pattern has newline, title spans 2 lines
                if '\n' in pattern:
                    content_start = 2
                break
        
        if not full_title:
            full_title = raw_title.title()
        
        chapter_id = re.sub(r'[^a-z0-9]+', '_', full_title.lower()).strip('_')[:50]
        content_text = '\n'.join(lines[content_start:]).strip()
        
        if content_text and len(content_text) > 50:
            chapters.append({
                "title": full_title,
                "id": chapter_id,
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
    
    # Summary
    total_words = sum(len(ch['content'].split()) for ch in fl_laws['chapters'])
    total_words += sum(len(ch['content'].split()) for ch in review['chapters'])
    print(f"\n📊 Total: {fl_laws['totalChapters'] + review['totalChapters']} chapters, ~{total_words} words")
