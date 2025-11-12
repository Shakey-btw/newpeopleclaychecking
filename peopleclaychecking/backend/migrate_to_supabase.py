#!/usr/bin/env python3
"""
Migrate data from SQLite databases to Supabase
This script reads data from your local SQLite databases and uploads it to Supabase
"""

import sqlite3
import os
import json
from typing import List, Dict, Any
from dotenv import load_dotenv
from supabase_client import get_supabase_client
import logging

# Load environment variables
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def get_backend_path():
    """Get the backend directory path"""
    return os.path.dirname(os.path.abspath(__file__))

def migrate_campaigns():
    """Migrate campaigns from push_activity.db to Supabase"""
    logger.info("Migrating campaigns...")
    
    db_path = os.path.join(get_backend_path(), "push_activity.db")
    if not os.path.exists(db_path):
        logger.warning(f"push_activity.db not found at {db_path}")
        return 0
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT * FROM campaigns")
        campaigns = cursor.fetchall()
        
        if not campaigns:
            logger.info("No campaigns found in SQLite")
            return 0
        
        supabase = get_supabase_client().get_client()
        
        migrated = 0
        for row in campaigns:
            campaign = {
                "id": row["id"],
                "name": row["name"],
                "status": row["status"],
                "created_at": row["created_at"] if "created_at" in row.keys() else None,
                "last_updated": row["last_updated"] if "last_updated" in row.keys() else None,
                "is_active": bool(row["is_active"] if "is_active" in row.keys() else 1)
            }
            
            try:
                supabase.table("campaigns").upsert(campaign).execute()
                migrated += 1
            except Exception as e:
                logger.error(f"Error migrating campaign {row['id']}: {e}")
        
        logger.info(f"✅ Migrated {migrated}/{len(campaigns)} campaigns")
        return migrated
        
    finally:
        conn.close()

def migrate_leads():
    """Migrate leads from push_activity.db to Supabase"""
    logger.info("Migrating leads...")
    
    db_path = os.path.join(get_backend_path(), "push_activity.db")
    if not os.path.exists(db_path):
        logger.warning(f"push_activity.db not found at {db_path}")
        return 0
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT * FROM leads")
        leads = cursor.fetchall()
        
        if not leads:
            logger.info("No leads found in SQLite")
            return 0
        
        supabase = get_supabase_client().get_client()
        
        # Batch insert for better performance
        batch_size = 100
        migrated = 0
        
        for i in range(0, len(leads), batch_size):
            batch = leads[i:i + batch_size]
            lead_data = []
            
            for row in batch:
                row_keys = row.keys()
                lead = {
                    "id": row["id"],
                    "campaign_id": row["campaign_id"],
                    "email": row["email"] if "email" in row_keys else None,
                    "first_name": row["first_name"] if "first_name" in row_keys else None,
                    "last_name": row["last_name"] if "last_name" in row_keys else None,
                    "company_name": row["company_name"] if "company_name" in row_keys else None,
                    "job_title": row["job_title"] if "job_title" in row_keys else None,
                    "linkedin_url": row["linkedin_url"] if "linkedin_url" in row_keys else None,
                    "state": row["state"] if "state" in row_keys else None,
                    "state_system": row["state_system"] if "state_system" in row_keys else None,
                    "created_at": row["created_at"] if "created_at" in row_keys else None,
                    "last_updated": row["last_updated"] if "last_updated" in row_keys else None,
                    "is_active": bool(row["is_active"] if "is_active" in row_keys else 1)
                }
                lead_data.append(lead)
            
            try:
                supabase.table("leads").upsert(lead_data).execute()
                migrated += len(lead_data)
                logger.info(f"  Migrated {migrated}/{len(leads)} leads...")
            except Exception as e:
                logger.error(f"Error migrating leads batch: {e}")
        
        logger.info(f"✅ Migrated {migrated}/{len(leads)} leads")
        return migrated
        
    finally:
        conn.close()

