# Coach Email Setup Guide

This guide will help you fix the email linking issues and set up proper coach session flow.

## 🚨 **Issues Fixed:**

1. **✅ Email URLs Updated**: Changed from Lovable URLs to your actual website
2. **✅ Coach Response Flow**: Created proper coach response pages
3. **✅ Session Landing Page**: Added coach session dashboard
4. **✅ Dynamic Messages**: Coach gets contextual information
5. **✅ Session Notes**: Coaches can save notes before/during sessions

## 🔧 **Setup Steps:**

### Step 1: Update Your Website URL

Replace `https://your-actual-website.com` in these files with your actual domain:

**Files to update:**
- `supabase/functions/_shared/config.ts`
- `supabase/functions/handle-coach-response/index.ts`
- `supabase/functions/send-connection-notification/index.ts`
- `supabase/functions/send-enhanced-coach-notification/index.ts`
- `supabase/functions/send-session-reminders/index.ts`

**Example:**
```typescript
// Replace this:
const baseUrl = 'https://your-actual-website.com';

// With your actual domain:
const baseUrl = 'https://yourdomain.com';
```

### Step 2: Deploy Your Changes

```bash
# Deploy Supabase functions
supabase functions deploy

# Deploy database migrations
supabase db push

# Deploy your frontend (if using Lovable, this happens automatically)
```

### Step 3: Test the Flow

1. **Create a test session** as a client
2. **Check the coach email** - links should now go to your website
3. **Click an action button** in the email
4. **Verify the coach response page** loads correctly
5. **Accept a session** and verify the coach landing page works

## 📧 **New Email Flow:**

### First Email (Session Request)
- **From**: Coaching Platform
- **To**: Coach
- **Action Buttons**: Accept, Accept in 5min, Accept in 10min, Reschedule, Decline
- **Links**: Now point to `/coach-response?action=accept&sessionId=...`

### Second Email (After Acceptance)
- **From**: Coaching Platform  
- **To**: Coach
- **Content**: Session details and preparation info
- **Link**: Points to `/coach-session/{sessionId}` (coach dashboard)

## 🎯 **New Pages Created:**

### 1. `/coach-response` - Coach Response Page
- **Purpose**: Dynamic page showing session details and action buttons
- **Features**: 
  - Session information display
  - Client details
  - Confirmation before action
  - Success/error handling

### 2. `/coach-session/{sessionId}` - Coach Session Landing Page
- **Purpose**: Coach dashboard for session management
- **Features**:
  - Session details and client info
  - Session notes (save/load)
  - Start video session button
  - Client assessment responses
  - Session tips and preparation

## 🔄 **Updated Flow:**

```
Client books session
    ↓
Coach receives email (with your website links)
    ↓
Coach clicks action button → Goes to your website
    ↓
Coach sees dynamic response page with session details
    ↓
Coach confirms action → Calls Supabase function
    ↓
If accepted → Redirects to coach session landing page
    ↓
Coach can view session details, take notes, start video
```

## 🛠 **Technical Details:**

### Database Changes:
- **`session_events`** table - tracks all webhook events
- **`session_notes`** table - stores coach notes per session

### New Functions:
- **`daily-webhook-handler`** - processes Daily.co events
- **`setup-daily-webhooks`** - configures webhooks

### New Components:
- **`DailyCoVideoCall`** - proper video integration
- **`useDailyCo`** - Daily.co SDK hook

## 🧪 **Testing Checklist:**

- [ ] Coach emails link to your website (not Lovable)
- [ ] Coach response page loads with session details
- [ ] Accept/decline actions work correctly
- [ ] Coach session landing page shows client info
- [ ] Session notes save/load properly
- [ ] Video session starts correctly
- [ ] Daily.co webhooks are configured
- [ ] Sessions appear in Daily.co dashboard

## 📞 **Support:**

If you encounter issues:
1. Check the browser console for errors
2. Verify your website URL is correct in all functions
3. Ensure Supabase functions are deployed
4. Test with a fresh session booking

## 🎉 **Benefits:**

- **✅ Professional Experience**: Coaches see your branded website
- **✅ Better Engagement**: Dynamic pages with session context
- **✅ Session Management**: Notes and preparation tools
- **✅ Proper Tracking**: All events logged in database
- **✅ Video Integration**: Real WebRTC connections with Daily.co
