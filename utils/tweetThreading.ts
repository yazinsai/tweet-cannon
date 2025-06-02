/**
 * Tweet threading utilities for handling long tweets
 * Splits tweets at natural break points (double newlines) and manages thread posting
 */

export interface TweetThread {
  parts: string[];
  totalParts: number;
  originalLength: number;
}

export interface ThreadPostResult {
  success: boolean;
  tweets?: Array<{
    id: string;
    text: string;
    partNumber: number;
  }>;
  error?: string;
}

/**
 * Split text into tweet-sized chunks at natural break points
 * Prioritizes splitting at double newlines (\n\n) before the 280 character limit
 */
export function splitTextIntoThread(text: string, maxLength: number = 280): TweetThread {
  // If text is within limit, return as single tweet
  if (text.length <= maxLength) {
    return {
      parts: [text],
      totalParts: 1,
      originalLength: text.length
    };
  }

  const parts: string[] = [];
  let remainingText = text;

  while (remainingText.length > 0) {
    if (remainingText.length <= maxLength) {
      // Remaining text fits in one tweet
      parts.push(remainingText.trim());
      break;
    }

    // Look for natural break point (double newline) before the limit
    const searchText = remainingText.substring(0, maxLength);
    const lastDoubleNewline = searchText.lastIndexOf('\n\n');

    let splitPoint: number;
    
    if (lastDoubleNewline > 0) {
      // Found a natural break point, split there
      splitPoint = lastDoubleNewline;
    } else {
      // No natural break point found, split at word boundary
      const lastSpace = searchText.lastIndexOf(' ');
      const lastNewline = searchText.lastIndexOf('\n');
      
      // Use the latest word/line boundary
      splitPoint = Math.max(lastSpace, lastNewline);
      
      // If no word boundary found, force split at character limit
      if (splitPoint <= 0) {
        splitPoint = maxLength - 1;
      }
    }

    // Extract the current part
    const currentPart = remainingText.substring(0, splitPoint).trim();
    if (currentPart.length > 0) {
      parts.push(currentPart);
    }

    // Update remaining text
    remainingText = remainingText.substring(splitPoint).trim();
  }

  return {
    parts: parts.filter(part => part.length > 0), // Remove empty parts
    totalParts: parts.length,
    originalLength: text.length
  };
}

/**
 * Check if text needs to be threaded
 */
export function needsThreading(text: string, maxLength: number = 280): boolean {
  return text.length > maxLength;
}

/**
 * Get thread preview info for UI display
 */
export function getThreadPreview(text: string, maxLength: number = 280): {
  needsThreading: boolean;
  partCount: number;
  firstPart: string;
  totalLength: number;
} {
  const needsThread = needsThreading(text, maxLength);
  
  if (!needsThread) {
    return {
      needsThreading: false,
      partCount: 1,
      firstPart: text,
      totalLength: text.length
    };
  }

  const thread = splitTextIntoThread(text, maxLength);
  
  return {
    needsThreading: true,
    partCount: thread.totalParts,
    firstPart: thread.parts[0] || '',
    totalLength: text.length
  };
}

/**
 * Validate thread parts to ensure they're all within limits
 */
export function validateThread(thread: TweetThread, maxLength: number = 280): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (thread.parts.length === 0) {
    errors.push('Thread cannot be empty');
  }

  thread.parts.forEach((part, index) => {
    if (part.length > maxLength) {
      errors.push(`Part ${index + 1} exceeds ${maxLength} characters (${part.length})`);
    }
    if (part.trim().length === 0) {
      errors.push(`Part ${index + 1} is empty`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}
