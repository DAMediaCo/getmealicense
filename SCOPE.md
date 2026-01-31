# GetMeALicense.com - Project Scope

**Domain:** getmealicense.com
**Type:** Internal employee training website for insurance exam prep
**Start Time:** 2026-01-29 11:30 PM EST

---

## Overview
NOT a public signup site. All user accounts created by managers only.

## Exams Covered
- Florida 2-15 (Life, Health, Annuities)
- Florida 2-40 (Health Only)
- Arizona Life and Health Producer

## User Roles

### Student (Employee)
- Cannot self-register
- Receives email invite from manager
- Clicks invite link to set password and activate account
- Features:
  - Multiple choice practice quizzes
  - Timed practice exams with pause/resume
  - Flashcard review system
  - Study guides organized by topic
  - Resume functionality (remembers last activity and position)
  - View personal progress and scores

### Manager
- Secure login to backend dashboard
- Creates student accounts
- Assigns exams to students
- Sends email invites
- Disables or resets accounts
- Dashboard shows:
  - List of all users
  - Completion percentage per user
  - Overall grade/readiness score per user
  - Accuracy by topic
  - Last activity date
  - Drill-down into individual user performance

---

## Content Structure

### Questions
- Exam association (FL 2-15, FL 2-40, AZ)
- Topic and subtopic tags
- Multiple choice with 4 options
- Correct answer marked
- Explanation for correct answer

### Flashcards
- Linked to topics/subtopics
- Front text (term or question)
- Back text (definition or answer)
- Track user mastery level

### Study Guides
- Organized by exam and topic
- Markdown content
- Linked to related questions and flashcards

---

## Progress Tracking

### Completion Percentage
Based on:
- Questions answered correctly (not just viewed)
- Flashcards mastered (not just seen)
- Study guides marked complete

### Readiness Score
- Weighted by topic importance
- Rolling accuracy on recent questions
- Clear indicators: on track, needs attention, struggling, inactive

---

## Tech Stack
- Next.js 14+ with App Router
- TypeScript
- Tailwind CSS + shadcn/ui
- Prisma ORM
- PostgreSQL (Supabase)
- NextAuth.js for authentication
- Resend for transactional email
- Deploy to Vercel

---

## Database Tables
- users
- exams
- topics
- subtopics
- questions
- answer_options
- flashcards
- study_guides
- user_exam_assignments
- quiz_sessions
- question_responses
- flashcard_progress
- study_guide_progress
- user_resume_state

---

## Auth Flow
1. Manager creates user (email, name, assigns exams)
2. System generates invite token, sends email
3. Employee clicks link, sets password
4. Account activates, employee can log in
5. Manager can resend invite or disable account

---

## Key Features
1. Invite-only registration flow
2. Role-based access (manager vs student routes)
3. Quiz engine with immediate feedback and explanations
4. Timed exam mode with working timer and pause/resume
5. Flashcard system with spaced repetition (mastery levels 0-5)
6. Study guide viewer with markdown rendering
7. Resume state that remembers exactly where user left off
8. Manager analytics dashboard with user drill-down
9. Progress and readiness score calculations
10. Mobile responsive design

---

## Seed Data Required
- 1 sample flashcard for FL 2-15
- At least 5 sample questions per exam with explanations

---

## Client Deployment Model

**Client provides domain + Vercel hosting. We handle everything else.**

### What the Client Provides
- Their own domain (parked on GoDaddy)
- Their own Vercel account (Pro plan - $20/month)

### What We Provide (Shared Infrastructure)
- Supabase database (our account)
- Resend email API (our account)
- GitHub repo access
- All backend services

### Onboarding Process
1. Client creates Vercel account at vercel.com
2. We deploy the app to their Vercel
3. We configure env vars pointing to our Supabase/Resend
4. Client points domain DNS from GoDaddy → Vercel
5. We create their manager account in our DB
6. Done - they're live

### Benefits
- Simple for client (just domain + $20/mo Vercel)
- We control the infrastructure
- Easy to support/update across clients
- Predictable cost model

---

## Status
- [x] Credentials received
- [x] Project initialized
- [x] Database schema created
- [x] Auth flow implemented
- [x] Student features built
- [x] Manager dashboard built
- [x] Deployed to Vercel (demo instance)
- [ ] Domain connected
- [ ] Client onboarding documentation
