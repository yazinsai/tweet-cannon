import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { cookies } = await request.json();

    if (!cookies) {
      return NextResponse.json(
        { error: 'No cookies provided' },
        { status: 400 }
      );
    }

    // Handle both cookie string and cookie object formats
    let cookieString: string;
    let parsedCookies: Record<string, string>;

    if (typeof cookies === 'string') {
      // Parse cookie string format
      cookieString = cookies;
      parsedCookies = {};
      const pairs = cookies.split(';');

      for (const pair of pairs) {
        const [name, value] = pair.trim().split('=');
        if (name && value) {
          parsedCookies[name] = value;
        }
      }
    } else {
      // Handle cookie object format
      parsedCookies = cookies;
      cookieString = Object.entries(cookies)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ');
    }

    // Validate required cookies
    if (!parsedCookies.ct0 || (!parsedCookies.auth_token && !parsedCookies.twid)) {
      return NextResponse.json(
        { error: 'Missing required cookies (ct0 and auth_token/twid)' },
        { status: 400 }
      );
    }

    console.log('Available cookies:', Object.keys(parsedCookies));
    console.log('Cookie values:', Object.fromEntries(
      Object.entries(parsedCookies).map(([k, v]) => [k, typeof v === 'string' ? v.substring(0, 20) + '...' : v])
    ));

    // Prepare headers for Twitter API request with proper authorization
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
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
      'Referer': 'https://twitter.com/home',
      'Origin': 'https://twitter.com',
      'Cookie': cookieString
    };

    // Add authorization header if we have auth_token
    if (parsedCookies.auth_token) {
      headers['Authorization'] = `Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA`;
    }

    console.log('Validating cookies with Twitter API...');
    console.log('Cookie string length:', cookieString.length);
    console.log('Headers:', Object.keys(headers));

    // Try a simple request to Twitter's main page to validate cookies
    let response;
    try {
      // Just try to access the main Twitter page with cookies
      response = await fetch('https://x.com/home', {
        method: 'GET',
        headers: {
          'Cookie': cookieString,
          'User-Agent': headers['User-Agent'],
        },
      });

      console.log('Twitter home page response status:', response.status);

      // If we get a redirect to login, cookies are invalid
      if (response.status === 302 || response.status === 301) {
        const location = response.headers.get('location');
        if (location && (location.includes('/login') || location.includes('/i/flow/login'))) {
          console.log('Redirected to login page - cookies invalid');
          return NextResponse.json(
            { valid: false, error: 'Cookies appear to be expired or invalid (redirected to login)' },
            { status: 401 }
          );
        }
      }

    } catch (error) {
      console.error('Network error:', error);
      throw error;
    }

    console.log('Twitter home page response status:', response.status);

    // If we get a 200 response, cookies are likely valid
    if (response.ok) {
      console.log('Twitter home page accessible - cookies appear valid');
      return NextResponse.json({
        valid: true,
        message: 'Cookies validated successfully'
      });
    }

    // Handle various error cases
    if (response.status === 401 || response.status === 403) {
      return NextResponse.json(
        { valid: false, error: 'Invalid or expired cookies (authentication failed)' },
        { status: 401 }
      );
    }

    // For other errors, still consider cookies potentially valid
    // (Twitter might be having issues, rate limiting, etc.)
    if (response.status >= 400 && response.status < 500) {
      console.log('Got client error but cookies format is valid');
      return NextResponse.json({
        valid: true,
        message: 'Cookies format is valid (Twitter returned client error but this is likely not a cookie issue)',
        warning: `Twitter returned ${response.status} but cookies appear properly formatted`
      });
    }

    // Server errors - assume cookies are valid but Twitter is having issues
    return NextResponse.json({
      valid: true,
      message: 'Cookies format is valid (Twitter server error - not a cookie issue)',
      warning: `Twitter returned ${response.status} but cookies appear properly formatted`
    });

  } catch (error) {
    console.error('Cookie validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
