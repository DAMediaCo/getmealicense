# GetMeALicense - Client Setup Guide

Welcome! This guide will walk you through setting up your GetMeALicense training platform. The process takes about 15-20 minutes.

---

## What You'll Need

- Your GoDaddy account login (for your domain)
- An email address for your Vercel account
- A credit card for Vercel Pro ($20/month)

---

## Step 1: Create Your Vercel Account

Vercel hosts your training website. It's fast, reliable, and easy to use.

1. Go to **[vercel.com](https://vercel.com)**
2. Click **"Sign Up"** (top right)
3. Choose **"Continue with Email"**
4. Enter your email address and create a password
5. Verify your email (check inbox for confirmation link)
6. Once logged in, you're ready for the next step

---

## Step 2: Accept Our Project Invitation

We'll send you an email invitation to join the GetMeALicense project.

1. Check your email for an invitation from Vercel
2. Click **"Accept Invitation"**
3. The project will appear in your Vercel dashboard
4. Click on the project → you'll see it's already deployed!

Your temporary URL will be something like: `getmealicense-yourcompany.vercel.app`

---

## Step 3: Upgrade to Vercel Pro

The Pro plan ($20/month) is required for custom domains and better performance.

1. In Vercel, click your profile icon (top right)
2. Click **"Settings"**
3. Select **"Billing"** from the left menu
4. Click **"Upgrade to Pro"**
5. Enter your payment information
6. Done! Your account is now Pro

---

## Step 4: Connect Your Domain (GoDaddy)

Now we'll point your domain (e.g., `yourcompany.com`) to your new site.

### Part A: Add Domain in Vercel

1. Go to your project in Vercel
2. Click **"Settings"** (top menu)
3. Click **"Domains"** (left menu)
4. Type your domain name (e.g., `training.yourcompany.com` or `yourcompany.com`)
5. Click **"Add"**
6. Vercel will show you DNS records to configure — **keep this page open!**

### Part B: Update DNS in GoDaddy

1. Go to **[godaddy.com](https://godaddy.com)** and log in
2. Click **"My Products"** (top menu, under your name)
3. Find your domain and click **"DNS"** (or "Manage DNS")
4. You'll see a list of DNS records

**If using your main domain (yourcompany.com):**

| Type | Name | Value |
|------|------|-------|
| A | @ | `76.76.21.21` |
| CNAME | www | `cname.vercel-dns.com` |

**If using a subdomain (training.yourcompany.com):**

| Type | Name | Value |
|------|------|-------|
| CNAME | training | `cname.vercel-dns.com` |

### How to Edit in GoDaddy:

1. Find the existing A record for `@` → Click the pencil icon → Change the value to `76.76.21.21` → Save
2. Find or add a CNAME record for `www` → Set value to `cname.vercel-dns.com` → Save

### Part C: Verify in Vercel

1. Go back to Vercel (Domains settings)
2. Wait 5-30 minutes for DNS to propagate
3. Vercel will automatically detect the changes
4. You'll see a green checkmark when it's working!

---

## Step 5: Test Your Site

1. Open a new browser tab
2. Go to your domain (e.g., `https://yourcompany.com`)
3. You should see the GetMeALicense login page
4. Try logging in with the manager account we created for you

---

## You're Done! 🎉

Your training platform is now live at your custom domain.

---

## Troubleshooting

**"DNS not configured correctly" in Vercel:**
- DNS changes can take up to 48 hours (usually 5-30 minutes)
- Double-check the values in GoDaddy match exactly
- Make sure there are no extra spaces

**"This site can't be reached":**
- Wait a few more minutes for DNS propagation
- Try clearing your browser cache (Ctrl+Shift+R)
- Try a different browser or incognito mode

**Can't find DNS settings in GoDaddy:**
- Log in → My Products → Find domain → Click "DNS" button
- Or search "DNS" in GoDaddy's help search

---

## Need Help?

Contact us and we'll walk you through it:
- Email: [YOUR SUPPORT EMAIL]
- Phone: [YOUR SUPPORT PHONE]

We're happy to do a quick screen share if you get stuck!

---

*GetMeALicense - Professional Exam Prep Training*
