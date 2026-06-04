# 🚗 Grandlab MIA — Sales Assistant Web App

## Deploy to Vercel in 5 Steps

### Step 1: Get Your Anthropic API Key
1. Go to https://console.anthropic.com
2. Sign up / log in
3. Click **API Keys** → **Create Key**
4. Copy the key (starts with `sk-ant-...`)

### Step 2: Upload to GitHub
1. Go to https://github.com → sign up free
2. Click **New Repository** → name it `grandlab-mia` → Create
3. Click **uploading an existing file**
4. Drag and drop ALL these files into GitHub
5. Click **Commit changes**

### Step 3: Deploy on Vercel
1. Go to https://vercel.com → sign up with GitHub
2. Click **Add New Project**
3. Select your `grandlab-mia` repository
4. Click **Deploy** (Vercel auto-detects Next.js)

### Step 4: Add Your API Key
1. In Vercel, go to your project → **Settings** → **Environment Variables**
2. Add these:
   - Name: `ANTHROPIC_API_KEY` → Value: `sk-ant-your-key-here`
3. Click **Save** → **Redeploy**

### Step 5: Share with Your Team
Your app is live at: `grandlab-mia.vercel.app`
Share this URL with all your sales advisors!

---

## Admin Credentials
| Username | Password |
|----------|----------|
| grandlab.admin | MIA@2024gl |
| jimmy | GL@jimmy88 |

---

## What Each Person Can Do
- **Sales Advisor**: Chat with MIA, get 3-language replies
- **Admin**: Everything above + edit Knowledge Base + upload media

---

## Estimated Cost
- Vercel hosting: **FREE**
- Anthropic API: ~**RM20-50/month** for a full team (very cheap)
