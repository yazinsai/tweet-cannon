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

    // Prepare headers for Twitter API request
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'DNT': '1',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'X-Csrf-Token': parsedCookies.ct0,
      'X-Twitter-Auth-Type': 'OAuth2Session',
      'X-Twitter-Client-Language': 'en',
      'X-Twitter-Active-User': 'yes',
      'Referer': 'https://x.com/compose/tweet',
      'Origin': 'https://x.com',
      'Cookie': cookies
    };

    // Add authorization header if we have auth_token
    if (parsedCookies.auth_token) {
      headers['Authorization'] = `Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA`;
    }

    // Prepare tweet data
    const tweetData = {
      text: message,
      media: {
        media_entities: [],
        possibly_sensitive: false
      }
    };

    console.log('Sending tweet to Twitter API...');

    // Post tweet to Twitter
    const response = await fetch('https://x.com/i/api/graphql/SoVnkahSNEkEpsFvg6r8bQ/CreateTweet', {
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
          semantic_annotation_ids: []
        },
        features: {
          tweetypie_unmention_optimization_enabled: true,
          responsive_web_edit_tweet_api_enabled: true,
          graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
          view_counts_everywhere_api_enabled: true,
          longform_notetweets_consumption_enabled: true,
          responsive_web_twitter_article_tweet_consumption_enabled: false,
          tweet_awards_web_tipping_enabled: false,
          longform_notetweets_rich_text_read_enabled: true,
          longform_notetweets_inline_media_enabled: true,
          responsive_web_graphql_exclude_directive_enabled: true,
          verified_phone_label_enabled: false,
          freedom_of_speech_not_reach_fetch_enabled: true,
          standardized_nudges_misinfo: true,
          tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
          responsive_web_media_download_video_enabled: false,
          responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
          responsive_web_graphql_timeline_navigation_enabled: true,
          responsive_web_enhance_cards_enabled: false
        }
      })
    });

    console.log('Twitter API response status:', response.status);
    console.log('Twitter API response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Twitter API error:', errorText);

      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          { error: 'Authentication failed. Please re-authenticate with Twitter.' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: `Failed to post tweet: ${response.status} ${response.statusText}`, details: errorText },
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
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