def migrate_organizations():
    """Migrate organizations from pipedrive.db to Supabase"""
    logger.info("Migrating organizations...")
    
    db_path = os.path.join(get_backend_path(), "pipedrive.db")
    if not os.path.exists(db_path):
        logger.warning(f"pipedrive.db not found at {db_path}")
        return 0
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT * FROM organizations")
        orgs = cursor.fetchall()
        
        if not orgs:
            logger.info("No organizations found in SQLite")
            return 0
        
        supabase = get_supabase_client().get_client()
        
        # Batch insert for better performance
        batch_size = 100
        migrated = 0
        
        # Integer fields that should be converted
        integer_fields = [
            'id', 'open_deals_count', 'related_open_deals_count', 'closed_deals_count',
            'related_closed_deals_count', 'participant_open_deals_count', 'participant_closed_deals_count',
            'email_messages_count', 'activities_count', 'done_activities_count', 'undone_activities_count',
            'files_count', 'notes_count', 'followers_count', 'won_deals_count', 'related_won_deals_count',
            'related_lost_deals_count', 'next_activity_id', 'last_activity_id', 'label'
        ]
        
        # Date fields that should be converted to proper format
        date_fields = ['next_activity_date', 'last_activity_date']
        timestamp_fields = ['last_incoming_mail_time', 'last_outgoing_mail_time', 'update_time', 'add_time']
        
        for i in range(0, len(orgs), batch_size):
            batch = orgs[i:i + batch_size]
            org_data = []
            
            for row in batch:
                row_keys = row.keys()
                org = {}
                
                for key in row_keys:
                    value = row[key]
                    
                    # Handle NULL values
                    if value is None:
                        org[key] = None
                        continue
                    
                    # Convert integer fields
                    if key in integer_fields:
                        try:
                            # Try to convert to int, but handle date strings that might be in integer fields
                            if isinstance(value, str) and ('T' in value or '-' in value[:10]):
                                # This looks like a date string in an integer field - set to None
                                org_id = row['id'] if 'id' in row_keys else 'unknown'
                                logger.warning(f"Found date string '{value}' in integer field '{key}' for org {org_id}, setting to None")
                                org[key] = None
                            else:
                                org[key] = int(value) if value else None
                        except (ValueError, TypeError):
                            org[key] = None
                    # Convert date fields (DATE type in Supabase)
                    elif key in date_fields:
                        if isinstance(value, str):
                            # Extract just the date part (YYYY-MM-DD)
                            if 'T' in value:
                                org[key] = value.split('T')[0]
                            elif len(value) >= 10:
                                org[key] = value[:10]
                            else:
                                org[key] = value
                        else:
                            org[key] = value
                    # Convert timestamp fields (TIMESTAMPTZ type in Supabase)
                    elif key in timestamp_fields:
                        if isinstance(value, str):
                            # Ensure proper timestamp format
                            if 'T' in value:
                                # Already in ISO format
                                org[key] = value
                            elif len(value) == 10:
                                # Just date, add time
                                org[key] = f"{value}T00:00:00Z"
                            else:
                                org[key] = value
                        else:
                            org[key] = value
                    else:
                        # Keep other fields as-is
                        org[key] = value
                
                org_data.append(org)
            
            try:
                supabase.table("organizations").upsert(org_data).execute()
                migrated += len(org_data)
                logger.info(f"  Migrated {migrated}/{len(orgs)} organizations...")
            except Exception as e:
                logger.error(f"Error migrating organizations batch: {e}")
                # Try to migrate one by one to identify the problematic record
                if len(org_data) > 1:
                    logger.info("Attempting to migrate one by one to identify problematic record...")
                    for single_org in org_data:
                        try:
                            supabase.table("organizations").upsert(single_org).execute()
                            migrated += 1
                        except Exception as single_error:
                            logger.error(f"Failed to migrate org {single_org.get('id')}: {single_error}")
        
        logger.info(f"✅ Migrated {migrated}/{len(orgs)} organizations")
        return migrated
        
    finally:
        conn.close()

