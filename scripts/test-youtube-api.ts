/**
 * Test script to verify YouTube API credentials and access to @aabdraftleague channel
 * 
 * This script checks for Google credentials (service account or API key) and tests
 * access to the YouTube Data API v3 to fetch channel information and videos.
 * 
 * According to YouTube Data API docs, you can use:
 * 1. API key (for public data access) - simpler
 * 2. OAuth 2.0 (for user-specific data)
 * 3. Service account (may work for some operations)
 * 
 * Usage: npx tsx scripts/test-youtube-api.ts
 */

import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const channelHandle = '@aabdraftleague';

// Check for API key first (preferred for public data)
const apiKey = 
  process.env.YOUTUBE_API_KEY || 
  process.env.GOOGLE_API_KEY || 
  process.env.NEXT_PUBLIC_YOUTUBE_API_KEY ||
  process.env.YOUTUBE_DATA_API_KEY;

// Check for service account credentials (alternative)
const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const serviceAccountPrivateKey = 
  process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || 
  process.env.GOOGLE_PRIVATE_KEY;

async function testYouTubeAPI() {
  console.log('🔍 Testing YouTube API Access\n');
  console.log('=' .repeat(50));
  console.log(`Channel handle: ${channelHandle}\n`);
  
  let auth: any = null;
  let authMethod = '';
  
  // Try API key first (simplest for public data)
  if (apiKey) {
    console.log('✅ Found API key');
    console.log(`   Key prefix: ${apiKey.substring(0, 10)}...`);
    auth = apiKey;
    authMethod = 'API Key';
  } 
  // Fall back to service account
  else if (serviceAccountEmail && serviceAccountPrivateKey) {
    console.log('✅ Found service account credentials');
    console.log(`   Email: ${serviceAccountEmail}`);
    try {
      // Create JWT client for service account
      auth = new google.auth.JWT({
        email: serviceAccountEmail,
        key: serviceAccountPrivateKey.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/youtube.readonly'],
      });
      authMethod = 'Service Account';
    } catch (error: any) {
      console.error(`   ❌ Failed to initialize service account: ${error.message}`);
      auth = null;
    }
  }
  
  if (!auth) {
    console.error('\n❌ No valid YouTube API credentials found');
    console.log('\nChecked for:');
    console.log('  API Key:');
    console.log('    - YOUTUBE_API_KEY');
    console.log('    - GOOGLE_API_KEY');
    console.log('    - NEXT_PUBLIC_YOUTUBE_API_KEY');
    console.log('    - YOUTUBE_DATA_API_KEY');
    console.log('  Service Account:');
    console.log('    - GOOGLE_SERVICE_ACCOUNT_EMAIL');
    console.log('    - GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (or GOOGLE_PRIVATE_KEY)');
    console.log('\n💡 Options:');
    console.log('  1. Create an API key in Google Cloud Console:');
    console.log('     - Go to APIs & Services → Credentials');
    console.log('     - Create Credentials → API Key');
    console.log('     - Add to .env.local: YOUTUBE_API_KEY=your_key');
    console.log('  2. Or use existing service account (if YouTube Data API is enabled)');
    process.exit(1);
  }
  
  console.log(`   Auth method: ${authMethod}\n`);
  
  try {
    // Initialize YouTube Data API v3
    const youtube = google.youtube({
      version: 'v3',
      auth: auth,
    });
    
    console.log('📡 Testing API connection...\n');
    
    // Step 1: Get channel ID from handle
    console.log('Step 1: Resolving channel handle to channel ID...');
    const channelResponse = await youtube.channels.list({
      part: ['id', 'snippet', 'contentDetails', 'statistics'],
      forUsername: channelHandle.replace('@', ''), // Remove @ symbol
    });
    
    if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
      // Try alternative: search by handle
      console.log('   Trying alternative method (search by handle)...');
      const searchResponse = await youtube.search.list({
        part: ['snippet'],
        q: channelHandle,
        type: ['channel'],
        maxResults: 1,
      });
      
      if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
        throw new Error(`Channel ${channelHandle} not found`);
      }
      
      const channelId = searchResponse.data.items[0].snippet?.channelId;
      if (!channelId) {
        throw new Error('Could not determine channel ID');
      }
      
      console.log(`✅ Channel found via search: ${channelId}`);
      
      // Get full channel details
      const channelDetails = await youtube.channels.list({
        part: ['id', 'snippet', 'contentDetails', 'statistics'],
        id: [channelId],
      });
      
      if (!channelDetails.data.items || channelDetails.data.items.length === 0) {
        throw new Error('Could not fetch channel details');
      }
      
      const channel = channelDetails.data.items[0];
      console.log(`\n📺 Channel Information:`);
      console.log(`   Title: ${channel.snippet?.title}`);
      console.log(`   Channel ID: ${channel.id}`);
      console.log(`   Subscribers: ${channel.statistics?.subscriberCount || 'N/A'}`);
      console.log(`   Total Videos: ${channel.statistics?.videoCount || 'N/A'}`);
      
      // Step 2: Fetch recent videos
      console.log('\nStep 2: Fetching recent videos...');
      const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
      
      if (!uploadsPlaylistId) {
        throw new Error('Could not find uploads playlist');
      }
      
      const videosResponse = await youtube.playlistItems.list({
        part: ['snippet', 'contentDetails'],
        playlistId: uploadsPlaylistId,
        maxResults: 5,
      });
      
      if (!videosResponse.data.items || videosResponse.data.items.length === 0) {
        console.log('   ⚠️  No videos found in uploads playlist');
      } else {
        console.log(`✅ Found ${videosResponse.data.items.length} recent videos:\n`);
        videosResponse.data.items.forEach((item, index) => {
          const video = item.snippet;
          console.log(`   ${index + 1}. ${video?.title}`);
          console.log(`      Video ID: ${item.contentDetails?.videoId}`);
          console.log(`      Published: ${video?.publishedAt}`);
          console.log(`      URL: https://youtube.com/watch?v=${item.contentDetails?.videoId}\n`);
        });
      }
      
      console.log('=' .repeat(50));
      console.log('✅ YouTube API test successful!');
      console.log('\n📋 Summary:');
      console.log(`   ✅ ${authMethod} authentication working`);
      console.log(`   ✅ Channel accessible: ${channel.snippet?.title}`);
      console.log(`   ✅ Can fetch videos from channel`);
      console.log('\n💡 Ready to build video gallery/viewer!');
      
    } else {
      const channel = channelResponse.data.items[0];
      console.log(`✅ Channel found: ${channel.snippet?.title}`);
      console.log(`   Channel ID: ${channel.id}`);
      console.log(`   Subscribers: ${channel.statistics?.subscriberCount || 'N/A'}`);
      console.log(`   Total Videos: ${channel.statistics?.videoCount || 'N/A'}`);
      
      // Step 2: Fetch recent videos
      console.log('\nStep 2: Fetching recent videos...');
      const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
      
      if (!uploadsPlaylistId) {
        throw new Error('Could not find uploads playlist');
      }
      
      const videosResponse = await youtube.playlistItems.list({
        part: ['snippet', 'contentDetails'],
        playlistId: uploadsPlaylistId,
        maxResults: 5,
      });
      
      if (!videosResponse.data.items || videosResponse.data.items.length === 0) {
        console.log('   ⚠️  No videos found in uploads playlist');
      } else {
        console.log(`✅ Found ${videosResponse.data.items.length} recent videos:\n`);
        videosResponse.data.items.forEach((item, index) => {
          const video = item.snippet;
          console.log(`   ${index + 1}. ${video?.title}`);
          console.log(`      Video ID: ${item.contentDetails?.videoId}`);
          console.log(`      Published: ${video?.publishedAt}`);
          console.log(`      URL: https://youtube.com/watch?v=${item.contentDetails?.videoId}\n`);
        });
      }
      
      console.log('=' .repeat(50));
      console.log('✅ YouTube API test successful!');
      console.log('\n📋 Summary:');
      console.log(`   ✅ ${authMethod} authentication working`);
      console.log(`   ✅ Channel accessible: ${channel.snippet?.title}`);
      console.log(`   ✅ Can fetch videos from channel`);
      console.log('\n💡 Ready to build video gallery/viewer!');
    }
    
  } catch (error: any) {
    console.error('\n❌ Error testing YouTube API:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data?.error?.message || error.message}`);
      console.error(`   Details:`, JSON.stringify(error.response.data?.error, null, 2));
    } else {
      console.error(`   ${error.message}`);
    }
    
    if (error.message?.includes('API key') || error.message?.includes('API_KEY')) {
      console.log('\n💡 Make sure:');
      console.log('   1. YouTube Data API v3 is enabled in Google Cloud Console');
      console.log('   2. API key has proper permissions');
      console.log('   3. API key is not restricted or restrictions allow YouTube Data API');
    } else if (error.message?.includes('service account') || error.message?.includes('JWT')) {
      console.log('\n💡 Service account authentication issues:');
      console.log('   1. YouTube Data API v3 must be enabled in Google Cloud Console');
      console.log('   2. Service account credentials must be valid');
      console.log('   3. Consider using an API key instead for public data access');
    } else {
      console.log('\n💡 Troubleshooting:');
      console.log('   1. Verify YouTube Data API v3 is enabled in Google Cloud Console');
      console.log('   2. Check that credentials are correctly formatted');
      console.log('   3. For public data, an API key is simpler than service account');
    }
    
    process.exit(1);
  }
}

// Run the test
testYouTubeAPI();
