import Mux from '@mux/mux-node';

// Initialize Mux client with credentials from environment variables
const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export interface MuxAsset {
  id: string;
  playbackId: string;
  status: string;
  duration?: number;
  aspectRatio?: string;
  maxStoredResolution?: string;
}

/**
 * Upload a video file to Mux
 * @param file - The video file to upload
 * @returns Mux asset information
 */
export async function uploadVideoToMux(file: File): Promise<MuxAsset> {
  try {
    // Create a direct upload URL
    const upload = await mux.video.uploads.create({
      cors_origin: process.env.NEXT_PUBLIC_VERCEL_URL 
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` 
        : '*',
      new_asset_settings: {
        playback_policy: ['public'],
        mp4_support: 'standard',
      },
    });

    return {
      id: upload.id,
      playbackId: upload.asset_id || '',
      status: upload.status,
    };
  } catch (error) {
    console.error('Error uploading to Mux:', error);
    throw error;
  }
}

/**
 * Create a direct upload URL for client-side uploads
 * @returns Upload URL and ID
 */
export async function createDirectUpload() {
  try {
    const upload = await mux.video.uploads.create({
      cors_origin: process.env.NEXT_PUBLIC_VERCEL_URL 
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` 
        : '*',
      new_asset_settings: {
        playback_policy: ['public'],
        mp4_support: 'standard',
      },
    });

    return {
      uploadId: upload.id,
      uploadUrl: upload.url,
    };
  } catch (error) {
    console.error('Error creating direct upload:', error);
    throw error;
  }
}

/**
 * Get upload status and asset information
 * @param uploadId - The upload ID
 * @returns Upload details including asset_id
 */
export async function getUploadStatus(uploadId: string) {
  try {
    const upload = await mux.video.uploads.retrieve(uploadId);
    return upload;
  } catch (error) {
    console.error('Error retrieving upload status:', error);
    throw error;
  }
}

/**
 * Get asset information from Mux
 * @param assetId - The Mux asset ID
 * @returns Asset details
 */
export async function getMuxAsset(assetId: string) {
  try {
    const asset = await mux.video.assets.retrieve(assetId);
    return asset;
  } catch (error) {
    console.error('Error retrieving Mux asset:', error);
    throw error;
  }
}

/**
 * Delete an asset from Mux
 * @param assetId - The Mux asset ID
 */
export async function deleteMuxAsset(assetId: string) {
  try {
    await mux.video.assets.delete(assetId);
  } catch (error) {
    console.error('Error deleting Mux asset:', error);
    throw error;
  }
}

/**
 * Get video analytics data from Mux
 * Note: Analytics are tracked client-side with Mux Player
 * This function is a placeholder for server-side analytics retrieval
 * @param assetId - The Mux asset ID
 * @returns Asset information which includes play count
 */
export async function getVideoAnalytics(assetId: string) {
  try {
    const asset = await mux.video.assets.retrieve(assetId);
    return asset;
  } catch (error) {
    console.error('Error retrieving video analytics:', error);
    throw error;
  }
}

/**
 * Generate thumbnail URL for a Mux playback ID
 * @param playbackId - The Mux playback ID
 * @param options - Thumbnail options (width, height, time)
 * @returns Thumbnail URL
 */
export function getMuxThumbnailUrl(
  playbackId: string,
  options?: {
    width?: number;
    height?: number;
    time?: number;
  }
): string {
  const { width = 640, height = 360, time = 0 } = options || {};
  return `https://image.mux.com/${playbackId}/thumbnail.jpg?width=${width}&height=${height}&time=${time}`;
}

/**
 * Get GIF URL for a Mux playback ID
 * @param playbackId - The Mux playback ID
 * @returns GIF URL
 */
export function getMuxGifUrl(playbackId: string): string {
  return `https://image.mux.com/${playbackId}/animated.gif`;
}

export { mux };
