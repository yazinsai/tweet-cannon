'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { Card, CardContent, CardFooter } from '@/components/ui/Card';
import { addTweet } from '@/lib/storage';
import { CreateTweetData } from '@/lib/types';

interface TweetInputProps {
  onTweetAdded?: (tweet: any) => void;
  className?: string;
}

const TweetInput: React.FC<TweetInputProps> = ({ onTweetAdded, className }) => {
  const [content, setContent] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const tweetData: CreateTweetData = {
        content: content.trim(),
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      };

      const newTweet = addTweet(tweetData);
      
      // Reset form
      setContent('');
      setScheduledFor('');
      
      // Notify parent component
      onTweetAdded?.(newTweet);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add tweet');
    } finally {
      setIsLoading(false);
    }
  };

  const isOverLimit = content.length > 280;
  const isEmpty = content.trim().length === 0;

  return (
    <Card className={className}>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <Textarea
            label="What's happening?"
            placeholder="Enter your tweet..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            characterCount={{
              current: content.length,
              max: 280,
            }}
            error={error}
            rows={4}
            disabled={isLoading}
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Schedule for later (optional)
            </label>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
            />
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {scheduledFor && (
              <span>📅 Scheduled for {new Date(scheduledFor).toLocaleString()}</span>
            )}
          </div>
          
          <Button
            type="submit"
            disabled={isEmpty || isOverLimit || isLoading}
            loading={isLoading}
          >
            {scheduledFor ? 'Schedule Tweet' : 'Add to Queue'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export { TweetInput };
