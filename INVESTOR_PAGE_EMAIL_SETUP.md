# Investor Page Email Setup Guide

## Quick Summary

The investor page now has:
- ✅ **PDF Carousel** - Shows all pages from `Investor Pitch.pdf`
- ✅ **Pipedrive Scheduler** - "Book a Call" buttons open meeting scheduler modal
- ✅ **Prototype Request Form** - Sends email to `play@dashdice.gg`

## Pitch Deck Buttons

Both pitch deck buttons are already working:

1. **Download Pitch Deck** (Header) - Downloads `/public/investor-pitch.pdf`
2. **View Full Deck** - Opens PDF in new tab
3. **Download Full Deck** - Downloads PDF with custom filename

## Email Setup (Resend)

To receive prototype request emails at `play@dashdice.gg`:

### 1. Sign up for Resend (Free)
- Go to https://resend.com
- Sign up with GitHub or email
- Free tier: 100 emails/day, 3,000 emails/month

### 2. Get Your API Key
- Go to https://resend.com/api-keys
- Click "Create API Key"
- Give it a name: "DashDice Investor Portal"
- Copy the API key (starts with `re_`)

### 3. Add API Key to Environment
Open `.env.local` and replace:
```bash
RESEND_API_KEY=your_resend_api_key_here
```

With your actual key:
```bash
RESEND_API_KEY=re_abc123xyz...
```

### 4. Verify Your Domain (Optional but Recommended)

**For Production:**
1. In Resend dashboard, go to "Domains"
2. Click "Add Domain"
3. Enter: `dashdice.gg`
4. Add the provided DNS records to your domain
5. Once verified, update the API route at:
   `src/app/api/send-prototype-request/route.ts`

Change line 31:
```typescript
from: 'DashDice Investor Portal <onboarding@resend.dev>',
```

To:
```typescript
from: 'DashDice Investor Portal <noreply@dashdice.gg>',
```

**For Development:**
- Keep using `onboarding@resend.dev` (works for testing)
- Emails will still be delivered to `play@dashdice.gg`

### 5. Test the Form

1. Go to http://localhost:3000/investors
2. Enter password: `dashdice2025`
3. Scroll to "Prototype Access"
4. Click "Request Prototype Access"
5. Fill out the form and submit

You should receive an email at `play@dashdice.gg` with:
- Contact name
- Firm name
- Email address
- Referral source
- Notes (if provided)

## Troubleshooting

### No Email Received?

1. **Check API Key**: Make sure `RESEND_API_KEY` is set in `.env.local`
2. **Restart Dev Server**: After changing `.env.local`, restart with `npm run dev`
3. **Check Console**: Look for errors in the terminal or browser console
4. **Verify Email**: Emails go to `play@dashdice.gg` - check spam folder
5. **Resend Dashboard**: Go to https://resend.com/emails to see delivery status

### Form Not Submitting?

1. **Check Network Tab**: Open browser DevTools → Network tab
2. **Look for 500 Error**: If you see "Failed to process request", API key might be wrong
3. **Check Console**: Error messages will appear in browser console

### Email Sends but Doesn't Arrive?

1. **Check Spam Folder**: Resend emails might go to spam initially
2. **Verify Recipient**: Confirm `play@dashdice.gg` is correct
3. **Resend Logs**: Check https://resend.com/emails for delivery status
4. **Domain Verification**: For production, verify your domain (see above)

## Alternative: No Email Service Setup

If you don't want to set up Resend immediately:

The form will still work and show a success message. The data will be:
1. Logged to the server console (check terminal)
2. You can add Firebase storage to save requests
3. Use a webhook service like Zapier or Make.com

To add Firebase storage, update:
`src/app/api/send-prototype-request/route.ts`

```typescript
// After line 57, add:
import { getFirestore } from 'firebase-admin/firestore';

// In the try block, add:
const db = getFirestore();
await db.collection('prototype_requests').add({
  ...body,
  timestamp: new Date().toISOString()
});
```

## Production Deployment

Before deploying to production:

1. **Add Environment Variable to Vercel**:
   - Go to Vercel Dashboard
   - Select your project
   - Settings → Environment Variables
   - Add: `RESEND_API_KEY` = `re_your_api_key`

2. **Verify Domain in Resend** (recommended)
   - Adds sender reputation
   - Improves deliverability
   - Custom from address

3. **Update Email Template** (optional)
   - Edit `src/app/api/send-prototype-request/route.ts`
   - Customize the HTML email content
   - Add company branding

## Current Status

✅ PDF carousel working with all pages
✅ Pipedrive scheduler modal integrated
✅ Prototype request form with validation
✅ Email API endpoint created
✅ Success/error states implemented
✅ Form reset after submission

🔧 **To Complete:**
1. Add Resend API key to `.env.local`
2. Test form submission
3. (Optional) Verify domain for production

## Support

For Resend support:
- Docs: https://resend.com/docs
- Support: https://resend.com/support
- Status: https://resend.com/status
