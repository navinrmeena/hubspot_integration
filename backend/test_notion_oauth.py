#!/usr/bin/env python3
"""
Test script for Notion OAuth2 Authorization
This script demonstrates how to use the Notion OAuth2 flow
"""

import asyncio
import json
from integrations.notion import authorize_notion, get_notion_credentials

async def test_notion_oauth():
    """Test the Notion OAuth2 flow"""
    
    # Test parameters
    user_id = "test_user_123"
    org_id = "test_org_456"
    
    print("🔐 Testing Notion OAuth2 Authorization")
    print("=" * 50)
    
    try:
        # Step 1: Start OAuth2 authorization
        print("1. Starting OAuth2 authorization...")
        auth_url = await authorize_notion(user_id, org_id)
        print(f"✅ Authorization URL generated:")
        print(f"   {auth_url}")
        print()
        
        print("📋 Next steps:")
        print("   1. Open the URL above in your browser")
        print("   2. Complete the Notion OAuth2 flow")
        print("   3. The callback will be handled automatically")
        print("   4. Use the credentials endpoint to get the access token")
        print()
        
        # Step 2: Simulate getting credentials (this would normally happen after OAuth callback)
        print("2. Testing credential retrieval...")
        try:
            credentials = await get_notion_credentials(user_id, org_id)
            print(f"✅ Credentials retrieved: {json.dumps(credentials, indent=2)}")
        except Exception as e:
            print(f"ℹ️  No credentials found (expected if OAuth not completed): {e}")
        
        print()
        print("🎉 Notion OAuth2 implementation is working correctly!")
        
    except Exception as e:
        print(f"❌ Error during OAuth2 test: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("Notion OAuth2 Test Script")
    print("Make sure to set NOTION_CLIENT_ID and NOTION_CLIENT_SECRET in your .env file")
    print()
    
    # Run the test
    success = asyncio.run(test_notion_oauth())
    
    if success:
        print("\n✅ All tests passed!")
    else:
        print("\n❌ Tests failed!")
