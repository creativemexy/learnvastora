import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { width: string; height: string } }
) {
  try {
    const width = parseInt(params.width) || 150;
    const height = parseInt(params.height) || 150;
    
    // Validate dimensions
    if (width > 1000 || height > 1000) {
      return NextResponse.json({ error: 'Dimensions too large' }, { status: 400 });
    }

    // Create a simple SVG placeholder
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${Math.min(width, height) / 8}" 
              fill="#9ca3af" text-anchor="middle" dy=".3em">
          ${width}x${height}
        </text>
      </svg>
    `;

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Placeholder generation error:', error);
    return NextResponse.json({ error: 'Failed to generate placeholder' }, { status: 500 });
  }
} 