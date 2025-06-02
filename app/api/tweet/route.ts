import { NextRequest, NextResponse } from 'next/server';
import { splitTextIntoThread, validateThread, ThreadPostResult } from '@/utils/tweetThreading';

export async function POST(request: NextRequest) {
  try {
    const { message, cookies, mediaIds, enableThreading = true } = await request.json();

    // Allow empty message if there are media attachments
    if ((!message || !message.trim()) && (!mediaIds || mediaIds.length === 0)) {
      return NextResponse.json(
        { error: 'Tweet message or media is required' },
        { status: 400 }
      );
    }

    // Check if message needs threading
    const needsThreading = message && message.length > 280;

    if (needsThreading && !enableThreading) {
      return NextResponse.json(
        { error: 'Tweet message is too long (max 280 characters)' },
        { status: 400 }
      );
    }

    // Handle threading if needed
    if (needsThreading && enableThreading) {
      return await handleTweetThread(message, cookies, mediaIds);
    }

    // Check if cookies were provided
    if (!cookies) {
      return NextResponse.json(
        { error: 'No authentication cookies found. Please set up authentication first.' },
        { status: 401 }
      );
    }

    // Parse cookies to get required tokens
    const parsedCookies: Record<string, string> = {};
    const pairs = cookies.split(';');

    for (const pair of pairs) {
      const [name, value] = pair.trim().split('=');
      if (name && value) {
        parsedCookies[name] = value;
      }
    }

    if (!parsedCookies.ct0 || (!parsedCookies.auth_token && !parsedCookies.twid)) {
      return NextResponse.json(
        { error: 'Invalid authentication cookies. Please re-authenticate.' },
        { status: 401 }
      );
    }

    console.log('Posting tweet:', message ? message.substring(0, 50) + '...' : '[media only]');
    console.log('Using cookies with ct0:', parsedCookies.ct0?.substring(0, 20) + '...');
    console.log('Media IDs:', mediaIds);

    // Generate a random client transaction ID (like in the curl)
    const generateTransactionId = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      let result = '';
      for (let i = 0; i < 100; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    // Prepare headers for Twitter API request (matching the curl exactly)
    const headers: Record<string, string> = {
      'accept': '*/*',
      'accept-language': 'en-US,en;q=0.9',
      'authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
      'cache-control': 'no-cache',
      'content-type': 'application/json',
      'dnt': '1',
      'origin': 'https://x.com',
      'pragma': 'no-cache',
      'priority': 'u=1, i',
      'referer': 'https://x.com/home',
      'sec-ch-ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      'x-client-transaction-id': generateTransactionId(),
      'x-csrf-token': parsedCookies.ct0,
      'x-twitter-active-user': 'yes',
      'x-twitter-auth-type': 'OAuth2Session',
      'x-twitter-client-language': 'en',
      'Cookie': cookies
    };

    // Prepare media entities
    const mediaEntities = mediaIds && mediaIds.length > 0
      ? mediaIds.map((mediaId: string) => ({ media_id: mediaId, tagged_users: [] }))
      : [];

    // Prepare tweet data
    const tweetData = {
      text: message || '',
      media: {
        media_entities: mediaEntities,
        possibly_sensitive: false
      }
    };

    console.log('Sending tweet to Twitter API...');

    // Post tweet to Twitter using the correct endpoint and format
    const response = await fetch('https://x.com/i/api/graphql/eX0PqfsNKJZ1jAgyP_rHjQ/CreateTweet', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        variables: {
          tweet_text: message || '',
          dark_request: false,
          media: {
            media_entities: mediaEntities,
            possibly_sensitive: false
          },
          semantic_annotation_ids: [],
          disallowed_reply_options: null
        },
        features: {
          premium_content_api_read_enabled: false,
          communities_web_enable_tweet_community_results_fetch: true,
          c9s_tweet_anatomy_moderator_badge_enabled: true,
          responsive_web_grok_analyze_button_fetch_trends_enabled: false,
          responsive_web_grok_analyze_post_followups_enabled: true,
          responsive_web_jetfuel_frame: false,
          responsive_web_grok_share_attachment_enabled: true,
          responsive_web_edit_tweet_api_enabled: true,
          graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
          view_counts_everywhere_api_enabled: true,
          longform_notetweets_consumption_enabled: true,
          responsive_web_twitter_article_tweet_consumption_enabled: true,
          tweet_awards_web_tipping_enabled: false,
          responsive_web_grok_show_grok_translated_post: false,
          responsive_web_grok_analysis_button_from_backend: true,
          creator_subscriptions_quote_tweet_preview_enabled: false,
          longform_notetweets_rich_text_read_enabled: true,
          longform_notetweets_inline_media_enabled: true,
          profile_label_improvements_pcf_label_in_post_enabled: true,
          rweb_tipjar_consumption_enabled: true,
          verified_phone_label_enabled: false,
          articles_preview_enabled: true,
          responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
          freedom_of_speech_not_reach_fetch_enabled: true,
          standardized_nudges_misinfo: true,
          tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
          responsive_web_grok_image_annotation_enabled: true,
          responsive_web_graphql_timeline_navigation_enabled: true,
          responsive_web_enhance_cards_enabled: false
        },
        queryId: "eX0PqfsNKJZ1jAgyP_rHjQ"
      })
    });

    console.log('Twitter API response status:', response.status);
    console.log('Twitter API response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Twitter API error:', errorText);

      // Enhanced error classification for better error handling
      let errorMessage = `Failed to post tweet: ${response.status} ${response.statusText}`;
      let errorCode = response.status.toString();

      if (response.status === 401 || response.status === 403) {
        errorMessage = 'Authentication failed. Please re-authenticate with Twitter.';
      } else if (response.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
      } else if (response.status === 400) {
        // Try to parse Twitter-specific error codes
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.errors) {
            const twitterError = errorData.errors[0];
            if (twitterError.code === 187) {
              errorMessage = 'Duplicate tweet detected.';
              errorCode = '187';
            } else if (twitterError.code === 324) {
              errorMessage = 'Tweet content violates Twitter policies.';
              errorCode = '324';
            } else {
              errorMessage = twitterError.message || errorMessage;
              errorCode = twitterError.code?.toString() || errorCode;
            }
          }
        } catch (parseError) {
          // If parsing fails, use the original error
        }
      } else if (response.status >= 500) {
        errorMessage = 'Twitter server error. Please try again later.';
      }

      return NextResponse.json(
        {
          error: errorMessage,
          code: errorCode,
          details: errorText,
          timestamp: new Date().toISOString(),
          retryable: [429, 500, 502, 503, 504].includes(response.status)
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('Tweet posted successfully!');

    return NextResponse.json({
      success: true,
      tweet: {
        id: result.data?.create_tweet?.tweet_results?.result?.rest_id,
        text: message || '',
        mediaCount: mediaEntities.length
      }
    });

  } catch (error) {
    console.error('Tweet posting error:', error);

    // Classify the error type for better handling
    let errorMessage = 'Internal server error';
    let errorCode = '500';
    let retryable = true;

    if (error instanceof Error) {
      errorMessage = error.message;

      // Network errors are typically retryable
      if (error.message.includes('fetch') || error.message.includes('network')) {
        errorMessage = 'Network error. Please check your connection.';
        errorCode = 'NETWORK_ERROR';
        retryable = true;
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timeout. Please try again.';
        errorCode = 'TIMEOUT';
        retryable = true;
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        code: errorCode,
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        retryable
      },
      { status: 500 }
    );
  }
}

