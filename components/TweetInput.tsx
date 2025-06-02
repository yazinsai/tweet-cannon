'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import {
  getCharacterCountInfo,
  validateTweetContentWithThreading,
  saveTweetDraft,
  loadTweetDraft,
  clearTweetDraft,
  shouldRestoreDraft
} from '@/utils/tweetUtils';

interface TweetInputProps {
  onTweetAdded?: (tweet: any) => void;
  className?: string;
  enableThreading?: boolean;
  location?: 'simple-dashboard' | 'dashboard' | 'tweet-composer';
}

const TweetInput: React.FC<TweetInputProps> = ({ onTweetAdded, className, enableThreading = true, location = 'dashboard' }) => {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<MediaAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [showDraftIndicator, setShowDraftIndicator] = useState(false);

  const notifications = useNotifications();

  // Load draft on component mount
  useEffect(() => {
    const draft = loadTweetDraft();
    if (shouldRestoreDraft(draft) && draft?.location === location) {
      setContent(draft.content);
      setImages(draft.images);
      setDraftRestored(true);
      // Show draft restored indicator
      setShowDraftIndicator(true);
      setTimeout(() => setShowDraftIndicator(false), 3000);
    }
  }, [location]);

  // Auto-save draft with debouncing
  const saveDraft = useCallback(() => {
    if (content.trim() || images.length > 0) {
      saveTweetDraft({ content, images }, location);
    }
  }, [content, images, location]);

  // Debounced auto-save effect
  useEffect(() => {
    if (!draftRestored && (content.trim() || images.length > 0)) {
      const timeoutId = setTimeout(saveDraft, 1000); // Save after 1 second of inactivity
      return () => clearTimeout(timeoutId);
    }
  }, [content, images, saveDraft, draftRestored]);

  // Clear the draft restored flag after initial load
  useEffect(() => {
    if (draftRestored) {
      const timeoutId = setTimeout(() => setDraftRestored(false), 100);
      return () => clearTimeout(timeoutId);
    }
  }, [draftRestored]);

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

      // Clear draft and reset form
      clearTweetDraft();
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
      {showDraftIndicator && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-600 p-3 mb-4">
          <div className="flex items-center">
            <span className="text-blue-600 dark:text-blue-400 mr-2">💾</span>
            <span className="text-blue-800 dark:text-blue-300 text-sm font-medium">Draft restored</span>
          </div>
        </div>
      )}
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
          <div className="text-sm text-muted-foreground space-y-1">
            {images.length > 0 && (
              <div>📷 {images.length} image{images.length > 1 ? 's' : ''} attached</div>
            )}
            {charInfo.needsThreading && (
              <div className="text-blue-600 dark:text-blue-400">🧵 Will be posted as thread</div>
            )}
            {validation.warnings.length > 0 && (
              <div className="text-amber-600 dark:text-amber-400">⚠️ {validation.warnings[0]}</div>
            )}
            {(content.trim() || images.length > 0) && !isLoading && (
              <div className="text-xs text-muted-foreground/70">💾 Auto-saving draft...</div>
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
