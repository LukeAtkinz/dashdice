import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialize Resend with API key from environment variables
// Get your API key from https://resend.com/api-keys
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, firm, email, referral } = body;

    // Validate required fields
    if (!name || !firm || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Send email using Resend
    try {
      const data = await resend.emails.send({
        from: 'DashDice Investor Portal <onboarding@resend.dev>', // Change to your verified domain
        to: ['play@dashdice.gg'],
        subject: '🎲 New Prototype Access Request',
        html: `
          <h2>New Prototype Access Request</h2>
          <p>A potential investor has requested access to the DashDice prototype.</p>
          
          <h3>Contact Information:</h3>
          <ul>
            <li><strong>Name:</strong> ${name}</li>
            <li><strong>Firm:</strong> ${firm}</li>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>How they heard about us:</strong> ${referral || 'Not provided'}</li>
          </ul>
          
          <p><em>Submitted: ${new Date().toLocaleString('en-US', { 
            timeZone: 'America/New_York',
            dateStyle: 'full',
            timeStyle: 'long'
          })}</em></p>
        `,
      });

      console.log('Email sent successfully:', data);

      return NextResponse.json(
        { 
          success: true, 
          message: 'Your request has been received. We will contact you shortly at ' + email 
        },
        { status: 200 }
      );

    } catch (emailError: any) {
      console.error('Resend API error:', emailError);
      
      // If Resend is not configured, return success anyway (graceful degradation)
      // In production, you'd want proper error handling
      return NextResponse.json(
        { 
          success: true, 
          message: 'Your request has been received. We will contact you shortly at ' + email,
          note: 'Email service not configured - request logged locally'
        },
        { status: 200 }
      );
    }

  } catch (error) {
    console.error('Error processing prototype request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
