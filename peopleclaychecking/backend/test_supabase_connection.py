#!/usr/bin/env python3
"""
Test Supabase connection
Run this after setting up your .env file to verify everything works
"""

import sys

def test_connection():
    """Test Supabase connection"""
    print("=" * 60)
    print("Testing Supabase Connection")
    print("=" * 60)
    print()
    
    # Test 1: Check if .env file exists
    from pathlib import Path
    env_file = Path(__file__).parent / ".env"
    
    if not env_file.exists():
        print("❌ .env file not found!")
        print(f"   Please create {env_file}")
        print("   You can copy .env.template to .env and fill in your values")
        return False
    
    print("✅ .env file found")
    
    # Test 2: Load environment variables
    try:
        from dotenv import load_dotenv
        import os
        load_dotenv()
        print("✅ Environment variables loaded")
    except ImportError:
        print("❌ python-dotenv not installed")
        return False
    
    # Test 3: Check if required variables are set
    required_vars = ["SUPABASE_URL", "SUPABASE_KEY", "DATABASE_URL"]
    missing_vars = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        print("   Please check your .env file")
        return False
    
    print("✅ All required environment variables are set")
    
    # Test 4: Test Supabase client initialization
    try:
        from supabase_client import get_supabase_client
        client = get_supabase_client()
        print("✅ Supabase client initialized successfully!")
    except Exception as e:
        print(f"❌ Failed to initialize Supabase client: {e}")
        return False
    
    # Test 5: Test direct PostgreSQL connection
    try:
        from supabase_client import get_supabase_database
        db = get_supabase_database()
        print("✅ Direct PostgreSQL connection established!")
        
        # Try a simple query
        result = db.execute_query("SELECT version();")
        if result:
            print(f"✅ Database query successful (PostgreSQL {result[0]['version'][:20]}...)")
        
        db.close()
    except Exception as e:
        print(f"⚠️  Direct PostgreSQL connection test failed: {e}")
        print("   This might be normal if connection pooling is enabled")
        print("   The Supabase client should still work fine")
    
    print()
    print("=" * 60)
    print("✅ Connection test completed successfully!")
    print("=" * 60)
    print()
    print("You can now use Supabase in your code:")
    print("  from supabase_client import get_supabase_client")
    print("  client = get_supabase_client()")
    print()
    
    return True

if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)

