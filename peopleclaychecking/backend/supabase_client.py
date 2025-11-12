"""
Supabase Client for Database Operations
Provides connection to Supabase PostgreSQL database
"""

import os
from typing import Optional, List, Dict, Any, Union
import logging

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv not installed, will use system env vars

logger = logging.getLogger(__name__)

# Try to import Supabase client
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    logger.warning("Supabase client not installed. Install with: pip install supabase")

# Try to import psycopg2 for direct PostgreSQL connection
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False
    logger.warning("psycopg2 not installed. Install with: pip install psycopg2-binary")


class SupabaseClient:
    """Supabase client wrapper using the Supabase Python client"""
    
    def __init__(self):
        if not SUPABASE_AVAILABLE:
            raise ImportError("Supabase client not installed. Run: pip install supabase")
        
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        
        if not supabase_url or not supabase_key:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_KEY must be set in environment variables. "
                "Create a .env file in the backend directory."
            )
        
        self.client: Client = create_client(supabase_url, supabase_key)
        logger.info("Supabase client initialized")
    
    def get_client(self) -> Client:
        """Get the Supabase client instance"""
        return self.client
    
    def query(self, table: str, query: str = "*", filters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Query a table
        
        Args:
            table: Table name
            query: Select query (default: "*")
            filters: Dictionary of filters (e.g., {"name": "eq.Company Name"})
        
        Returns:
            List of dictionaries representing rows
        """
        query_builder = self.client.table(table).select(query)
        
        if filters:
            for key, value in filters.items():
                query_builder = query_builder.eq(key, value)
        
        response = query_builder.execute()
        return response.data if hasattr(response, 'data') else []
    
    def insert(self, table: str, data: Union[Dict[str, Any], List[Dict[str, Any]]]) -> Dict[str, Any]:
        """Insert data into a table"""
        response = self.client.table(table).insert(data).execute()
        return response.data if hasattr(response, 'data') else {}
    
    def update(self, table: str, data: Dict[str, Any], filters: Dict[str, Any]) -> Dict[str, Any]:
        """Update data in a table"""
        query_builder = self.client.table(table).update(data)
        
        for key, value in filters.items():
            query_builder = query_builder.eq(key, value)
        
        response = query_builder.execute()
        return response.data if hasattr(response, 'data') else {}
    
    def delete(self, table: str, filters: Dict[str, Any]) -> Dict[str, Any]:
        """Delete data from a table"""
        query_builder = self.client.table(table).delete()
        
        for key, value in filters.items():
            query_builder = query_builder.eq(key, value)
        
        response = query_builder.execute()
        return response.data if hasattr(response, 'data') else {}


class SupabaseDatabase:
    """Direct PostgreSQL connection to Supabase using psycopg2"""
    
    def __init__(self):
        if not PSYCOPG2_AVAILABLE:
            raise ImportError("psycopg2 not installed. Run: pip install psycopg2-binary")
        
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            raise ValueError(
                "DATABASE_URL must be set in environment variables. "
                "Create a .env file in the backend directory."
            )
        
        try:
            self.conn = psycopg2.connect(database_url)
            logger.info("Supabase PostgreSQL connection established")
        except Exception as e:
            logger.error(f"Failed to connect to Supabase: {e}")
            raise
    
    def execute_query(self, query: str, params: tuple = None) -> List[Dict[str, Any]]:
        """Execute a SELECT query and return results as list of dicts"""
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query, params)
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            self.conn.rollback()
            raise
    
    def execute_update(self, query: str, params: tuple = None) -> int:
        """Execute INSERT/UPDATE/DELETE and return affected rows"""
        try:
            with self.conn.cursor() as cursor:
                cursor.execute(query, params)
                self.conn.commit()
                return cursor.rowcount
        except Exception as e:
            logger.error(f"Update execution failed: {e}")
            self.conn.rollback()
            raise
    
    def execute_many(self, query: str, params_list: List[tuple]) -> int:
        """Execute a query multiple times with different parameters"""
        try:
            with self.conn.cursor() as cursor:
                cursor.executemany(query, params_list)
                self.conn.commit()
                return cursor.rowcount
        except Exception as e:
            logger.error(f"Batch execution failed: {e}")
            self.conn.rollback()
            raise
    
    def close(self):
        """Close the database connection"""
        if self.conn:
            self.conn.close()
            logger.info("Database connection closed")


# Singleton instances
_supabase_client: Optional[SupabaseClient] = None
_supabase_db: Optional[SupabaseDatabase] = None


def get_supabase_client() -> SupabaseClient:
    """Get or create Supabase client instance (using Supabase Python client)"""
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = SupabaseClient()
    return _supabase_client


def get_supabase_database() -> SupabaseDatabase:
    """Get or create Supabase database instance (using direct PostgreSQL connection)"""
    global _supabase_db
    if _supabase_db is None:
        _supabase_db = SupabaseDatabase()
    return _supabase_db


# Example usage
if __name__ == "__main__":
    # Example 1: Using Supabase client
    try:
        client = get_supabase_client()
        
        # Query data
        organizations = client.query("organizations", "*", {"name": "eq.Example Company"})
        print(f"Found {len(organizations)} organizations")
        
        # Insert data
        # new_org = client.insert("organizations", {"name": "New Company", "owner_name": "John Doe"})
        
    except Exception as e:
        print(f"Error with Supabase client: {e}")
    
    # Example 2: Using direct PostgreSQL connection
    try:
        db = get_supabase_database()
        
        # Execute custom query
        results = db.execute_query("SELECT * FROM organizations LIMIT 10")
        print(f"Found {len(results)} organizations")
        
        db.close()
        
    except Exception as e:
        print(f"Error with direct connection: {e}")