def migrate_user_filters():
    """Migrate user filters from pipedrive.db to Supabase"""
    logger.info("Migrating user filters...")
    
    db_path = os.path.join(get_backend_path(), "pipedrive.db")
    if not os.path.exists(db_path):
        logger.warning(f"pipedrive.db not found at {db_path}")
        return 0
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT * FROM user_filters")
        filters = cursor.fetchall()
        
        if not filters:
            logger.info("No user filters found in SQLite")
            return 0
        
        supabase = get_supabase_client().get_client()
        
        migrated = 0
        for row in filters:
            row_keys = row.keys()
            filter_data = {
                "filter_id": row["filter_id"],
                "filter_name": row["filter_name"],
                "filter_url": row["filter_url"] if "filter_url" in row_keys else None,
                "filter_conditions": row["filter_conditions"] if "filter_conditions" in row_keys else None,
                "organizations_count": row["organizations_count"] if "organizations_count" in row_keys else 0,
                "created_at": row["created_at"] if "created_at" in row_keys else None,
                "last_used": row["last_used"] if "last_used" in row_keys else None,
                "is_active": bool(row["is_active"] if "is_active" in row_keys else 1)
            }
            
            try:
                supabase.table("user_filters").upsert(filter_data, on_conflict="filter_id").execute()
                migrated += 1
            except Exception as e:
                logger.error(f"Error migrating filter {row['filter_id']}: {e}")
        
        logger.info(f"✅ Migrated {migrated}/{len(filters)} user filters")
        return migrated
        
    finally:
        conn.close()

def migrate_matching_summary():
    """Migrate matching summary from results.db to Supabase"""
    logger.info("Migrating matching summary...")
    
    db_path = os.path.join(get_backend_path(), "results.db")
    if not os.path.exists(db_path):
        logger.warning(f"results.db not found at {db_path}")
        return 0
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT * FROM matching_summary")
        summaries = cursor.fetchall()
        
        if not summaries:
            logger.info("No matching summaries found in SQLite")
            return 0
        
        supabase = get_supabase_client().get_client()
        
        migrated = 0
        for row in summaries:
            row_keys = row.keys()
            summary = {
                "filter_id": row["filter_id"] if "filter_id" in row_keys else None,
                "filter_name": row["filter_name"] if "filter_name" in row_keys else None,
                "total_pipedrive_orgs": row["total_pipedrive_orgs"] if "total_pipedrive_orgs" in row_keys else None,
                "total_lemlist_companies": row["total_lemlist_companies"] if "total_lemlist_companies" in row_keys else None,
                "total_lemlist_companies_unique": row["total_lemlist_companies_unique"] if "total_lemlist_companies_unique" in row_keys else None,
                "matching_companies": row["matching_companies"] if "matching_companies" in row_keys else None,
                "non_matching_pipedrive": row["non_matching_pipedrive"] if "non_matching_pipedrive" in row_keys else None,
                "non_matching_lemlist": row["non_matching_lemlist"] if "non_matching_lemlist" in row_keys else None,
                "match_percentage": row["match_percentage"] if "match_percentage" in row_keys else None,
                "created_at": row["created_at"] if "created_at" in row_keys else None
            }
            
            try:
                supabase.table("matching_summary").upsert(summary, on_conflict="filter_id").execute()
                migrated += 1
            except Exception as e:
                logger.error(f"Error migrating matching summary: {e}")
        
        logger.info(f"✅ Migrated {migrated}/{len(summaries)} matching summaries")
        return migrated
        
    finally:
        conn.close()

def main():
    """Main migration function"""
    print("=" * 60)
    print("Supabase Migration Script")
    print("=" * 60)
    print()
    
    # Check if Supabase is configured
    try:
        supabase = get_supabase_client()
        print("✅ Supabase client initialized")
    except Exception as e:
        print(f"❌ Error: {e}")
        print("Please make sure your .env file is set up correctly.")
        return 1
    
    print()
    print("Starting migration...")
    print()
    
    # Migrate in order (respecting foreign keys)
    results = {}
    
    # 1. Campaigns first (leads depend on campaigns)
    results['campaigns'] = migrate_campaigns()
    print()
    
    # 2. Organizations (filtered_organizations depend on organizations)
    results['organizations'] = migrate_organizations()
    print()
    
    # 3. Leads (depend on campaigns)
    results['leads'] = migrate_leads()
    print()
    
    # 4. User filters
    results['user_filters'] = migrate_user_filters()
    print()
    
    # 5. Matching summary
    results['matching_summary'] = migrate_matching_summary()
    print()
    
    # Summary
    print("=" * 60)
    print("Migration Summary")
    print("=" * 60)
    total = 0
    for table, count in results.items():
        print(f"  {table}: {count} records")
        total += count
    
    print()
    print(f"✅ Total: {total} records migrated")
    print()
    print("Migration complete! You can now use Supabase in your components.")
    print()
    
    return 0

if __name__ == "__main__":
    exit(main())

