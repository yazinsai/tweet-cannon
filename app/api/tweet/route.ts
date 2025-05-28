import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, cookies } = await request.json();

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Tweet message is required' },
        { status: 400 }
      );
    }

    if (message.length > 280) {
      return NextResponse.json(
        { error: 'Tweet message is too long (max 280 characters)' },
        { status: 400 }
      );
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

    console.log('Posting tweet:', message.substring(0, 50) + '...');
    console.log('Using cookies with ct0:', parsedCookies.ct0?.substring(0, 20) + '...');

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

    // Prepare tweet data
    const tweetData = {
      text: message,
      media: {
        media_entities: [],
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
          tweet_text: message,
          dark_request: false,
          media: {
            media_entities: [],
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
        text: message
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
