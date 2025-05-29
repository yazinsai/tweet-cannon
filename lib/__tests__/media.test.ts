/**
 * Tests for media upload functionality
 */

import { validateImageFile, createImagePreview, createMediaAttachment, MEDIA_LIMITS } from '../media';

// Mock File constructor for testing
class MockFile extends File {
  constructor(bits: BlobPart[], name: string, options?: FilePropertyBag) {
    super(bits, name, options);
  }
}

// Mock FileReader for testing
global.FileReader = class MockFileReader {
  result: string | ArrayBuffer | null = null;
  onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;

  readAsDataURL(file: Blob): void {
    setTimeout(() => {
      this.result = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      if (this.onload) {
        this.onload({ target: this } as any);
      }
    }, 0);
  }
} as any;

describe('Media Upload Utilities', () => {
  describe('validateImageFile', () => {
    it('should accept valid image files', () => {
      const validFile = new MockFile(['test'], 'test.png', { type: 'image/png' });
      Object.defineProperty(validFile, 'size', { value: 1024 * 1024 }); // 1MB

      const result = validateImageFile(validFile);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject files that are too large', () => {
      const largeFile = new MockFile(['test'], 'large.png', { type: 'image/png' });
      Object.defineProperty(largeFile, 'size', { value: MEDIA_LIMITS.MAX_FILE_SIZE + 1 });

      const result = validateImageFile(largeFile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File size too large');
    });

    it('should reject unsupported file types', () => {
      const invalidFile = new MockFile(['test'], 'test.txt', { type: 'text/plain' });
      Object.defineProperty(invalidFile, 'size', { value: 1024 });

      const result = validateImageFile(invalidFile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unsupported file format');
    });

    it('should accept all supported formats', () => {
      const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      
      supportedTypes.forEach(type => {
        const file = new MockFile(['test'], `test.${type.split('/')[1]}`, { type });
        Object.defineProperty(file, 'size', { value: 1024 });

        const result = validateImageFile(file);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('createImagePreview', () => {
    it('should create a preview URL for an image file', async () => {
      const file = new MockFile(['test'], 'test.png', { type: 'image/png' });
      
      const preview = await createImagePreview(file);
      expect(preview).toMatch(/^data:image\/png;base64,/);
    });

    it('should handle FileReader errors', async () => {
      const file = new MockFile(['test'], 'test.png', { type: 'image/png' });
      
      // Mock FileReader to simulate error
      const originalFileReader = global.FileReader;
      global.FileReader = class MockErrorFileReader {
        onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
        readAsDataURL(file: Blob): void {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror({} as any);
            }
          }, 0);
        }
      } as any;

      await expect(createImagePreview(file)).rejects.toThrow('Failed to read file');
      
      // Restore original FileReader
      global.FileReader = originalFileReader;
    });
  });

  describe('createMediaAttachment', () => {
    it('should create a media attachment with preview', async () => {
      const file = new MockFile(['test'], 'test.png', { type: 'image/png' });
      
      const attachment = await createMediaAttachment(file);
      
      expect(attachment.id).toBeDefined();
      expect(attachment.file).toBe(file);
      expect(attachment.preview).toMatch(/^data:image\/png;base64,/);
      expect(attachment.uploadStatus).toBe('pending');
      expect(attachment.mediaId).toBeUndefined();
      expect(attachment.uploadProgress).toBeUndefined();
      expect(attachment.error).toBeUndefined();
    });

    it('should generate unique IDs for different attachments', async () => {
      const file1 = new MockFile(['test1'], 'test1.png', { type: 'image/png' });
      const file2 = new MockFile(['test2'], 'test2.png', { type: 'image/png' });
      
      const attachment1 = await createMediaAttachment(file1);
      const attachment2 = await createMediaAttachment(file2);
      
      expect(attachment1.id).not.toBe(attachment2.id);
    });
  });

  describe('MEDIA_LIMITS', () => {
    it('should have correct limit values', () => {
      expect(MEDIA_LIMITS.MAX_FILE_SIZE).toBe(5 * 1024 * 1024); // 5MB
      expect(MEDIA_LIMITS.MAX_IMAGES).toBe(4);
      expect(MEDIA_LIMITS.SUPPORTED_FORMATS).toContain('image/jpeg');
      expect(MEDIA_LIMITS.SUPPORTED_FORMATS).toContain('image/png');
      expect(MEDIA_LIMITS.SUPPORTED_FORMATS).toContain('image/gif');
      expect(MEDIA_LIMITS.SUPPORTED_FORMATS).toContain('image/webp');
      expect(MEDIA_LIMITS.MAX_DIMENSION).toBe(4096);
    });
  });
});
