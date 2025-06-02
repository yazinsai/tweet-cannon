/**
 * Basic tests for storage functionality
 * Note: These are simple tests to verify the implementation works
 */

import { 
  addTweet, 
  getTweets, 
  updateTweet, 
  deleteTweet,
  getPostingConfig,
  savePostingConfig,
  clearAllData 
} from '../storage';
import { DEFAULT_POSTING_CONFIG } from '../types';

// Mock localStorage for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

// Mock crypto for testing
const cryptoMock = {
  randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
  subtle: {
    generateKey: async () => ({ type: 'secret' } as CryptoKey),
    exportKey: async () => new ArrayBuffer(32),
    importKey: async () => ({ type: 'secret' } as CryptoKey),
    encrypt: async (algorithm: any, key: CryptoKey, data: ArrayBuffer) => {
      return new ArrayBuffer(data.byteLength + 16); // Mock encrypted data
    },
    decrypt: async (algorithm: any, key: CryptoKey, data: ArrayBuffer) => {
      return data.slice(16); // Mock decrypted data
    }
  },
  getRandomValues: (array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }
};

// Setup mocks
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock
});

Object.defineProperty(global, 'crypto', {
  value: cryptoMock
});

// Helper function to run tests
function runTest(name: string, testFn: () => void | Promise<void>) {
  console.log(`\n🧪 Testing: ${name}`);
  try {
    const result = testFn();
    if (result instanceof Promise) {
      result.then(() => {
        console.log(`✅ ${name} - PASSED`);
      }).catch((error) => {
        console.error(`❌ ${name} - FAILED:`, error.message);
      });
    } else {
      console.log(`✅ ${name} - PASSED`);
    }
  } catch (error) {
    console.error(`❌ ${name} - FAILED:`, (error as Error).message);
  }
}

// Test functions
export function testBasicTweetOperations() {
  // Clear storage first
  clearAllData();
  
  // Test adding a tweet
  const tweet = addTweet({
    content: 'This is a test tweet!'
  });
  
  if (!tweet.id || tweet.content !== 'This is a test tweet!' || tweet.status !== 'queued') {
    throw new Error('Tweet creation failed');
  }
  
  // Test getting tweets
  const tweets = getTweets();
  if (tweets.length !== 1 || tweets[0].id !== tweet.id) {
    throw new Error('Tweet retrieval failed');
  }
  
  // Test updating tweet
  const updatedTweet = updateTweet({
    id: tweet.id,
    status: 'posted'
  });
  
  if (updatedTweet.status !== 'posted' || !updatedTweet.postedAt) {
    throw new Error('Tweet update failed');
  }
  
  // Test deleting tweet
  const deleted = deleteTweet(tweet.id);
  if (!deleted) {
    throw new Error('Tweet deletion failed');
  }
  
  const finalTweets = getTweets();
  if (finalTweets.length !== 0) {
    throw new Error('Tweet deletion verification failed');
  }
}

export function testConfigOperations() {
  // Clear storage first
  clearAllData();
  
  // Test getting default config
  const defaultConfig = getPostingConfig();
  if (defaultConfig.enabled !== DEFAULT_POSTING_CONFIG.enabled) {
    throw new Error('Default config retrieval failed');
  }
  
  // Test saving config
  const newConfig = {
    ...DEFAULT_POSTING_CONFIG,
    enabled: true,
    interval: 12,
    randomWindow: 60
  };
  
  savePostingConfig(newConfig);
  
  // Test retrieving saved config
  const savedConfig = getPostingConfig();
  if (savedConfig.enabled !== true || savedConfig.interval !== 12) {
    throw new Error('Config save/retrieve failed');
  }
}

export function testValidation() {
  // Test invalid tweet content
  try {
    addTweet({ content: '' }, false); // Disable threading for this test
    throw new Error('Should have failed with empty content');
  } catch (error) {
    if (!(error as Error).message.includes('Invalid tweet data')) {
      throw new Error('Wrong error message for empty content');
    }
  }

  // Test tweet too long (without threading)
  try {
    addTweet({ content: 'a'.repeat(300) }, false); // Disable threading for this test
    throw new Error('Should have failed with long content');
  } catch (error) {
    if (!(error as Error).message.includes('exceeds')) {
      throw new Error('Wrong error message for long content');
    }
  }

  // Test tweet too long (with threading) - should succeed
  try {
    const longTweet = addTweet({ content: 'a'.repeat(300) }, true); // Enable threading
    if (!longTweet.id) {
      throw new Error('Should have succeeded with threading enabled');
    }
  } catch (error) {
    throw new Error('Should have succeeded with threading enabled');
  }
}

// Run all tests
export function runAllTests() {
  console.log('🚀 Starting Tweet Cannon Storage Tests...');
  
  runTest('Basic Tweet Operations', testBasicTweetOperations);
  runTest('Config Operations', testConfigOperations);
  runTest('Validation', testValidation);
  
  console.log('\n✨ All tests completed!');
}

// Export for use in browser console or Node.js
if (typeof window !== 'undefined') {
  (window as any).TweetCannonTests = {
    runAllTests,
    testBasicTweetOperations,
    testConfigOperations,
    testValidation
  };
}
