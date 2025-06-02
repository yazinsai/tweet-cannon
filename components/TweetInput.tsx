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
import { getCharacterCountInfo, validateTweetContentWithThreading } from '@/utils/tweetUtils';

interface TweetInputProps {
  onTweetAdded?: (tweet: any) => void;
  className?: string;
  enableThreading?: boolean;
}

const TweetInput: React.FC<TweetInputProps> = ({ onTweetAdded, className, enableThreading = true }) => {
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
      // Validate with threading support
      const validation = validateTweetContentWithThreading(content, images, enableThreading);

      if (!validation.isValid) {
        setError(validation.errors.join(', '));
        return;
      }

      const tweetData: CreateTweetData = {
        content: content.trim(),
        media: images.length > 0 ? images : undefined,
      };

      const newTweet = addTweet(tweetData, enableThreading);

      // Show success notification and add activity
      const hasImages = images.length > 0;
      const charInfo = getCharacterCountInfo(content, enableThreading);
      const successMessage = charInfo.needsThreading
        ? `Thread with ${charInfo.threadParts} parts${hasImages ? ` and ${images.length} image(s)` : ''} added to queue!`
        : `Tweet with ${hasImages ? `${images.length} image(s) ` : ''}added to queue!`;

      notifications.showSuccess(successMessage, 'Tweet Added');
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

  // Get character count info with threading support
  const charInfo = getCharacterCountInfo(content, enableThreading);
  const validation = validateTweetContentWithThreading(content, images, enableThreading);
  const isEmpty = content.trim().length === 0 && images.length === 0;

  return (
    <Card className={className}>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 mt-4">
          <Textarea
            label="What's happening?"
            placeholder={dragActive ? "Drop images here or continue typing..." : enableThreading ? "Enter your tweet... (Long tweets will be posted as threads)" : "Enter your tweet..."}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            characterCount={{
              current: charInfo.needsThreading ? charInfo.firstPartLength : charInfo.current,
              max: 280,
              additional: charInfo.needsThreading ? `${charInfo.current} total, ${charInfo.threadParts} parts` : undefined,
              isThreaded: charInfo.needsThreading
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
            {charInfo.needsThreading && (
              <div className="text-blue-600">🧵 Will be posted as thread</div>
            )}
            {validation.warnings.length > 0 && (
              <div className="text-amber-600">⚠️ {validation.warnings[0]}</div>
            )}
          </div>

          <Button
            type="submit"
            disabled={isEmpty || !validation.isValid || isLoading}
            loading={isLoading}
          >
            {charInfo.needsThreading ? 'Add Thread to Queue' : 'Add to Queue'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export { TweetInput };
