'use client';

import { useState } from 'react';
import { MediaAttachment } from '@/lib/types';
import { getUserSession } from '@/lib/storage';

interface UseTweetPostingReturn {
  isPosting: boolean;
  postTweet: (message: string, images: MediaAttachment[]) => Promise<void>;
}

export function useTweetPosting(): UseTweetPostingReturn {
  const [isPosting, setIsPosting] = useState(false);

  const postTweet = async (message: string, images: MediaAttachment[] = []) => {
    setIsPosting(true);

    try {
      console.log('🚀 [useTweetPosting] Starting post with:', {
        messageLength: message.length,
        imagesCount: images.length,
        images: images.map(img => ({
          id: img.id,
          uploadStatus: img.uploadStatus,
          hasFile: !!img.file,
          fileName: img.file?.name,
          mediaId: img.mediaId
        }))
      });

      // Get saved session from encrypted storage
      const session = await getUserSession();

      if (!session || !session.isValid || !session.cookies) {
        throw new Error('No authentication cookies found. Please set up authentication first.');
      }

      let mediaIds: string[] = [];

      // Upload media if present
      if (images.length > 0) {
        console.log('🖼️ [useTweetPosting] Uploading media for tweet:', images.length, 'files');

        for (const media of images) {
          console.log(`🔍 [useTweetPosting] Processing media:`, {
            id: media.id,
            uploadStatus: media.uploadStatus,
            hasFile: !!media.file,
            fileName: media.file?.name,
            mediaId: media.mediaId
          });

          if (media.uploadStatus !== 'uploaded' && media.file) {
            console.log(`⬆️ [useTweetPosting] Uploading file: ${media.file.name}`);
            
            // Upload new media using FormData (files can't be JSON serialized)
            const formData = new FormData();
            formData.append('file', media.file);
            formData.append('cookies', session.cookies);

            const uploadResponse = await fetch('/api/upload-media', {
              method: 'POST',
              body: formData, // Don't set Content-Type header, let browser set multipart boundary
            });

            console.log(`📥 [useTweetPosting] Upload response status:`, uploadResponse.status);

            if (!uploadResponse.ok) {
              const uploadError = await uploadResponse.json();
              console.error(`❌ [useTweetPosting] Upload failed:`, uploadError);
              throw new Error(`Media upload failed: ${uploadError.error}`);
            }

            const uploadData = await uploadResponse.json();
            console.log(`📤 [useTweetPosting] Upload data:`, uploadData);
            
            if (uploadData.mediaId) {
              mediaIds.push(uploadData.mediaId);
              console.log('✅ [useTweetPosting] Media uploaded successfully:', uploadData.mediaId);
            } else {
              throw new Error('No media ID returned from upload');
            }
          } else if (media.mediaId) {
            // Use existing media ID
            console.log(`🔄 [useTweetPosting] Using existing media ID:`, media.mediaId);
            mediaIds.push(media.mediaId);
          }
        }
      }

      console.log('📋 [useTweetPosting] Final mediaIds:', mediaIds);

      const response = await fetch('/api/tweet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          cookies: session.cookies,
          mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
          enableThreading: true, // Enable threading by default
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to post tweet');
      }

      console.log('Tweet posted successfully!');
    } catch (error) {
      console.error('Failed to post tweet:', error);
      throw error;
    } finally {
      setIsPosting(false);
    }
  };

  return {
    isPosting,
    postTweet,
  };
}
