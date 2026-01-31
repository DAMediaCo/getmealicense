#!/usr/bin/env python3
"""Split long chapters into shorter page-sized sections."""
import json
import re
import os

TARGET_WORDS_PER_PAGE = 500  # Roughly 1 book page
MIN_WORDS_PER_PAGE = 300
MAX_WORDS_PER_PAGE = 700

def split_into_pages(content: str, chapter_title: str) -> list[dict]:
    """Split content into page-sized chunks, breaking at natural points."""
    
    # Split on double newlines (paragraphs)
    paragraphs = [p.strip() for p in content.split('\n\n') if p.strip()]
    
    pages = []
    current_page = []
    current_word_count = 0
    page_num = 1
    
    for para in paragraphs:
        para_words = len(para.split())
        
        # If adding this paragraph exceeds max and we have content, start new page
        if current_word_count + para_words > MAX_WORDS_PER_PAGE and current_page:
            # Save current page
            pages.append({
                'content': '\n\n'.join(current_page),
                'word_count': current_word_count
            })
            current_page = [para]
            current_word_count = para_words
            page_num += 1
        # If current page is at target and this para would push us over, check if good break point
        elif current_word_count >= TARGET_WORDS_PER_PAGE and para_words > 50:
            # Check if this is a natural break (starts with header - uppercase line)
            is_header = para.isupper() and len(para) < 60
            if is_header or current_word_count >= MIN_WORDS_PER_PAGE:
                pages.append({
                    'content': '\n\n'.join(current_page),
                    'word_count': current_word_count
                })
                current_page = [para]
                current_word_count = para_words
                page_num += 1
            else:
                current_page.append(para)
                current_word_count += para_words
        else:
            current_page.append(para)
            current_word_count += para_words
    
    # Don't forget the last page
    if current_page:
        pages.append({
            'content': '\n\n'.join(current_page),
            'word_count': current_word_count
        })
    
    # Add page numbers and titles
    total_pages = len(pages)
    result = []
    for i, page in enumerate(pages):
        if total_pages == 1:
            title = chapter_title
            page_id = chapter_title.lower().replace(' ', '_').replace('/', '_')[:50]
        else:
            title = f"{chapter_title} (Page {i+1}/{total_pages})"
            page_id = f"{chapter_title.lower().replace(' ', '_').replace('/', '_')[:40]}_p{i+1}"
        
        result.append({
            'title': title,
            'id': re.sub(r'[^a-z0-9_]', '', page_id),
            'content': page['content'],
            'word_count': page['word_count'],
            'page_number': i + 1,
            'total_pages': total_pages,
            'original_chapter': chapter_title
        })
    
    return result

def process_course(input_file: str, output_file: str):
    """Process a course file and split chapters into pages."""
    with open(input_file, 'r') as f:
        course = json.load(f)
    
    all_pages = []
    for chapter in course['chapters']:
        pages = split_into_pages(chapter['content'], chapter['title'])
        all_pages.extend(pages)
        print(f"  {chapter['title']}: split into {len(pages)} pages")
    
    # Update course structure
    course['chapters'] = all_pages
    course['totalChapters'] = len(all_pages)
    course['description'] += f" ({len(all_pages)} pages)"
    
    with open(output_file, 'w') as f:
        json.dump(course, f, indent=2, ensure_ascii=False)
    
    return len(all_pages)

def main():
    print("📖 Splitting courses into book-sized pages...")
    print(f"   Target: ~{TARGET_WORDS_PER_PAGE} words per page\n")
    
    courses_dir = '.'
    public_dir = '../public/courses'
    
    # Process Florida Laws
    print("Florida Laws:")
    fl_pages = process_course(
        f'{courses_dir}/florida_laws_formatted.json',
        f'{public_dir}/florida_laws.json'
    )
    
    # Process Review Notes  
    print("\nReview Notes:")
    rn_pages = process_course(
        f'{courses_dir}/review_notes_formatted.json',
        f'{public_dir}/review_notes.json'
    )
    
    print(f"\n✅ Done!")
    print(f"   Florida Laws: {fl_pages} pages")
    print(f"   Review Notes: {rn_pages} pages")
    print(f"   Total: {fl_pages + rn_pages} pages")

if __name__ == '__main__':
    main()
