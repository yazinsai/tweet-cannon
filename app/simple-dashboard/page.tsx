'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MediaAttachment } from '@/lib/types';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { AuthGuard } from '@/components/shared/AuthGuard';
import { AppHeader } from '@/components/shared/AppHeader';
import { TweetInput } from '@/components/TweetInput';
import { useAppData } from '@/hooks/useAppData';
import { getCharacterCountInfo } from '@/utils/tweetUtils';
import { splitTextIntoThread } from '@/utils/tweetThreading';

const SimpleDashboard: React.FC = () => {
  const {
    isLoading,
    queuedTweets,
    postedTweets,
    schedulerEnabled,
    removeExistingTweet,
    refreshAll,
  } = useAppData();

  const [showQueue, setShowQueue] = useState(false);

  const handleTweetAdded = () => {
    refreshAll();
  };

  const handleDeleteTweet = async (tweetId: string) => {
    try {
      await removeExistingTweet(tweetId);
    } catch (error) {
      console.error('Failed to delete tweet:', error);
    }
  };

  const toggleQueue = () => {
    setShowQueue(!showQueue);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
        <AppHeader
          showNavigation={true}
          currentPage="simple-dashboard"
          queueCount={queuedTweets.length}
          onQueueClick={toggleQueue}
        />

        {/* Main Content - Centered Tweet Input */}
        <div className="flex items-center justify-center min-h-[60vh] px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-2xl">
            <TweetInput onTweetAdded={handleTweetAdded} location="simple-dashboard" />
          </div>
        </div>

        {/* Collapsible Queue */}
        {showQueue && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <span className="mr-2">📋</span>
                  Tweet Queue
                </h2>
                <button
                  onClick={toggleQueue}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>

              {queuedTweets.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📝</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tweets in queue</h3>
                  <p className="text-gray-600">Add some tweets to get started!</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {queuedTweets.map((tweet) => {
                    const tweetCharInfo = getCharacterCountInfo(tweet.content, true);

                    return (
                      <div key={tweet.id} className="border border-gray-200 rounded-xl p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {/* Thread Preview or Regular Content */}
                            {tweetCharInfo.needsThreading ? (
                              <div className="space-y-3 mb-3">
                                {/* Thread Header */}
                                <div className="flex items-center gap-2 text-xs text-blue-600 font-medium">
                                  <span>🧵</span>
                                  <span>Thread ({tweetCharInfo.threadParts} parts)</span>
                                </div>

                                {/* Show only first part in collapsed view */}
                                <div className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 border-l-4 border-blue-200">
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs text-blue-600 font-medium bg-blue-100 rounded-full px-2 py-1 flex-shrink-0">
                                      1
                                    </span>
                                    <span className="flex-1">{splitTextIntoThread(tweet.content).parts[0]}</span>
                                  </div>
                                </div>
                                {tweetCharInfo.threadParts > 1 && (
                                  <div className="text-xs text-gray-500 text-center">
                                    ... and {tweetCharInfo.threadParts - 1} more part{tweetCharInfo.threadParts > 2 ? 's' : ''}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-gray-900 mb-2">{tweet.content}</p>
                            )}

                            {/* Media Attachments */}
                            {tweet.media && tweet.media.length > 0 && (
                              <div className="grid grid-cols-2 gap-2 mb-3">
                                {tweet.media.slice(0, 2).map((media) => (
                                  <div
                                    key={media.id}
                                    className="relative aspect-square border border-gray-200 rounded-lg overflow-hidden bg-gray-50"
                                  >
                                    <img
                                      src={media.preview}
                                      alt="Tweet attachment"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ))}
                                {tweet.media.length > 2 && (
                                  <div className="text-xs text-gray-500 text-center col-span-2">
                                    +{tweet.media.length - 2} more image{tweet.media.length > 3 ? 's' : ''}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex items-center text-sm text-gray-500 flex-wrap gap-2">
                              <span>
                                Added {new Date(tweet.createdAt).toLocaleDateString()}
                              </span>
                              {tweet.media && tweet.media.length > 0 && (
                                <span>
                                  📷 {tweet.media.length} image{tweet.media.length > 1 ? 's' : ''}
                                </span>
                              )}
                              {tweetCharInfo.needsThreading && (
                                <span className="text-blue-600">
                                  🧵 Thread
                                </span>
                              )}
                              <span className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                                Queued
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleDeleteTweet(tweet.id)}
                            className="ml-4 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
};

export default SimpleDashboard;
