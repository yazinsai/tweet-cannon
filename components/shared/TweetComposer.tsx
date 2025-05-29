'use client';

import React, { useState } from 'react';
import { MediaAttachment } from '@/lib/types';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { useTweetPosting } from '@/hooks/useTweetPosting';

interface TweetComposerProps {
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
  placeholder?: string;
  submitButtonText?: string;
  showSuccessMessage?: boolean;
  className?: string;
}

export function TweetComposer({
  onSuccess,
  onError,
  placeholder = "What's happening?",
  submitButtonText = 'Post Tweet',
  showSuccessMessage = true,
  className = ''
}: TweetComposerProps) {
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<MediaAttachment[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  const { isPosting, postTweet } = useTweetPosting();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() && images.length === 0) {
      const error = 'Please enter a message or add an image';
      onError?.(error);
      return;
    }

    try {
      await postTweet(message, images);
      
      // Reset form
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

  const isOverLimit = message.length > 280;
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
            placeholder={placeholder}
            className="w-full p-4 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
            disabled={isPosting}
          />
          <div className="flex justify-between items-center mt-2">
            <div className="text-sm text-gray-500">
              {images.length > 0 && (
                <span className="mr-4">📷 {images.length} image{images.length > 1 ? 's' : ''}</span>
              )}
            </div>
            <div className={`text-sm ${isOverLimit ? 'text-red-500' : 'text-gray-500'}`}>
              {message.length}/280
            </div>
          </div>
        </div>

        <ImageUpload
          images={images}
          onImagesChange={setImages}
          disabled={isPosting}
        />

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isEmpty || isOverLimit || isPosting}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPosting ? 'Posting...' : submitButtonText}
          </button>
        </div>
      </form>
    </div>
  );
}
