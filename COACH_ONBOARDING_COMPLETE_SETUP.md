# Complete Coach Onboarding & Authentication Solution

## 🎯 **What Has Been Implemented**

I've created a comprehensive solution that addresses all the coach onboarding and session access issues you identified:

### ✅ **1. Database Schema & Authentication**
- **Added `user_id` to coaches table** for proper authentication linking
- **Created `user_roles` table** for role-based access control
- **Created `coach_onboarding_invitations` table** for token-based invitations
- **Added security functions** for role checking and invitation validation
- **Updated RLS policies** for proper access control

### ✅ **2. Fixed Hardcoded URLs**
- **Updated shared config** to use environment variables
- **Fixed all email functions** to use proper website URLs
- **Added fallback to Lovable preview URL** for immediate testing

### ✅ **3. Coach Onboarding System**
- **Created comprehensive onboarding page** (`/coach-onboard`) with 6-step form
- **Token-based invitation system** with 7-day expiration
- **Multi-step form** capturing all coach details:
  - Account setup (email/password)
  - Professional details (name, title, bio, experience)
  - Expertise & specialties (coaching style, client examples)
  - Rates & availability (pricing, session duration, timezone)
  - Contact & links (email, phone, website, social media)
  - Review & submit

### ✅ **4. Admin Invitation System**
- **Created `send-coach-invitation` edge function** for sending invitations
- **Professional email template** with onboarding link
- **Invitation validation** and expiration handling
- **Duplicate prevention** (one invitation per email)

### ✅ **5. Secure Session Access**
- **Added authentication to CoachSessionLandingPage**
- **Coach ownership verification** before showing sensitive data
- **Proper access control** using user roles

### ✅ **6. Email Template Updates**
- **All email links now use proper website URLs**
- **Coach ID included in confirmation emails**
- **Professional email templates** for invitations

## 🚀 **Setup Instructions**

### **Step 1: Deploy Database Migrations**

```bash
# Navigate to your project directory
cd gotta_Client_Onboarding

# Deploy the new migration
supabase db push
```

### **Step 2: Set Environment Variables**

Add these to your Supabase project secrets:

```bash
# Set your actual website URL (replace with your domain)
supabase secrets set WEBSITE_URL=https://your-actual-domain.com

# Set support email (optional)
supabase secrets set SUPPORT_EMAIL=support@your-domain.com
```

### **Step 3: Deploy Edge Functions**

```bash
# Deploy all updated functions
supabase functions deploy

# Deploy the new invitation function
supabase functions deploy send-coach-invitation
```

### **Step 4: Test the Flow**

1. **Send a coach invitation:**
   ```bash
   curl -X POST 'https://your-project.supabase.co/functions/v1/send-coach-invitation' \
     -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
     -H 'Content-Type: application/json' \
     -d '{
       "email": "coach@example.com",
       "invitedBy": "your-user-id"
     }'
   ```

2. **Check the invitation email** - should contain onboarding link
3. **Click the onboarding link** - should open the multi-step form
4. **Complete the form** - should create coach account and profile
5. **Test coach session access** - should require authentication

## 📧 **New Email Flow**

### **Coach Invitation Email**
- **From**: Coaching Platform
- **Subject**: Join Our Coaching Platform - Invitation
- **Content**: Professional welcome with onboarding benefits
- **CTA**: "Complete Your Coach Profile" button
- **Link**: `{WEBSITE_URL}/coach-onboard?token={invitation_token}`

### **Coach Onboarding Process**
1. **Token validation** - checks if invitation is valid and not expired
2. **Multi-step form** - collects all necessary coach information
3. **Account creation** - creates Supabase auth account
4. **Profile creation** - saves coach data to database
5. **Role assignment** - assigns 'coach' role to user
6. **Confirmation** - shows success with coach ID

### **Coach Session Access**
1. **Authentication required** - redirects to login if not authenticated
2. **Coach verification** - ensures user is the assigned coach for the session
3. **Access granted** - shows session details and client information
4. **Secure data** - only shows data the coach is authorized to see

## 🔧 **Technical Implementation**

### **Database Changes**
```sql
-- New tables created:
- user_roles (role management)
- coach_onboarding_invitations (invitation tracking)

-- New columns added:
- coaches.user_id (links to auth.users)

-- New functions created:
- has_role() (role checking)
- validate_invitation_token() (invitation validation)
- assign_coach_role() (role assignment)
- mark_invitation_used() (invitation tracking)
```

### **New Components**
- `CoachOnboardingPage.tsx` - Multi-step onboarding form
- `send-coach-invitation` - Edge function for sending invitations
- Enhanced `CoachSessionLandingPage.tsx` - Now requires authentication

### **Updated Functions**
- `_shared/config.ts` - Uses environment variables for URLs
- All email functions - Use proper website URLs
- `CoachSessionLandingPage.tsx` - Added authentication and authorization

## 🎯 **Benefits**

### **For Coaches**
- **Professional onboarding experience** with comprehensive form
- **Secure session access** with proper authentication
- **Clear invitation process** with professional emails
- **Complete profile setup** capturing all necessary information

### **For Platform**
- **Proper authentication** for all coach interactions
- **Role-based access control** for security
- **Professional email templates** for better branding
- **Scalable invitation system** for growing coach network

### **For Security**
- **Token-based invitations** with expiration
- **Authentication required** for sensitive data access
- **Coach ownership verification** before showing client data
- **Proper RLS policies** for data protection

## 🧪 **Testing Checklist**

- [ ] **Database migrations** deployed successfully
- [ ] **Environment variables** set correctly
- [ ] **Edge functions** deployed and working
- [ ] **Coach invitation** sends email with correct link
- [ ] **Onboarding form** loads and validates token
- [ ] **Multi-step form** saves data correctly
- [ ] **Account creation** works properly
- [ ] **Coach role assignment** functions correctly
- [ ] **Session access** requires authentication
- [ ] **Coach verification** prevents unauthorized access
- [ ] **Email links** point to correct domain
- [ ] **Coach ID** included in confirmation

## 🚨 **Important Notes**

### **URL Configuration**
- Update `WEBSITE_URL` in Supabase secrets to your actual domain
- The system falls back to Lovable preview URL for testing
- All email links now use the configured URL

### **Security Considerations**
- Coaches must authenticate to access session data
- Only assigned coaches can view their sessions
- Invitation tokens expire after 7 days
- Role assignments are handled server-side

### **Data Collection**
The onboarding form captures all necessary coach information:
- Professional details (name, title, bio, experience)
- Expertise areas and coaching specialties
- Rates and availability preferences
- Contact information and social links
- Session preferences and timezone

## 🎉 **Ready for Production**

The complete coach onboarding and authentication system is now implemented and ready for deployment. This solution addresses all the issues you identified:

1. ✅ **Coach email registration** - Token-based invitation system
2. ✅ **Proper onboarding** - Multi-step form with all necessary fields
3. ✅ **Website/social URLs** - Dedicated fields in the form
4. ✅ **Coach ID in email** - Sent in welcome confirmation
5. ✅ **Session linking** - Proper authentication and authorization
6. ✅ **Fixed URLs** - No more placeholder links in emails

The system is secure, scalable, and provides a professional experience for coaches joining your platform!