/**
 * Handle posting a tweet thread
 */
async function handleTweetThread(
  message: string,
  cookies: string,
  mediaIds?: string[]
): Promise<NextResponse> {
  try {
    console.log('Handling tweet thread for message length:', message.length);

    // Split the message into thread parts
    const thread = splitTextIntoThread(message);
    console.log(`Split into ${thread.totalParts} parts`);

    // Validate the thread
    const validation = validateThread(thread);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: `Thread validation failed: ${validation.errors.join(', ')}` },
        { status: 400 }
      );
    }

    // Parse cookies
    const parsedCookies: Record<string, string> = {};
    cookies.split(';').forEach(cookie => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) {
        parsedCookies[key] = value;
      }
    });

    if (!parsedCookies.ct0) {
      return NextResponse.json(
        { error: 'Missing required authentication token (ct0)' },
        { status: 401 }
      );
    }

    // Generate transaction ID
    const generateTransactionId = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      let result = '';
      for (let i = 0; i < 100; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    // Prepare headers
    const headers = {
      'accept': '*/*',
      'accept-language': 'en-US,en;q=0.9',
      'authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
      'cache-control': 'no-cache',
      'content-type': 'application/json',
      'referer': 'https://x.com/compose/tweet',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      'x-client-transaction-id': generateTransactionId(),
      'x-csrf-token': parsedCookies.ct0,
      'x-twitter-active-user': 'yes',
      'x-twitter-auth-type': 'OAuth2Session',
      'x-twitter-client-language': 'en',
      'Cookie': cookies
    };

    const postedTweets: Array<{ id: string; text: string; partNumber: number }> = [];
    let lastTweetId: string | null = null;

    // Post each part of the thread
    for (let i = 0; i < thread.parts.length; i++) {
      const part = thread.parts[i];
      const isFirstTweet = i === 0;

      console.log(`Posting thread part ${i + 1}/${thread.totalParts}: ${part.substring(0, 50)}...`);

      // Prepare media entities (only for first tweet)
      const mediaEntities = isFirstTweet && mediaIds && mediaIds.length > 0
        ? mediaIds.map((mediaId: string) => ({ media_id: mediaId, tagged_users: [] }))
        : [];

      // Prepare tweet variables
      const variables: any = {
        tweet_text: part,
        dark_request: false,
        media: {
          media_entities: mediaEntities,
          possibly_sensitive: false
        },
        semantic_annotation_ids: [],
        disallowed_reply_options: null
      };

      // Add reply information for subsequent tweets
      if (!isFirstTweet && lastTweetId) {
        variables.reply = {
          in_reply_to_tweet_id: lastTweetId,
          exclude_reply_user_ids: []
        };
        variables.batch_compose = "BatchSubsequent";
      } else if (isFirstTweet) {
        variables.batch_compose = "BatchFirst";
      }

      const tweetData = {
        variables,
        features: {
          premium_content_api_read_enabled: false,
          communities_web_enable_tweet_community_results_fetch: true,
          c9s_tweet_anatomy_moderator_badge_enabled: true,
          responsive_web_grok_analyze_button_fetch_trends_enabled: false,
          responsive_web_grok_analyze_post_followups_enabled: true,
          responsive_web_jetfuel_frame: false,
          responsive_web_grok_share_attachment_enabled: true,
          responsive_web_edit_tweet_api_enabled: true,
          graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
          view_counts_everywhere_api_enabled: true,
          longform_notetweets_consumption_enabled: true,
          responsive_web_twitter_article_tweet_consumption_enabled: true,
          tweet_awards_web_tipping_enabled: false,
          responsive_web_grok_show_grok_translated_post: false,
          responsive_web_grok_analysis_button_from_backend: true,
          creator_subscriptions_quote_tweet_preview_enabled: false,
          longform_notetweets_rich_text_read_enabled: true,
          longform_notetweets_inline_media_enabled: true,
          profile_label_improvements_pcf_label_in_post_enabled: true,
          rweb_tipjar_consumption_enabled: true,
          verified_phone_label_enabled: false,
          articles_preview_enabled: true,
          responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
          freedom_of_speech_not_reach_fetch_enabled: true,
          standardized_nudges_misinfo: true,
          tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
          responsive_web_grok_image_annotation_enabled: true,
          responsive_web_graphql_timeline_navigation_enabled: true,
          responsive_web_enhance_cards_enabled: false
        },
        queryId: "DM2Ap9n3_LGeXehtiljvww"
      };

      // Post the tweet
      const response = await fetch('https://x.com/i/api/graphql/DM2Ap9n3_LGeXehtiljvww/CreateTweet', {
        method: 'POST',
        headers,
        body: JSON.stringify(tweetData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to post thread part ${i + 1}:`, errorText);

        return NextResponse.json(
          {
            error: `Failed to post thread part ${i + 1}: ${response.status} ${response.statusText}`,
            partialSuccess: postedTweets.length > 0,
            postedTweets
          },
          { status: response.status }
        );
      }

      const result = await response.json();
      const tweetId = result.data?.create_tweet?.tweet_results?.result?.rest_id;

      if (!tweetId) {
        console.error(`No tweet ID returned for part ${i + 1}`);
        return NextResponse.json(
          {
            error: `Failed to get tweet ID for part ${i + 1}`,
            partialSuccess: postedTweets.length > 0,
            postedTweets
          },
          { status: 500 }
        );
      }

      postedTweets.push({
        id: tweetId,
        text: part,
        partNumber: i + 1
      });

      lastTweetId = tweetId;
      console.log(`Successfully posted thread part ${i + 1}, ID: ${tweetId}`);

      // Add a small delay between tweets to avoid rate limiting
      if (i < thread.parts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`Thread posted successfully! ${postedTweets.length} tweets posted.`);

    return NextResponse.json({
      success: true,
      thread: {
        totalParts: thread.totalParts,
        originalLength: thread.originalLength,
        tweets: postedTweets
      }
    });

  } catch (error) {
    console.error('Thread posting error:', error);
    return NextResponse.json(
      {
        error: 'Failed to post thread',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
