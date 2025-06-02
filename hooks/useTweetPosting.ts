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
      // Get saved session from encrypted storage
      const session = await getUserSession();

      if (!session || !session.isValid || !session.cookies) {
        throw new Error('No authentication cookies found. Please set up authentication first.');
      }

      let mediaIds: string[] = [];

      // Upload media if present
      if (images.length > 0) {
        console.log('Uploading media for tweet:', images.length, 'files');

        for (const media of images) {
          if (media.uploadStatus !== 'uploaded' && media.file) {
            // Upload new media using FormData (files can't be JSON serialized)
            const formData = new FormData();
            formData.append('file', media.file);
            formData.append('cookies', session.cookies);

            const uploadResponse = await fetch('/api/upload-media', {
              method: 'POST',
              body: formData, // Don't set Content-Type header, let browser set multipart boundary
            });

            if (!uploadResponse.ok) {
              const uploadError = await uploadResponse.json();
              throw new Error(`Media upload failed: ${uploadError.error}`);
            }

            const uploadData = await uploadResponse.json();
            if (uploadData.mediaId) {
              mediaIds.push(uploadData.mediaId);
              console.log('Media uploaded successfully:', uploadData.mediaId);
            } else {
              throw new Error('No media ID returned from upload');
            }
          } else if (media.mediaId) {
            // Use existing media ID
            mediaIds.push(media.mediaId);
          }
        }
      }

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
