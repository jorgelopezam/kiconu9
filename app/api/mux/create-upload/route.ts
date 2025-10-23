import { NextRequest, NextResponse } from 'next/server';
import { createDirectUpload } from '@/lib/mux';

export async function POST(request: NextRequest) {
  try {
    // Create a direct upload URL
    const { uploadId, uploadUrl } = await createDirectUpload();

    return NextResponse.json({
      uploadId,
      uploadUrl,
    });
  } catch (error) {
    console.error('Error creating upload URL:', error);
    return NextResponse.json(
      { error: 'Failed to create upload URL' },
      { status: 500 }
    );
  }
}
