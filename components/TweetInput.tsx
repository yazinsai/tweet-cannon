'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { Card, CardContent, CardFooter } from '@/components/ui/Card';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { addTweet } from '@/lib/storage';
import { CreateTweetData, MediaAttachment } from '@/lib/types';
import { useNotifications } from '@/contexts/NotificationContext';
import { addTweetAddedActivity } from '@/components/ActivityFeed';
import { createImageEventHandlers } from '@/lib/imageHandlers';
import { MEDIA_LIMITS } from '@/lib/media';

interface TweetInputProps {
  onTweetAdded?: (tweet: any) => void;
  className?: string;
}

const TweetInput: React.FC<TweetInputProps> = ({ onTweetAdded, className }) => {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<MediaAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const notifications = useNotifications();

  // Create image event handlers for the textarea
  const imageHandlers = createImageEventHandlers(
    {
      maxImages: MEDIA_LIMITS.MAX_IMAGES,
      currentImages: images,
      onImagesChange: setImages,
      onError: setError
    },
    dragActive,
    setDragActive
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const tweetData: CreateTweetData = {
        content: content.trim(),
        media: images.length > 0 ? images : undefined,
      };

      const newTweet = addTweet(tweetData);

      // Show success notification and add activity
      const hasImages = images.length > 0;
      notifications.showSuccess(
        `Tweet with ${hasImages ? `${images.length} image(s) ` : ''}added to queue!`,
        'Tweet Added'
      );
      addTweetAddedActivity(content.trim());

      // Reset form
      setContent('');
      setImages([]);

      // Notify parent component
      onTweetAdded?.(newTweet);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add tweet');
    } finally {
      setIsLoading(false);
    }
  };

  const isOverLimit = content.length > 280;
  const isEmpty = content.trim().length === 0 && images.length === 0;

  return (
    <Card className={className}>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 mt-4">
          <Textarea
            label="What's happening?"
            placeholder={dragActive ? "Drop images here or continue typing..." : "Enter your tweet..."}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            characterCount={{
              current: content.length,
              max: 280,
            }}
            error={error}
            rows={4}
            disabled={isLoading}
            dragActive={dragActive}
            {...imageHandlers}
          />

          <ImageUpload
            images={images}
            onImagesChange={setImages}
            disabled={isLoading}
            compact={true}
          />


        </CardContent>

        <CardFooter className="flex justify-between items-center">
          <div className="text-sm text-gray-500 space-y-1">
            {images.length > 0 && (
              <div>📷 {images.length} image{images.length > 1 ? 's' : ''} attached</div>
            )}
          </div>

          <Button
            type="submit"
            disabled={isEmpty || isOverLimit || isLoading}
            loading={isLoading}
          >
            Add to Queue
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export { TweetInput };
