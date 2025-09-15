import { NextRequest, NextResponse } from 'next/server';

// Types for different moderation services

interface OpenAIModerationResult {
  flagged: boolean;
  categories: {
    [key: string]: boolean;
  };
  category_scores: {
    [key: string]: number;
  };
}

interface ContentAnalysis {
  hasText: boolean;
  hasInappropriateContent: boolean;
  confidence: number;
  reasons: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, imagePath } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Starting image moderation for:', imagePath);

    // Multiple moderation checks
    const moderationResults = await Promise.all([
      performBasicImageAnalysis(imageUrl),
      performOpenAIVisionModeration(imageUrl),
      performContentPolicyCheck(imageUrl)
    ]);

    const [basicAnalysis, openAIResult, contentPolicyResult] = moderationResults;

    // Combine results with weighted scoring
    const combinedResult = combineModeratedResults(
      basicAnalysis,
      openAIResult,
      contentPolicyResult
    );

    console.log('🛡️ Moderation complete:', {
      isAppropriate: combinedResult.isAppropriate,
      confidence: combinedResult.confidence,
      reasons: combinedResult.reasons
    });

    return NextResponse.json(combinedResult);

  } catch (error) {
    console.error('❌ Image moderation error:', error);
    
    // Return conservative result on error
    return NextResponse.json({
      isAppropriate: false,
      confidence: 0,
      reasons: ['Moderation service error'],
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
  }
}

/**
 * Basic image analysis using built-in checks
 */
async function performBasicImageAnalysis(imageUrl: string): Promise<ContentAnalysis> {
  try {
    // Fetch image to analyze
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    const imageSize = buffer.byteLength;

    // Basic size check
    if (imageSize > 5 * 1024 * 1024) {
      return {
        hasText: false,
        hasInappropriateContent: true,
        confidence: 0.9,
        reasons: ['File size exceeds limit']
      };
    }

    // Check for suspicious file patterns
    const uint8Array = new Uint8Array(buffer);
    const header = Array.from(uint8Array.slice(0, 10))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');

    // Basic file type validation
    const isValidImage = (
      header.startsWith('ffd8ff') || // JPEG
      header.startsWith('89504e47') || // PNG
      header.startsWith('47494638') || // GIF
      header.startsWith('52494646') // WebP (RIFF)
    );

    if (!isValidImage) {
      return {
        hasText: false,
        hasInappropriateContent: true,
        confidence: 0.95,
        reasons: ['Invalid or corrupted image file']
      };
    }

    return {
      hasText: false,
      hasInappropriateContent: false,
      confidence: 0.7,
      reasons: []
    };

  } catch (error) {
    console.error('Basic analysis error:', error);
    return {
      hasText: false,
      hasInappropriateContent: true,
      confidence: 0.5,
      reasons: ['Failed basic image analysis']
    };
  }
}

/**
 * OpenAI Vision API moderation (if API key available)
 */
async function performOpenAIVisionModeration(imageUrl: string): Promise<ContentAnalysis> {
  const openAIKey = process.env.OPENAI_API_KEY;
  
  if (!openAIKey) {
    console.log('⚠️ OpenAI API key not available, skipping AI moderation');
    return {
      hasText: false,
      hasInappropriateContent: false,
      confidence: 0.5,
      reasons: []
    };
  }

  try {
    // Use GPT-4 Vision to analyze the image
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this image for content moderation. Check for:
                1. Inappropriate, sexual, or explicit content
                2. Violence or disturbing imagery  
                3. Hate symbols or offensive content
                4. Whether this is appropriate for a gaming profile picture
                
                Respond with ONLY a JSON object in this format:
                {
                  "appropriate": true/false,
                  "confidence": 0.0-1.0,
                  "issues": ["list", "of", "issues", "if", "any"],
                  "reasoning": "brief explanation"
                }`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'low'
                }
              }
            ]
          }
        ],
        max_tokens: 300
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    const analysis = JSON.parse(content);
    
    return {
      hasText: analysis.issues?.includes('text') || false,
      hasInappropriateContent: !analysis.appropriate,
      confidence: analysis.confidence || 0.8,
      reasons: analysis.issues || []
    };

  } catch (error) {
    console.error('OpenAI moderation error:', error);
    // Return neutral result on API error
    return {
      hasText: false,
      hasInappropriateContent: false,
      confidence: 0.5,
      reasons: []
    };
  }
}

/**
 * Content policy check using rules-based approach
 */
async function performContentPolicyCheck(imageUrl: string): Promise<ContentAnalysis> {
  try {
    // This would integrate with additional services like:
    // - AWS Rekognition
    // - Google Cloud Vision API
    // - Microsoft Azure Content Moderator
    // For now, we'll use a simple policy-based check

    // Placeholder for external service integration
    return {
      hasText: false,
      hasInappropriateContent: false,
      confidence: 0.6,
      reasons: []
    };

  } catch (error) {
    console.error('Content policy check error:', error);
    return {
      hasText: false,
      hasInappropriateContent: false,
      confidence: 0.5,
      reasons: []
    };
  }
}

/**
 * Combine results from multiple moderation services
 */
function combineModeratedResults(
  basicAnalysis: ContentAnalysis,
  openAIResult: ContentAnalysis,
  contentPolicyResult: ContentAnalysis
) {
  // Weight the results (basic: 30%, OpenAI: 50%, Content Policy: 20%)
  const weights = {
    basic: 0.3,
    openAI: 0.5,
    contentPolicy: 0.2
  };

  // Calculate weighted confidence
  const weightedConfidence = (
    basicAnalysis.confidence * weights.basic +
    openAIResult.confidence * weights.openAI +
    contentPolicyResult.confidence * weights.contentPolicy
  );

  // Collect all reasons
  const allReasons = [
    ...basicAnalysis.reasons,
    ...openAIResult.reasons,
    ...contentPolicyResult.reasons
  ].filter((reason, index, arr) => arr.indexOf(reason) === index); // Remove duplicates

  // Determine if appropriate (any service flagging as inappropriate = reject)
  const hasInappropriateContent = 
    basicAnalysis.hasInappropriateContent ||
    openAIResult.hasInappropriateContent ||
    contentPolicyResult.hasInappropriateContent;

  // Conservative approach: require high confidence for approval
  const isAppropriate = !hasInappropriateContent && weightedConfidence > 0.7;

  return {
    isAppropriate,
    confidence: weightedConfidence,
    reasons: allReasons,
    details: {
      basicAnalysis,
      openAIResult,
      contentPolicyResult,
      weightedConfidence
    }
  };
}
