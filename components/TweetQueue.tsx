'use client';

import React, { useState, useEffect } from 'react';
import { TweetCard } from './TweetCard';
import { BulkActions } from './BulkActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tweet, TweetStatus } from '@/lib/types';
import { getTweets } from '@/lib/storage';

interface TweetQueueProps {
  tweets?: Tweet[];
  onTweetUpdated?: (tweet: Tweet) => void;
  onTweetDeleted?: (tweetId: string) => void;
  className?: string;
}

const TweetQueue: React.FC<TweetQueueProps> = ({
  tweets: propTweets,
  onTweetUpdated,
  onTweetDeleted,
  className,
}) => {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [filter, setFilter] = useState<TweetStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'created' | 'scheduled'>('created');
  const [selectedTweets, setSelectedTweets] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Load tweets from storage if not provided as props
  useEffect(() => {
    if (propTweets) {
      setTweets(propTweets);
    } else {
      try {
        const storedTweets = getTweets();
        setTweets(storedTweets);
      } catch (error) {
        console.error('Failed to load tweets:', error);
      }
    }
  }, [propTweets]);

  // Filter and sort tweets
  const filteredTweets = tweets
    .filter(tweet => filter === 'all' || tweet.status === filter)
    .sort((a, b) => {
      if (sortBy === 'scheduled') {
        const aDate = a.scheduledFor || a.createdAt;
        const bDate = b.scheduledFor || b.createdAt;
        return aDate.getTime() - bDate.getTime();
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

  const handleTweetUpdated = (updatedTweet: Tweet) => {
    setTweets(prev =>
      prev.map(tweet =>
        tweet.id === updatedTweet.id ? updatedTweet : tweet
      )
    );
    onTweetUpdated?.(updatedTweet);
  };

  const handleTweetDeleted = (tweetId: string) => {
    setTweets(prev => prev.filter(tweet => tweet.id !== tweetId));
    setSelectedTweets(prev => prev.filter(id => id !== tweetId));
    onTweetDeleted?.(tweetId);
  };

  const handleBulkAction = (updatedTweets: Tweet[]) => {
    setTweets(updatedTweets);
  };

  const handleToggleSelection = (tweetId: string) => {
    setSelectedTweets(prev =>
      prev.includes(tweetId)
        ? prev.filter(id => id !== tweetId)
        : [...prev, tweetId]
    );
  };

  const handleSelectAll = () => {
    const allFilteredIds = filteredTweets.map(tweet => tweet.id);
    setSelectedTweets(allFilteredIds);
  };

  const handleClearSelection = () => {
    setSelectedTweets([]);
    setIsSelectionMode(false);
  };

  const handleToggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      setSelectedTweets([]);
    }
  };

  // Get counts for each status
  const statusCounts = {
    all: tweets.length,
    queued: tweets.filter(t => t.status === 'queued').length,
    posting: tweets.filter(t => t.status === 'posting').length,
    posted: tweets.filter(t => t.status === 'posted').length,
    failed: tweets.filter(t => t.status === 'failed').length,
  };

  const filterOptions: { value: TweetStatus | 'all'; label: string; variant?: any }[] = [
    { value: 'all', label: 'All' },
    { value: 'queued', label: 'Queued', variant: 'default' },
    { value: 'posting', label: 'Posting', variant: 'info' },
    { value: 'posted', label: 'Posted', variant: 'success' },
    { value: 'failed', label: 'Failed', variant: 'danger' },
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Tweet Queue</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant="info">
              {filteredTweets.length} tweet{filteredTweets.length !== 1 ? 's' : ''}
            </Badge>
            <Button
              size="sm"
              variant={isSelectionMode ? 'primary' : 'ghost'}
              onClick={handleToggleSelectionMode}
              className="text-xs"
            >
              {isSelectionMode ? '✅ Selection Mode' : '☑️ Select'}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mt-4">
          {filterOptions.map(option => (
            <Button
              key={option.value}
              size="sm"
              variant={filter === option.value ? 'primary' : 'ghost'}
              onClick={() => setFilter(option.value)}
              className="text-xs"
            >
              {option.label}
              {statusCounts[option.value] > 0 && (
                <Badge
                  size="sm"
                  variant={option.variant || 'default'}
                  className="ml-1"
                >
                  {statusCounts[option.value]}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* Sort Options */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Sort by:</span>
            <Button
              size="sm"
              variant={sortBy === 'created' ? 'primary' : 'ghost'}
              onClick={() => setSortBy('created')}
              className="text-xs"
            >
              Created
            </Button>
            <Button
              size="sm"
              variant={sortBy === 'scheduled' ? 'primary' : 'ghost'}
              onClick={() => setSortBy('scheduled')}
              className="text-xs"
            >
              Scheduled
            </Button>
          </div>

          {/* Selection Controls */}
          {isSelectionMode && filteredTweets.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSelectAll}
                className="text-xs"
              >
                Select All ({filteredTweets.length})
              </Button>
              {selectedTweets.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleClearSelection}
                  className="text-xs"
                >
                  Clear ({selectedTweets.length})
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Bulk Actions */}
        {isSelectionMode && (
          <div className="mb-4">
            <BulkActions
              selectedTweets={selectedTweets}
              tweets={tweets}
              onBulkAction={handleBulkAction}
              onClearSelection={handleClearSelection}
            />
          </div>
        )}

        {filteredTweets.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-2">📝</div>
            <p className="text-gray-600">
              {filter === 'all'
                ? 'No tweets in queue yet'
                : `No ${filter} tweets`
              }
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Add some tweets to get started!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTweets.map(tweet => (
              <div
                key={tweet.id}
                className={`relative ${
                  isSelectionMode ? 'cursor-pointer' : ''
                } ${
                  selectedTweets.includes(tweet.id) ? 'ring-2 ring-blue-500 rounded-lg' : ''
                }`}
                onClick={isSelectionMode ? () => handleToggleSelection(tweet.id) : undefined}
              >
                {isSelectionMode && (
                  <div className="absolute top-2 left-2 z-10">
                    <input
                      type="checkbox"
                      checked={selectedTweets.includes(tweet.id)}
                      onChange={() => handleToggleSelection(tweet.id)}
                      className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                )}
                <TweetCard
                  tweet={tweet}
                  onTweetUpdated={handleTweetUpdated}
                  onTweetDeleted={handleTweetDeleted}
                  className={isSelectionMode ? 'ml-6' : ''}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export { TweetQueue };
