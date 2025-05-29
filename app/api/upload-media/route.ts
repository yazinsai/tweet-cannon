import { NextRequest, NextResponse } from 'next/server';
import { uploadImageToTwitter } from '@/lib/media';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const cookies = formData.get('cookies') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!cookies) {
      return NextResponse.json(
        { error: 'No authentication cookies provided' },
        { status: 401 }
      );
    }

    console.log('Uploading media:', file.name, file.size, file.type);

    // Upload to Twitter
    const result = await uploadImageToTwitter(file, cookies);

    if (!result.success) {
      console.error('Media upload failed:', result.error);
      return NextResponse.json(
        { error: result.error || 'Failed to upload media' },
        { status: 500 }
      );
    }

    console.log('Media uploaded successfully:', result.mediaId);

    return NextResponse.json({
      success: true,
      mediaId: result.mediaId,
      mediaData: result.mediaData
    });

  } catch (error) {
    console.error('Media upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
