'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Card, CardContent, CardFooter } from '@/components/ui/Card';
import { Modal, ModalContent, ModalFooter } from '@/components/ui/Modal';
import { Tweet } from '@/lib/types';
import { formatDate, formatRelativeTime, truncateText } from '@/lib/utils';
import { getCharacterCountInfo } from '@/utils/tweetUtils';
import { splitTextIntoThread } from '@/utils/tweetThreading';
import { deleteTweet, updateTweet } from '@/lib/storage';

interface TweetCardProps {
  tweet: Tweet;
  onTweetUpdated?: (tweet: Tweet) => void;
  onTweetDeleted?: (tweetId: string) => void;
  className?: string;
}

const TweetCard: React.FC<TweetCardProps> = ({
  tweet,
  onTweetUpdated,
  onTweetDeleted,
  className,
}) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(tweet.content);
  const [editScheduledFor, setEditScheduledFor] = useState(
    tweet.scheduledFor ? tweet.scheduledFor.toISOString().slice(0, 16) : ''
  );

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const success = deleteTweet(tweet.id);
      if (success) {
        onTweetDeleted?.(tweet.id);
        setIsDeleteModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to delete tweet:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePostNow = async () => {
    setIsPosting(true);
    try {
      // Get saved cookies from encrypted session storage
      const { getUserSession } = await import('@/lib/storage');
      const session = await getUserSession();

      if (!session || !session.isValid || !session.cookies) {
        alert('❌ No authentication cookies found. Please set up authentication first.');
        return;
      }

      // Update tweet status to posting
      const updatedTweet = updateTweet({
        id: tweet.id,
        status: 'posting',
      });
      onTweetUpdated?.(updatedTweet);

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
              const failedTweet = updateTweet({
                id: tweet.id,
                status: 'failed',
                error: `Media upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`,
              });
              onTweetUpdated?.(failedTweet);
              return;
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
          enableThreading: true, // Enable threading by default
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update tweet status to posted
        const postedTweet = updateTweet({
          id: tweet.id,
          status: 'posted',
        });
        onTweetUpdated?.(postedTweet);
      } else {
        // Update tweet status to failed with error
        const failedTweet = updateTweet({
          id: tweet.id,
          status: 'failed',
          error: data.error || 'Failed to post tweet',
        });
        onTweetUpdated?.(failedTweet);
      }
    } catch (error) {
      // Update tweet status to failed
      const failedTweet = updateTweet({
        id: tweet.id,
        status: 'failed',
        error: 'Network error',
      });
      onTweetUpdated?.(failedTweet);
    } finally {
      setIsPosting(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditContent(tweet.content);
    setEditScheduledFor(
      tweet.scheduledFor ? tweet.scheduledFor.toISOString().slice(0, 16) : ''
    );
  };

  const handleSaveEdit = async () => {
    try {
      const updatedTweet = updateTweet({
        id: tweet.id,
        content: editContent.trim(),
        scheduledFor: editScheduledFor ? new Date(editScheduledFor) : undefined,
      });
      onTweetUpdated?.(updatedTweet);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update tweet:', error);
      alert('Failed to update tweet');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(tweet.content);
    setEditScheduledFor(
      tweet.scheduledFor ? tweet.scheduledFor.toISOString().slice(0, 16) : ''
    );
  };

  const canPost = tweet.status === 'queued' || tweet.status === 'failed';
  const canEdit = tweet.status === 'queued' || tweet.status === 'failed';
  const canDelete = tweet.status !== 'posting';

  // Get character count info with threading support
  const editCharInfo = getCharacterCountInfo(editContent, true);
  const tweetCharInfo = getCharacterCountInfo(tweet.content, true);
  const isOverLimit = !editCharInfo.enableThreading && editCharInfo.isOverLimit;

  return (
    <>
      <Card className={className}>
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between">
            <StatusBadge status={tweet.status} />
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(tweet.createdAt)}
            </span>
          </div>

          <div className="space-y-2">
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full px-3 py-2 border border-border bg-input text-foreground rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    rows={3}
                    placeholder="What's happening? (Long tweets will be posted as threads)"
                  />
                  <div className={`text-right text-xs mt-1 ${
                    editCharInfo.isOverLimit ? 'text-red-600 dark:text-red-400' : editCharInfo.isNearLimit ? 'text-amber-500 dark:text-amber-400' : 'text-muted-foreground'
                  }`}>
                    {editCharInfo.needsThreading ? (
                      <span>
                        {editCharInfo.firstPartLength}/280 (first part)
                        <span className="ml-2 text-muted-foreground/70">
                          {editCharInfo.current} total, {editCharInfo.threadParts} parts
                        </span>
                      </span>
                    ) : (
                      <span>{editCharInfo.current}/280</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-card-foreground mb-1">
                    Custom schedule time (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={editScheduledFor}
                    onChange={(e) => setEditScheduledFor(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-2 py-1 border border-border bg-input text-foreground rounded text-xs focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty to post at next scheduled window
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Thread Preview or Regular Content */}
                {tweetCharInfo.needsThreading ? (
                  <div className="space-y-3">
                    {/* Thread Header */}
                    <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                      <span>🧵</span>
                      <span>Thread ({tweetCharInfo.threadParts} parts)</span>
                    </div>

                    {/* Thread Parts */}
                    {(() => {
                      const thread = splitTextIntoThread(tweet.content);
                      return thread.parts.map((part, index) => (
                        <div key={index}>
                          <div className="text-sm text-card-foreground whitespace-pre-wrap bg-muted rounded-lg p-3 border-l-4 border-blue-200 dark:border-blue-800">
                            <div className="flex items-start gap-2">
                              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium bg-blue-100 dark:bg-blue-900/20 rounded-full px-2 py-1 flex-shrink-0">
                                {index + 1}
                              </span>
                              <span className="flex-1">{part}</span>
                            </div>
                          </div>
                          {/* Dotted separator between parts */}
                          {index < thread.parts.length - 1 && (
                            <div className="flex justify-center py-2">
                              <div className="border-t-2 border-dotted border-gray-300 w-16"></div>
                            </div>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                ) : (
                  <p className="text-sm text-card-foreground whitespace-pre-wrap">
                    {tweet.content}
                  </p>
                )}

                {/* Media Attachments */}
                {tweet.media && tweet.media.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {tweet.media.map((media) => (
                      <div
                        key={media.id}
                        className="relative aspect-square border border-border rounded-lg overflow-hidden bg-muted"
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
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto mb-1"></div>
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

                {tweet.scheduledFor && (
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    📅 Scheduled for {formatDate(tweet.scheduledFor)}
                  </p>
                )}

                {tweet.postedAt && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    ✅ Posted {formatRelativeTime(tweet.postedAt)}
                  </p>
                )}

                {tweet.error && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    ❌ Error: {tweet.error}
                  </p>
                )}
              </>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex justify-between items-center pt-0">
          <div className="text-xs text-muted-foreground space-y-1">
            <div>
              {isEditing ? (
                editCharInfo.needsThreading ? (
                  <span>
                    {editCharInfo.firstPartLength}/280 (first part), {editCharInfo.threadParts} parts total
                  </span>
                ) : (
                  <span>{editCharInfo.current}/280 characters</span>
                )
              ) : (
                tweetCharInfo.needsThreading ? (
                  <span>
                    {tweetCharInfo.firstPartLength}/280 (first part), {tweetCharInfo.threadParts} parts total
                  </span>
                ) : (
                  <span>{tweetCharInfo.current}/280 characters</span>
                )
              )}
            </div>
            {tweet.media && tweet.media.length > 0 && (
              <div>
                📷 {tweet.media.length} image{tweet.media.length > 1 ? 's' : ''}
              </div>
            )}
            {!isEditing && tweetCharInfo.needsThreading && (
              <div className="text-blue-600 dark:text-blue-400">
                🧵 Will post as thread
              </div>
            )}
          </div>

          <div className="flex space-x-2">
            {isEditing ? (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={isOverLimit || editContent.trim().length === 0}
                >
                  Save
                </Button>
              </>
            ) : (
              <>
                {canEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleEdit}
                  >
                    ✏️ Edit
                  </Button>
                )}

                {canPost && (
                  <Button
                    size="sm"
                    onClick={handlePostNow}
                    loading={isPosting}
                    disabled={isPosting}
                  >
                    {tweet.status === 'failed'
                      ? (tweetCharInfo.needsThreading ? 'Retry Thread' : 'Retry')
                      : (tweetCharInfo.needsThreading ? 'Post Thread' : 'Post Now')
                    }
                  </Button>
                )}

                {canDelete && (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setIsDeleteModalOpen(true)}
                    disabled={isDeleting}
                  >
                    Delete
                  </Button>
                )}
              </>
            )}
          </div>
        </CardFooter>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Tweet"
        description="Are you sure you want to delete this tweet? This action cannot be undone."
      >
        <ModalContent>
          <div className="bg-muted rounded-md p-3">
            <p className="text-sm text-card-foreground">
              {truncateText(tweet.content, 100)}
            </p>
          </div>
        </ModalContent>

        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => setIsDeleteModalOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            loading={isDeleting}
          >
            Delete Tweet
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export { TweetCard };
