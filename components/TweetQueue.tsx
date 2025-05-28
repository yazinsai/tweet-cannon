'use client';

import React, { useState, useEffect } from 'react';
import { TweetCard } from './TweetCard';
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
    onTweetDeleted?.(tweetId);
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
          <Badge variant="info">
            {filteredTweets.length} tweet{filteredTweets.length !== 1 ? 's' : ''}
          </Badge>
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
        <div className="flex items-center gap-2 mt-2">
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
      </CardHeader>
      
      <CardContent>
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
              <TweetCard
                key={tweet.id}
                tweet={tweet}
                onTweetUpdated={handleTweetUpdated}
                onTweetDeleted={handleTweetDeleted}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export { TweetQueue };
