import { NextRequest, NextResponse } from 'next/server';
import { getUploadStatus } from '@/lib/mux';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> }
) {
  try {
    const { uploadId } = await params;
    const upload = await getUploadStatus(uploadId);

    return NextResponse.json({
      id: upload.id,
      status: upload.status,
      assetId: upload.asset_id,
      error: upload.error,
    });
  } catch (error) {
    console.error('Error retrieving upload status:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve upload status' },
      { status: 500 }
    );
  }
}
