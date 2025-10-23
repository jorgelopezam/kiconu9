import { NextRequest, NextResponse } from 'next/server';
import { getMuxAsset } from '@/lib/mux';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const { assetId } = await params;
    const asset = await getMuxAsset(assetId);

    return NextResponse.json({
      id: asset.id,
      status: asset.status,
      duration: asset.duration,
      playbackId: asset.playback_ids?.[0]?.id || '',
      aspectRatio: asset.aspect_ratio,
      maxStoredResolution: asset.max_stored_resolution,
      errors: asset.errors,
    });
  } catch (error) {
    console.error('Error retrieving asset:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve asset' },
      { status: 500 }
    );
  }
}
