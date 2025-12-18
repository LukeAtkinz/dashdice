# DashDice Investor Landing Page

## Access

**URL:** `/investors`

**Password:** `dashdice2025` (change in `page.tsx` line 12)

## Features

✅ Password protected (session-based)
✅ No search engine indexing (robots meta tags)
✅ Mobile responsive
✅ Clean, minimal design
✅ All external links open in new tabs
✅ Fast loading (no heavy media)

## Page Sections

1. **Header** - Title, positioning, CTA buttons
2. **Founder Video** - 3-min introduction (placeholder)
3. **Gameplay Video** - 1-2 min prototype demo (placeholder)
4. **Pitch Deck** - 12-slide carousel + PDF download
5. **Prototype Access** - Gated request form
6. **Key Documents** - 5 PDF documents (placeholders)
7. **Advisors** - Profile cards (placeholders)
8. **Credibility Signals** - LOIs and traction bullets
9. **Contact/CTA** - Email and calendar links
10. **Footer** - Auto-updating timestamp

## Customization Guide

### Change Password
```typescript
// Line 12 in page.tsx
const INVESTOR_PASSWORD = 'your-secure-password-here';
```

### Update Links

**Pitch Deck PDF:**
- Line 56: View Full Deck
- Line 62: Download Full Deck
- Lines 303-313: Download buttons

**Calendar/Email:**
- Line 68: Book a Call (header)
- Line 474: Email link (update `mailto:`)
- Line 485: Book a Call (footer)

### Add Videos

**Founder Introduction (Line 96):**
```tsx
{/* Replace placeholder div with: */}
<iframe
  className="w-full aspect-video rounded-lg"
  src="https://www.youtube.com/embed/YOUR_VIDEO_ID"
  title="Founder Introduction"
  frameBorder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowFullScreen
/>
```

**Gameplay Video (Line 118):**
```tsx
{/* Same format as above */}
```

### Add Pitch Deck Images

Replace carousel placeholder (lines 137-145) with actual slides:

```tsx
<img
  src={`/pitch-deck/slide-${currentSlide + 1}.png`}
  alt={`Slide ${currentSlide + 1}`}
  className="w-full h-full object-contain"
/>
```

Upload slides to: `/public/pitch-deck/slide-1.png` through `slide-12.png`

### Update Advisor Profiles

Edit the advisors array starting at line 389:

```typescript
{
  name: 'Jane Smith',
  credential: 'Former VP Product at Epic Games',
  advises: 'Product strategy and game design'
}
```

### Update Documents

Edit the documents array starting at line 325:

```typescript
{
  title: 'Go-To-Market Overview',
  description: 'Your description here'
}
```

Link to actual PDFs by updating `href="#"` to `href="/documents/filename.pdf"`

### Update Credibility Signals

Edit lines 420-434 to add your traction metrics.

### Prototype Access Form

The form currently displays on button click. To connect to a backend:

1. Add form submission handler (line 230)
2. POST to your API endpoint
3. Show success/error message

Example:
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const response = await fetch('/api/prototype-request', {
    method: 'POST',
    body: JSON.stringify(formData)
  });
  // Handle response
};
```

## Deployment Notes

### Environment Variables
None required for basic functionality.

### Build
```bash
npm run build
```

### Production
The page uses:
- Server-side rendering (Next.js)
- Session storage for auth (client-side only)
- Auto-updating timestamp

### Security Recommendations

1. **Change the password** before deployment
2. **Use environment variable** for password:
   ```typescript
   const INVESTOR_PASSWORD = process.env.NEXT_PUBLIC_INVESTOR_PASSWORD;
   ```
3. **Add rate limiting** to prevent brute force
4. **Consider JWT tokens** for better session management
5. **Add backend authentication** for production use

### Advanced Security (Optional)

For production, consider implementing:

1. **Backend authentication:**
```typescript
// API route: /app/api/investor-auth/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { password } = await request.json();
  
  if (password === process.env.INVESTOR_PASSWORD) {
    // Generate JWT token
    const token = generateToken();
    return NextResponse.json({ token });
  }
  
  return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
}
```

2. **Middleware protection:**
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/investors')) {
    // Check for valid token
    const token = request.cookies.get('investor_token');
    if (!token) {
      // Redirect or return 401
    }
  }
}
```

## Mobile Optimization

The page is fully responsive with:
- Fluid typography
- Flexible grid layouts
- Touch-friendly buttons
- Optimized spacing

## Performance

- No animations (intentional)
- No autoplay media
- Lazy loading ready
- Optimized images (when added)
- Fast initial load

## Browser Support

Tested and working on:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Content Checklist

Before launch, replace all placeholders:

- [ ] Password changed
- [ ] Positioning statement
- [ ] Founder introduction video
- [ ] Gameplay video  
- [ ] Pitch deck slides (12)
- [ ] Pitch deck PDF link
- [ ] Calendar booking link
- [ ] Email address
- [ ] Document PDFs (5)
- [ ] Advisor profiles (4+)
- [ ] Credibility signals
- [ ] LOI count/details

## Support

For technical issues or customization help, refer to:
- Next.js documentation: https://nextjs.org/docs
- Tailwind CSS: https://tailwindcss.com/docs
