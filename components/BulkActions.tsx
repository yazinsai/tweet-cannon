'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Modal, ModalContent, ModalFooter } from '@/components/ui/Modal';
import { Tweet, TweetStatus } from '@/lib/types';
import { bulkUpdateTweetStatus, bulkDeleteTweets } from '@/lib/storage';

interface BulkActionsProps {
  selectedTweets: string[];
  tweets: Tweet[];
  onBulkAction: (updatedTweets: Tweet[]) => void;
  onClearSelection: () => void;
  className?: string;
}

const BulkActions: React.FC<BulkActionsProps> = ({
  selectedTweets,
  tweets,
  onBulkAction,
  onClearSelection,
  className,
}) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (selectedTweets.length === 0) {
    return null;
  }

  const selectedTweetObjects = tweets.filter(tweet => selectedTweets.includes(tweet.id));
  const canPost = selectedTweetObjects.some(tweet =>
    tweet.status === 'queued' || tweet.status === 'failed'
  );

  const handleBulkStatusUpdate = async (status: TweetStatus) => {
    setIsProcessing(true);
    try {
      const updatedTweets = bulkUpdateTweetStatus(selectedTweets, status);
      onBulkAction(updatedTweets);
      onClearSelection();
    } catch (error) {
      console.error('Failed to update tweet statuses:', error);
      alert('Failed to update tweet statuses');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    setIsProcessing(true);
    try {
      const success = bulkDeleteTweets(selectedTweets);
      if (success) {
        // Get updated tweets list
        const { getTweets } = await import('@/lib/storage');
        const updatedTweets = getTweets();
        onBulkAction(updatedTweets);
        onClearSelection();
        setIsDeleteModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to delete tweets:', error);
      alert('Failed to delete tweets');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkPost = async () => {
    setIsProcessing(true);
    try {
      // Get session for authentication
      const { getUserSession } = await import('@/lib/storage');
      const session = await getUserSession();

      if (!session || !session.isValid || !session.cookies) {
        alert('❌ No authentication cookies found. Please set up authentication first.');
        return;
      }

      // Post each selected tweet that can be posted
      const postableTweets = selectedTweetObjects.filter(tweet =>
        tweet.status === 'queued' || tweet.status === 'failed'
      );

      for (const tweet of postableTweets) {
        try {
          // Update status to posting
          await handleBulkStatusUpdate('posting');

          let mediaIds: string[] = [];

          // Upload media if present
          if (tweet.media && tweet.media.length > 0) {
            console.log('Uploading media for tweet:', tweet.media.length, 'files');

            for (const media of tweet.media) {
              if (media.uploadStatus !== 'uploaded' && media.file) {
                try {
                  const formData = new FormData();
                  formData.append('file', media.file);
                  formData.append('cookies', session.cookies);

                  const uploadResponse = await fetch('/api/upload-media', {
                    method: 'POST',
                    body: formData,
                  });

                  const uploadData = await uploadResponse.json();

                  if (uploadResponse.ok && uploadData.mediaId) {
                    mediaIds.push(uploadData.mediaId);
                    console.log('Media uploaded successfully:', uploadData.mediaId);
                  } else {
                    throw new Error(uploadData.error || 'Failed to upload media');
                  }
                } catch (uploadError) {
                  console.error('Media upload failed:', uploadError);
                  await handleBulkStatusUpdate('failed');
                  continue; // Skip to next tweet
                }
              } else if (media.mediaId) {
                // Use existing media ID
                mediaIds.push(media.mediaId);
              }
            }
          }

          // Post to Twitter API
          const response = await fetch('/api/tweet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: tweet.content,
              cookies: session.cookies,
              mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
            }),
          });

          const data = await response.json();

          if (response.ok) {
            // Update to posted
            await handleBulkStatusUpdate('posted');
          } else {
            // Update to failed
            await handleBulkStatusUpdate('failed');
          }
        } catch (error) {
          // Update to failed
          await handleBulkStatusUpdate('failed');
        }
      }

      onClearSelection();
    } catch (error) {
      console.error('Failed to post tweets:', error);
      alert('Failed to post tweets');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Card className={className}>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">
                {selectedTweets.length} tweet{selectedTweets.length !== 1 ? 's' : ''} selected
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={onClearSelection}
                className="text-xs"
              >
                Clear
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              {canPost && (
                <Button
                  size="sm"
                  onClick={handleBulkPost}
                  loading={isProcessing}
                  disabled={isProcessing}
                >
                  🚀 Post All
                </Button>
              )}

              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleBulkStatusUpdate('queued')}
                disabled={isProcessing}
              >
                📝 Mark Queued
              </Button>

              <Button
                size="sm"
                variant="danger"
                onClick={() => setIsDeleteModalOpen(true)}
                disabled={isProcessing}
              >
                🗑️ Delete All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Multiple Tweets"
        description={`Are you sure you want to delete ${selectedTweets.length} tweet${selectedTweets.length !== 1 ? 's' : ''}? This action cannot be undone.`}
      >
        <ModalContent>
          <div className="bg-gray-50 rounded-md p-3">
            <p className="text-sm text-gray-700 mb-2">
              You are about to delete:
            </p>
            <ul className="text-xs text-gray-600 space-y-1 max-h-32 overflow-y-auto">
              {selectedTweetObjects.map(tweet => (
                <li key={tweet.id} className="truncate">
                  • {tweet.content.slice(0, 50)}...
                </li>
              ))}
            </ul>
          </div>
        </ModalContent>

        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => setIsDeleteModalOpen(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleBulkDelete}
            loading={isProcessing}
          >
            Delete {selectedTweets.length} Tweet{selectedTweets.length !== 1 ? 's' : ''}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export { BulkActions };
