'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MediaAttachment } from '@/lib/types';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { AuthGuard } from '@/components/shared/AuthGuard';
import { AppHeader } from '@/components/shared/AppHeader';
import { TweetInput } from '@/components/TweetInput';
import { useAppData } from '@/hooks/useAppData';

const SimpleDashboard: React.FC = () => {
  const {
    isLoading,
    queuedTweets,
    postedTweets,
    schedulerEnabled,
    removeExistingTweet,
    refreshAll,
  } = useAppData();

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
          subtitle="Dashboard"
          showNavigation={true}
          currentPage="simple-dashboard"
        />

        {/* Scheduler Status */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex items-center justify-center">
              <div className="flex items-center text-sm">
                <div className={`w-2 h-2 rounded-full mr-2 ${schedulerEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className="text-gray-600">
                  Scheduler {schedulerEnabled ? 'On' : 'Off'}
                </span>
              </div>
            </div>
          </div>
        </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Add Tweet Section */}
          <div className="lg:col-span-1">
            <TweetInput onTweetAdded={handleTweetAdded} />

            {/* Quick Stats */}
            <div className="mt-6 bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">📊</span>
                Quick Stats
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-slate-50 rounded-xl">
                  <div className="text-2xl font-bold text-slate-700">{queuedTweets.length}</div>
                  <div className="text-sm text-gray-600">In Queue</div>
                </div>
                <div className="text-center p-3 bg-emerald-50 rounded-xl">
                  <div className="text-2xl font-bold text-emerald-600">{postedTweets.length}</div>
                  <div className="text-sm text-gray-600">Posted</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tweet Queue */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <span className="mr-2">📋</span>
                  Tweet Queue
                </h2>

                {queuedTweets.length > 0 && (
                  <span className="text-sm text-gray-600">
                    {queuedTweets.length} tweet{queuedTweets.length !== 1 ? 's' : ''} ready
                  </span>
                )}
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
                <div className="space-y-4">
                  {queuedTweets.map((tweet) => (
                    <div key={tweet.id} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-gray-900 mb-2">{tweet.content}</p>

                          {/* Media Attachments */}
                          {tweet.media && tweet.media.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              {tweet.media.map((media) => (
                                <div
                                  key={media.id}
                                  className="relative aspect-square border border-gray-200 rounded-lg overflow-hidden bg-gray-50"
                                >
                                  <img
                                    src={media.preview}
                                    alt="Tweet attachment"
                                    className="w-full h-full object-cover"
                                  />

                                  {/* Upload Status Indicator */}
                                  {media.uploadStatus === 'uploading' && (
                                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                                      <div className="text-white text-center">
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mx-auto mb-1"></div>
                                        <div className="text-xs">Uploading...</div>
                                      </div>
                                    </div>
                                  )}

                                  {media.uploadStatus === 'uploaded' && (
                                    <div className="absolute top-1 left-1 bg-green-500 text-white rounded-full p-1">
                                      <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                  )}

                                  {media.uploadStatus === 'failed' && (
                                    <div className="absolute inset-0 bg-red-500 bg-opacity-75 flex items-center justify-center">
                                      <div className="text-white text-center">
                                        <div className="text-xs font-medium">Failed</div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center text-sm text-gray-500">
                            <span className="mr-4">
                              Added {new Date(tweet.createdAt).toLocaleDateString()}
                            </span>
                            {tweet.media && tweet.media.length > 0 && (
                              <span className="mr-4">
                                📷 {tweet.media.length} image{tweet.media.length > 1 ? 's' : ''}
                              </span>
                            )}
                            <span className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                              Scheduled
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
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </AuthGuard>
  );
};

export default SimpleDashboard;
