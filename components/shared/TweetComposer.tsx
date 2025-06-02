'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MediaAttachment } from '@/lib/types';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { useTweetPosting } from '@/hooks/useTweetPosting';
import { createImageEventHandlers } from '@/lib/imageHandlers';
import { MEDIA_LIMITS } from '@/lib/media';
import { cn } from '@/lib/utils';
import {
  getCharacterCountInfo,
  validateTweetContentWithThreading,
  saveTweetDraft,
  loadTweetDraft,
  clearTweetDraft,
  shouldRestoreDraft
} from '@/utils/tweetUtils';

interface TweetComposerProps {
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
  placeholder?: string;
  submitButtonText?: string;
  showSuccessMessage?: boolean;
  className?: string;
  enableThreading?: boolean;
}

export function TweetComposer({
  onSuccess,
  onError,
  placeholder = "What's happening?",
  submitButtonText = 'Post Tweet',
  showSuccessMessage = true,
  className = '',
  enableThreading = true
}: TweetComposerProps) {
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<MediaAttachment[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  const { isPosting, postTweet } = useTweetPosting();

  // Load draft on component mount
  useEffect(() => {
    const draft = loadTweetDraft();
    if (shouldRestoreDraft(draft) && draft?.location === 'tweet-composer') {
      setMessage(draft.content);
      setImages(draft.images);
      setDraftRestored(true);
    }
  }, []);

  // Auto-save draft with debouncing
  const saveDraft = useCallback(() => {
    if (message.trim() || images.length > 0) {
      saveTweetDraft({ content: message, images }, 'tweet-composer');
    }
  }, [message, images]);

  // Debounced auto-save effect
  useEffect(() => {
    if (!draftRestored && (message.trim() || images.length > 0)) {
      const timeoutId = setTimeout(saveDraft, 1000); // Save after 1 second of inactivity
      return () => clearTimeout(timeoutId);
    }
  }, [message, images, saveDraft, draftRestored]);

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
      onError
    },
    dragActive,
    setDragActive
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate with threading support
    const validation = validateTweetContentWithThreading(message, images, enableThreading);

    if (!validation.isValid) {
      onError?.(validation.errors.join(', '));
      return;
    }

    try {
      await postTweet(message, images);

      // Clear draft and reset form
      clearTweetDraft();
      setMessage('');
      setImages([]);

      // Show success
      if (showSuccessMessage) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 5000);
      }

      onSuccess?.(message);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to post tweet';
      onError?.(errorMessage);
    }
  };

  // Get character count info with threading support
  const charInfo = getCharacterCountInfo(message, enableThreading);
  const validation = validateTweetContentWithThreading(message, images, enableThreading);
  const isEmpty = message.trim().length === 0 && images.length === 0;

  return (
    <div className={`bg-white rounded-2xl shadow-lg p-6 ${className}`}>
      {showSuccess && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center">
            <span className="text-green-600 mr-2">✅</span>
            <span className="text-green-800 font-medium">Tweet posted successfully!</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={dragActive ? "Drop images here or continue typing..." : placeholder}
            className={cn(
              "w-full p-4 border rounded-xl resize-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-colors",
              dragActive
                ? "border-slate-500 bg-slate-50"
                : "border-gray-200",
              isPosting && "opacity-50"
            )}
            rows={4}
            disabled={isPosting}
            {...imageHandlers}
          />
          <div className="flex justify-between items-center mt-2">
            <div className="text-sm text-gray-500">
              {images.length > 0 && (
                <span className="mr-4">📷 {images.length} image{images.length > 1 ? 's' : ''}</span>
              )}
              {charInfo.needsThreading && (
                <span className="mr-4 text-blue-600">🧵 {charInfo.threadParts} parts</span>
              )}
              {validation.warnings.length > 0 && (
                <span className="mr-4 text-amber-600">⚠️ {validation.warnings[0]}</span>
              )}
            </div>
            <div className={`text-sm ${charInfo.isOverLimit ? 'text-red-500' : charInfo.isNearLimit ? 'text-amber-500' : 'text-gray-500'}`}>
              {charInfo.needsThreading ? (
                <span>
                  {charInfo.firstPartLength}/280 (first part)
                  <span className="ml-2 text-xs text-gray-400">
                    {charInfo.current} total
                  </span>
                </span>
              ) : (
                <span>{charInfo.current}/280</span>
              )}
            </div>
          </div>
        </div>

        <ImageUpload
          images={images}
          onImagesChange={setImages}
          disabled={isPosting}
          compact={true}
        />

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isEmpty || !validation.isValid || isPosting}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPosting ? 'Posting...' : charInfo.needsThreading ? 'Post Thread' : submitButtonText}
          </button>
        </div>
      </form>
    </div>
  );
}
