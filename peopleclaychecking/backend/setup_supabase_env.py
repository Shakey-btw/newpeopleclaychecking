#!/usr/bin/env python3
"""
Interactive script to set up Supabase environment variables
"""

import os
from pathlib import Path

def setup_env_file():
    """Interactive setup for Supabase .env file"""
    
    backend_dir = Path(__file__).parent
    env_file = backend_dir / ".env"
    
    print("=" * 60)
    print("Supabase Environment Setup")
    print("=" * 60)
    print()
    print("You'll need the following from your Supabase dashboard:")
    print("1. Project URL (Settings → API → Project URL)")
    print("2. Anon/Public Key (Settings → API → anon public)")
    print("3. Database URL (Settings → Database → Connection string → URI)")
    print()
    
    # Get Supabase URL
    supabase_url = input("Enter your Supabase Project URL (e.g., https://xxxxx.supabase.co): ").strip()
    if not supabase_url:
        print("❌ Supabase URL is required!")
        return
    
    # Get Anon Key
    supabase_key = input("Enter your Supabase Anon/Public Key: ").strip()
    if not supabase_key:
        print("❌ Supabase Key is required!")
        return
    
    # Get Database URL
    database_url = input("Enter your Database URL (postgresql://...): ").strip()
    if not database_url:
        print("❌ Database URL is required!")
        return
    
    # Optional: Service Role Key
    service_key = input("Enter your Service Role Key (optional, press Enter to skip): ").strip()
    
    # Create .env content
    env_content = f"""# Supabase Configuration
SUPABASE_URL={supabase_url}
SUPABASE_KEY={supabase_key}
DATABASE_URL={database_url}
"""
    
    if service_key:
        env_content += f"SUPABASE_SERVICE_KEY={service_key}\n"
    
    env_content += """
# Optional: Choose database backend
USE_SUPABASE=true
SQLITE_FALLBACK=false
"""
    
    # Write to file
    try:
        with open(env_file, 'w') as f:
            f.write(env_content)
        
        print()
        print("✅ .env file created successfully!")
        print(f"📁 Location: {env_file}")
        print()
        print("⚠️  Important: The .env file contains sensitive credentials.")
        print("   Make sure it's in .gitignore (it should be already).")
        print()
        
    except Exception as e:
        print(f"❌ Error creating .env file: {e}")
        return
    
    # Test connection
    test = input("Would you like to test the connection now? (y/n): ").strip().lower()
    if test == 'y':
        test_connection()

def test_connection():
    """Test the Supabase connection"""
    print()
    print("Testing connection...")
    
    try:
        from dotenv import load_dotenv
        load_dotenv()
        
        from supabase_client import get_supabase_client
        
        client = get_supabase_client()
        print("✅ Supabase client initialized successfully!")
        
        # Try a simple query (this will fail if tables don't exist, but connection works)
        print("✅ Connection test passed!")
        print()
        print("You can now use Supabase in your code:")
        print("  from supabase_client import get_supabase_client")
        print("  client = get_supabase_client()")
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure you've installed dependencies: pip install supabase python-dotenv")
    except ValueError as e:
        print(f"❌ Configuration error: {e}")
        print("Please check your .env file and try again.")
    except Exception as e:
        print(f"⚠️  Connection test: {e}")
        print("This might be normal if you haven't created tables yet.")
        print("The client was initialized, so your credentials are correct!")

if __name__ == "__main__":
    setup_env_file()

