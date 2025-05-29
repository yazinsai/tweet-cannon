'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Button } from './Button';
import { MediaAttachment } from '@/lib/types';
import { MEDIA_LIMITS, createMediaAttachment, validateImageFile } from '@/lib/media';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  images: MediaAttachment[];
  onImagesChange: (images: MediaAttachment[]) => void;
  maxImages?: number;
  disabled?: boolean;
  className?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  images,
  onImagesChange,
  maxImages = MEDIA_LIMITS.MAX_IMAGES,
  disabled = false,
  className
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string>('');

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setError('');
    const fileArray = Array.from(files);

    // Check if adding these files would exceed the limit
    if (images.length + fileArray.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed`);
      return;
    }

    const newAttachments: MediaAttachment[] = [];

    for (const file of fileArray) {
      // Validate each file
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        setError(validation.error || 'Invalid file');
        continue;
      }

      try {
        const attachment = await createMediaAttachment(file);
        newAttachments.push(attachment);
      } catch (err) {
        console.error('Failed to create attachment:', err);
        setError('Failed to process image');
      }
    }

    if (newAttachments.length > 0) {
      onImagesChange([...images, ...newAttachments]);
    }
  }, [images, maxImages, onImagesChange]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFiles]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  }, [disabled, handleFiles]);

  const removeImage = useCallback((id: string) => {
    onImagesChange(images.filter(img => img.id !== id));
  }, [images, onImagesChange]);

  const openFileDialog = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const canAddMore = images.length < maxImages && !disabled;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Upload Area */}
      {canAddMore && (
        <div
          className={cn(
            'relative border-2 border-dashed rounded-lg p-6 text-center transition-colors',
            dragActive
              ? 'border-slate-500 bg-slate-50'
              : 'border-gray-300 hover:border-gray-400',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={MEDIA_LIMITS.SUPPORTED_FORMATS.join(',')}
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled}
          />

          <div className="space-y-2">
            <div className="text-gray-600">
              📷 Drop images here or{' '}
              <button
                type="button"
                onClick={openFileDialog}
                className="text-blue-600 hover:text-blue-700 underline"
                disabled={disabled}
              >
                browse
              </button>
            </div>
            <div className="text-sm text-gray-500">
              PNG, JPG, GIF up to {MEDIA_LIMITS.MAX_FILE_SIZE / (1024 * 1024)}MB
            </div>
            <div className="text-sm text-gray-500">
              {images.length}/{maxImages} images
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
          {error}
        </div>
      )}

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative group border border-gray-200 rounded-lg overflow-hidden bg-gray-50"
            >
              <div className="aspect-square">
                <img
                  src={image.preview}
                  alt="Upload preview"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Upload Status Overlay */}
              {image.uploadStatus === 'uploading' && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
                    <div className="text-sm">
                      {image.uploadProgress ? `${Math.round(image.uploadProgress)}%` : 'Uploading...'}
                    </div>
                  </div>
                </div>
              )}

              {/* Error Overlay */}
              {image.uploadStatus === 'failed' && (
                <div className="absolute inset-0 bg-red-500 bg-opacity-75 flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="text-sm font-medium">Upload Failed</div>
                    {image.error && (
                      <div className="text-xs mt-1">{image.error}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Success Indicator */}
              {image.uploadStatus === 'uploaded' && (
                <div className="absolute top-2 left-2 bg-green-500 text-white rounded-full p-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => removeImage(image.id)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                disabled={disabled}
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {/* File Info */}
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 text-xs">
                <div className="truncate">{image.file.name}</div>
                <div>{(image.file.size / 1024).toFixed(1)} KB</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export { ImageUpload };
export type { ImageUploadProps };
