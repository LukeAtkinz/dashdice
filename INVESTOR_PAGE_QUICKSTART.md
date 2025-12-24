# DashDice Investor Page - Quick Start

## 🚀 Access the Page

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to: **http://localhost:3000/investors**

3. Enter password: **dashdice2025**

## 📋 Page Preview

```
┌─────────────────────────────────────────────────┐
│  DASHDICE                                       │
│  [One sentence positioning statement]          │
│  [Download Pitch Deck] [Book a Call]          │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Founder Introduction (3 mins)                  │
│  ┌─────────────────────────────────────────┐   │
│  │      [Video Player Placeholder]         │   │
│  │            ▶️ Play Button                │   │
│  └─────────────────────────────────────────┘   │
│  A short introduction to DashDice...            │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Prototype Gameplay (1-2 mins)                  │
│  ┌─────────────────────────────────────────┐   │
│  │      [Video Player Placeholder]         │   │
│  └─────────────────────────────────────────┘   │
│  Short raw gameplay from prototype...           │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Pitch Deck                                     │
│  ┌─────────────────────────────────────────┐   │
│  │ ◀        Slide 1 of 12          ▶      │   │
│  │      [Slide Placeholder]                │   │
│  └─────────────────────────────────────────┘   │
│  ● ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○  (indicators)      │
│  [View Full Deck] [Download Full Deck]         │
│  Carousel shows key slides; full deck as PDF    │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Prototype Access                               │
│  Prototype access is available on request...   │
│  [Request Prototype Access] ← Expands form     │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Key Documents                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Go-To-   │ │Financial │ │Monetis-  │       │
│  │ Market   │ │  Model   │ │ ation    │       │
│  │ Overview │ │ Summary  │ │ Overview │       │
│  │ [Open]   │ │ [Open]   │ │ [Open]   │       │
│  └──────────┘ └──────────┘ └──────────┘       │
│  ┌──────────┐ ┌──────────┐                    │
│  │    AI    │ │Competit- │                    │
│  │  Comms   │ │   ive    │                    │
│  │ Overview │ │  Thesis  │                    │
│  │ [Open]   │ │ [Open]   │                    │
│  └──────────┘ └──────────┘                    │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Advisors                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │[Name]    │ │[Name]    │ │[Name]    │       │
│  │Former VP │ │Ex-Head   │ │Former    │       │
│  │at...     │ │of Growth │ │CTO at... │       │
│  │Advises:  │ │Advises:  │ │Advises:  │       │
│  │Product   │ │Growth    │ │Tech      │       │
│  └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Credibility Signals                            │
│  ✓ 12 signed LOIs from world-class designers   │
│  ✓ [Second signal placeholder]                 │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Next Steps                                     │
│  If this is relevant to your investment...      │
│  [📧 Email] [📅 Book a Call]                   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Last updated: December 18, 2025               │
└─────────────────────────────────────────────────┘
```

## ⚡ Quick Customization

### 1. Change Password (Before Deployment!)
```typescript
// src/app/investors/page.tsx - Line 12
const INVESTOR_PASSWORD = 'your-secure-password';
```

### 2. Update Main CTA Links
```typescript
// Line 56 - Pitch Deck PDF
href="/path/to/pitch-deck.pdf"

// Line 68 - Calendar Booking
href="https://calendly.com/your-link"
```

### 3. Add Your Videos
```tsx
// Replace lines 96-108 with:
<iframe
  className="w-full aspect-video rounded-lg"
  src="https://www.youtube.com/embed/VIDEO_ID"
  title="Founder Introduction"
  allowFullScreen
/>
```

### 4. Update Contact Email
```typescript
// Line 474
href="mailto:your.email@dashdice.com"
```

## 🎨 Design System

### Colors
- Primary: `gray-900` (near black)
- Background: `white`
- Accent: `gray-50/100` (light backgrounds)
- Borders: `gray-200`
- Text: `gray-600/700/900`

### Typography
- H1: `text-5xl font-bold` (48px)
- H2: `text-3xl font-bold` (30px)
- H3: `text-lg font-semibold` (18px)
- Body: `text-base` (16px)
- Small: `text-sm` (14px)

### Spacing
- Section margin: `mb-20` (5rem / 80px)
- Card padding: `p-6` (1.5rem / 24px)
- Button padding: `px-6 py-3`
- Gap between items: `gap-4/6`

### Components
- Cards: `border border-gray-200 rounded-lg`
- Buttons: `rounded-lg font-medium`
- Inputs: `border border-gray-300 rounded-lg`

## 📱 Mobile Responsive

The page automatically adapts:

**Desktop (1200px+):**
- 3-column grid for documents/advisors
- Full-width carousel
- Side-by-side buttons

**Tablet (768px - 1200px):**
- 2-column grid
- Maintained carousel
- Stacked buttons

**Mobile (< 768px):**
- Single column
- Full-width elements
- Touch-friendly spacing

## 🔒 Security Notes

**Current Implementation:**
- Client-side password check
- Session storage (clears on browser close)
- No backend required

**For Production:**
1. Move password to environment variable
2. Add backend API authentication
3. Use JWT tokens instead of session storage
4. Add rate limiting
5. Log access attempts

## 📊 Analytics (Optional)

Add tracking to monitor investor engagement:

```typescript
// Add to page.tsx
useEffect(() => {
  // Track page view
  analytics.track('Investor Page View');
}, []);

// Track button clicks
const handlePitchDeckDownload = () => {
  analytics.track('Pitch Deck Downloaded');
  window.open('/pitch-deck.pdf', '_blank');
};
```

## 🚢 Deployment Checklist

Before going live:

- [ ] Change password from default
- [ ] Add real founder video
- [ ] Add gameplay video
- [ ] Upload pitch deck slides (12 images)
- [ ] Link pitch deck PDF
- [ ] Add calendar booking link
- [ ] Update email address
- [ ] Upload all document PDFs
- [ ] Fill in advisor profiles
- [ ] Update credibility signals
- [ ] Update positioning statement
- [ ] Test on mobile device
- [ ] Test all links open in new tab
- [ ] Verify no indexing (robots.txt)

## 💡 Advanced Features (Optional)

### Email Integration
```typescript
// Connect prototype request form to email service
const handleSubmit = async (formData) => {
  await fetch('/api/send-email', {
    method: 'POST',
    body: JSON.stringify(formData)
  });
};
```

### Video Analytics
Track video engagement:
```typescript
<iframe
  onLoad={() => analytics.track('Video Loaded')}
  // Add event listeners for play, pause, complete
/>
```

### Slide Tracking
Monitor which slides get the most views:
```typescript
const handleSlideChange = (slideIndex) => {
  analytics.track('Slide Viewed', { slideNumber: slideIndex + 1 });
  setCurrentSlide(slideIndex);
};
```

## 🆘 Troubleshooting

**Page won't load:**
- Check Next.js dev server is running
- Navigate to http://localhost:3000/investors

**Password not working:**
- Default is: `dashdice2025`
- Check line 12 in page.tsx

**Styles look broken:**
- Ensure Tailwind CSS is configured
- Check if globals.css is imported

**Links don't work:**
- All links are placeholders (`href="#"`)
- Update with real URLs before deployment

## 📞 Support

For questions or issues, refer to the main README: `INVESTOR_PAGE_README.md`
