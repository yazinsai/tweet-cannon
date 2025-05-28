/**
 * Tweet Cannon Cookie Extractor
 *
 * Instructions for users:
 * 1. Open Twitter/X in your browser and make sure you're logged in
 * 2. Open Developer Tools (F12 or right-click -> Inspect)
 * 3. Go to the Console tab
 * 4. Copy and paste this entire script
 * 5. Press Enter to run it
 * 6. Copy the output and paste it into Tweet Cannon
 */

(function() {
  'use strict';

  console.log('🚀 Tweet Cannon Cookie Extractor v1.0');
  console.log('=====================================');

  // Check if we're on Twitter/X
  const currentDomain = window.location.hostname;
  const validDomains = ['twitter.com', 'x.com'];

  if (!validDomains.some(domain => currentDomain.includes(domain))) {
    console.error('❌ Error: Please run this script on twitter.com or x.com');
    console.log('Navigate to https://twitter.com and try again.');
    return;
  }

  // Extract cookies
  function extractTwitterCookies() {
    const cookies = document.cookie;

    if (!cookies) {
      return {
        success: false,
        error: 'No cookies found. Make sure you are logged into Twitter.'
      };
    }

    // Extract required cookies - Twitter/X uses different cookie names now
    const authTokenMatch = cookies.match(/auth_token=([^;]+)/);
    const twidMatch = cookies.match(/twid=([^;]+)/);
    const ct0Match = cookies.match(/ct0=([^;]+)/);

    const authToken = authTokenMatch ? authTokenMatch[1] : null;
    const twid = twidMatch ? twidMatch[1] : null;
    const ct0 = ct0Match ? ct0Match[1] : null;

    // Twitter/X now uses 'twid' instead of 'auth_token' in some cases
    const sessionToken = authToken || twid;

    if (!sessionToken || !ct0) {
      return {
        success: false,
        error: 'Required cookies not found. Make sure you are logged into Twitter/X.',
        found: {
          auth_token: !!authToken,
          twid: !!twid,
          ct0: !!ct0,
          session_token: !!sessionToken
        }
      };
    }

    // Extract additional useful cookies
    const additionalCookies = {};
    const cookiePairs = cookies.split(';');

    for (const pair of cookiePairs) {
      const [name, value] = pair.trim().split('=');
      if (name && value && !['auth_token', 'twid', 'ct0'].includes(name)) {
        // Only include cookies that might be useful for API calls
        if (['guest_id', 'personalization_id', 'lang', 'guest_id_marketing', 'guest_id_ads'].includes(name)) {
          additionalCookies[name] = value;
        }
      }
    }

    // Create the result object with the session token
    const resultCookies = {
      ct0: ct0,
      ...additionalCookies
    };

    // Add the session token with the appropriate key
    if (authToken) {
      resultCookies.auth_token = authToken;
    }
    if (twid) {
      resultCookies.twid = twid;
    }

    return {
      success: true,
      cookies: resultCookies
    };
  }

  // Get user info for verification
  function getUserInfo() {
    try {
      // Try to get username from the page
      const usernameElement = document.querySelector('[data-testid="UserName"]');
      const username = usernameElement ? usernameElement.textContent : null;

      return { username };
    } catch (error) {
      return { username: null };
    }
  }

  // Main extraction logic
  const result = extractTwitterCookies();
  const userInfo = getUserInfo();

  if (result.success) {
    console.log('✅ Cookies extracted successfully!');

    if (userInfo.username) {
      console.log(`👤 Detected user: @${userInfo.username}`);
    }

    console.log('\n📋 Copy the text below and paste it into Tweet Cannon:');
    console.log('================================================================');

    const cookieString = JSON.stringify(result.cookies, null, 2);
    console.log(cookieString);

    console.log('================================================================');
    console.log('\n💡 Tips:');
    console.log('- Keep these cookies secure and private');
    console.log('- Cookies may expire after some time');
    console.log('- If Tweet Cannon stops working, run this script again');

    // Try to copy to clipboard if possible
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(JSON.stringify(result.cookies)).then(() => {
        console.log('📋 Cookies copied to clipboard!');
      }).catch(() => {
        console.log('📋 Could not copy to clipboard automatically. Please copy manually.');
      });
    }

    return result.cookies;

  } else {
    console.error('❌ Failed to extract cookies:');
    console.error(result.error);

    if (result.found) {
      console.log('\n🔍 Cookie status:');
      console.log(`- auth_token: ${result.found.auth_token ? '✅ Found' : '❌ Missing'}`);
      console.log(`- ct0: ${result.found.ct0 ? '✅ Found' : '❌ Missing'}`);
    }

    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure you are logged into Twitter');
    console.log('2. Try refreshing the page and running the script again');
    console.log('3. Clear your browser cache and log in again');
    console.log('4. Try using an incognito/private window');

    return null;
  }
})();

// Export for module use (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { extractTwitterCookies };
}
