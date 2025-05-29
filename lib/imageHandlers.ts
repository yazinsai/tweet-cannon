/**
 * Shared image handling utilities for paste and drag/drop functionality
 */

import { MediaAttachment } from './types';
import { createMediaAttachment, validateImageFile } from './media';

export interface ImageHandlerOptions {
  maxImages: number;
  currentImages: MediaAttachment[];
  onImagesChange: (images: MediaAttachment[]) => void;
  onError?: (error: string) => void;
}

/**
 * Handle paste events to extract images from clipboard
 */
export async function handlePasteImages(
  event: ClipboardEvent,
  options: ImageHandlerOptions
): Promise<void> {
  const { maxImages, currentImages, onImagesChange, onError } = options;
  
  if (!event.clipboardData) return;

  const items = Array.from(event.clipboardData.items);
  const imageItems = items.filter(item => item.type.startsWith('image/'));

  if (imageItems.length === 0) return;

  // Prevent default paste behavior when we have images
  event.preventDefault();

  // Check if adding these images would exceed the limit
  if (currentImages.length + imageItems.length > maxImages) {
    onError?.(`Maximum ${maxImages} images allowed`);
    return;
  }

  const newAttachments: MediaAttachment[] = [];

  for (const item of imageItems) {
    const file = item.getAsFile();
    if (!file) continue;

    // Validate the file
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      onError?.(validation.error || 'Invalid image file');
      continue;
    }

    try {
      const attachment = await createMediaAttachment(file);
      newAttachments.push(attachment);
    } catch (err) {
      console.error('Failed to create attachment from paste:', err);
      onError?.('Failed to process pasted image');
    }
  }

  if (newAttachments.length > 0) {
    onImagesChange([...currentImages, ...newAttachments]);
  }
}

/**
 * Handle drag events for visual feedback
 */
export function handleDragEvents(
  event: DragEvent,
  setDragActive: (active: boolean) => void
): void {
  event.preventDefault();
  event.stopPropagation();

  if (event.type === 'dragenter' || event.type === 'dragover') {
    // Check if the drag contains files
    const hasFiles = event.dataTransfer?.types.includes('Files');
    if (hasFiles) {
      setDragActive(true);
    }
  } else if (event.type === 'dragleave') {
    // Only set inactive if we're leaving the element entirely
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragActive(false);
    }
  }
}

/**
 * Handle drop events to extract images from drag/drop
 */
export async function handleDropImages(
  event: DragEvent,
  options: ImageHandlerOptions,
  setDragActive: (active: boolean) => void
): Promise<void> {
  event.preventDefault();
  event.stopPropagation();
  setDragActive(false);

  const { maxImages, currentImages, onImagesChange, onError } = options;

  if (!event.dataTransfer?.files) return;

  const files = Array.from(event.dataTransfer.files);
  const imageFiles = files.filter(file => file.type.startsWith('image/'));

  if (imageFiles.length === 0) return;

  // Check if adding these files would exceed the limit
  if (currentImages.length + imageFiles.length > maxImages) {
    onError?.(`Maximum ${maxImages} images allowed`);
    return;
  }

  const newAttachments: MediaAttachment[] = [];

  for (const file of imageFiles) {
    // Validate each file
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      onError?.(validation.error || 'Invalid image file');
      continue;
    }

    try {
      const attachment = await createMediaAttachment(file);
      newAttachments.push(attachment);
    } catch (err) {
      console.error('Failed to create attachment from drop:', err);
      onError?.('Failed to process dropped image');
    }
  }

  if (newAttachments.length > 0) {
    onImagesChange([...currentImages, ...newAttachments]);
  }
}

/**
 * Create event handlers for a textarea or input element
 */
export function createImageEventHandlers(
  options: ImageHandlerOptions,
  dragActive: boolean,
  setDragActive: (active: boolean) => void
) {
  return {
    onPaste: (event: React.ClipboardEvent) => {
      handlePasteImages(event.nativeEvent, options);
    },
    
    onDragEnter: (event: React.DragEvent) => {
      handleDragEvents(event.nativeEvent, setDragActive);
    },
    
    onDragOver: (event: React.DragEvent) => {
      handleDragEvents(event.nativeEvent, setDragActive);
    },
    
    onDragLeave: (event: React.DragEvent) => {
      handleDragEvents(event.nativeEvent, setDragActive);
    },
    
    onDrop: (event: React.DragEvent) => {
      handleDropImages(event.nativeEvent, options, setDragActive);
    }
  };
}
