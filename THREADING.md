# Tweet Threading Feature

## Overview

Tweet Cannon now supports automatic tweet threading for content longer than 280 characters. When you compose a tweet that exceeds the character limit, it will automatically be split into multiple connected tweets (a thread) and posted sequentially.

## How It Works

### Automatic Text Splitting

The system intelligently splits long tweets using the following priority:

1. **Natural Break Points**: Looks for double newlines (`\n\n`) before the 280-character limit
2. **Word Boundaries**: If no natural breaks are found, splits at the last space or single newline
3. **Character Limit**: As a last resort, splits at the character limit

### Thread Posting Process

When posting a thread:

1. **First Tweet**: Posted with `batch_compose: "BatchFirst"`
2. **Subsequent Tweets**: Posted as replies with `batch_compose: "BatchSubsequent"` and `in_reply_to_tweet_id`
3. **Sequential Posting**: Each tweet waits for the previous one to complete before posting
4. **Error Handling**: If any part fails, the process stops and reports partial success

## API Changes

### Request Format

```json
{
  "message": "Your long tweet content here...",
  "cookies": "auth_token=...; ct0=...",
  "mediaIds": ["optional_media_id"],
  "enableThreading": true
}
```

### Response Format

For single tweets (≤280 characters):
```json
{
  "success": true,
  "tweet": {
    "id": "1234567890",
    "text": "Your tweet content",
    "mediaCount": 0
  }
}
```

For threads (>280 characters):
```json
{
  "success": true,
  "thread": {
    "totalParts": 3,
    "originalLength": 850,
    "tweets": [
      { "id": "1234567890", "text": "First part...", "partNumber": 1 },
      { "id": "1234567891", "text": "Second part...", "partNumber": 2 },
      { "id": "1234567892", "text": "Third part...", "partNumber": 3 }
    ]
  }
}
```

## UI Features

### Character Count Display

- Shows current character count and threading status
- Displays "🧵 X parts" when threading is needed
- Shows first part character count for threads
- Color coding: gray (normal), amber (near limit), red (over limit without threading)

### Smart Button Text

- "Post Tweet" for single tweets
- "Post Thread" for threaded content
- "Retry Thread" for failed thread attempts

### Thread Preview

The UI shows:
- Total character count
- Number of thread parts
- First part preview
- Threading warnings/indicators

## Best Practices

### Content Structure

For best results, structure your long-form content with natural breaks:

```
This is the first main point of my thread.

This is the second point that builds on the first.

And this is my conclusion that ties everything together.
```

### Media Attachments

- Media is only attached to the first tweet in a thread
- Subsequent tweets in the thread will not have media attachments
- This follows Twitter's standard threading behavior

### Character Limits

- Each thread part must be ≤280 characters
- Maximum 25 parts per thread (Twitter's limit)
- System validates each part before posting

## Error Handling

### Partial Success

If a thread fails partway through posting:

```json
{
  "error": "Failed to post thread part 3: 401 Unauthorized",
  "partialSuccess": true,
  "postedTweets": [
    { "id": "1234567890", "text": "First part...", "partNumber": 1 },
    { "id": "1234567891", "text": "Second part...", "partNumber": 2 }
  ]
}
```

### Common Errors

- **Authentication**: Invalid or expired cookies
- **Rate Limiting**: Too many requests in a short time
- **Content Policy**: Tweet content violates Twitter's policies
- **Network Issues**: Connection problems during posting

## Configuration

### Enabling/Disabling Threading

Threading can be controlled via the `enableThreading` parameter:

- `true` (default): Long tweets are automatically threaded
- `false`: Long tweets are rejected with an error

### Component Props

```tsx
<TweetComposer 
  enableThreading={true}  // Enable threading support
  placeholder="What's happening? (Long tweets will be posted as threads)"
/>
```

## Technical Implementation

### Key Files

- `utils/tweetThreading.ts`: Core threading logic
- `app/api/tweet/route.ts`: API endpoint with threading support
- `components/shared/TweetComposer.tsx`: UI with threading indicators
- `utils/tweetUtils.ts`: Updated validation and character counting

### Threading Algorithm

1. Check if content exceeds 280 characters
2. Split at natural break points (double newlines)
3. Fall back to word boundaries if needed
4. Validate all parts are within limits
5. Post sequentially with proper reply structure

## Testing

Run the test script to verify threading functionality:

```bash
node test-threading.js
```

This tests various scenarios including natural breaks, word boundaries, and edge cases.
