#!/usr/bin/env python3
"""
Filter Conditions Module
Handles fetching and storing detailed filter conditions from Pipedrive
"""

import sqlite3
import requests
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('filter_conditions.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class FilterConditionsManager:
    """Manages filter conditions fetching and storage"""
    
    def __init__(self, pipedrive_api_key: str, db_path: str = "filter_conditions.db"):
        self.api_key = pipedrive_api_key
        self.db_path = db_path
        self.base_url = 'https://api.pipedrive.com/v1'
        self._init_database()
        logger.info("Filter conditions manager initialized")
    
    def _init_database(self):
        """Initialize the filter conditions database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Create filter_conditions table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS filter_conditions (
                    filter_id TEXT PRIMARY KEY,
                    filter_name TEXT,
                    filter_url TEXT,
                    conditions_json TEXT,
                    field_mappings TEXT,
                    created_at TEXT,
                    updated_at TEXT,
                    last_synced TEXT
                )
            ''')
            
            # Create field_definitions table for caching field info
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS field_definitions (
                    field_id TEXT PRIMARY KEY,
                    field_name TEXT,
                    field_key TEXT,
                    field_type TEXT,
                    options_json TEXT,
                    created_at TEXT,
                    updated_at TEXT
                )
            ''')
            
            conn.commit()
            conn.close()
            logger.info("Filter conditions database initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")
            raise
    
    def fetch_field_definitions(self) -> Dict[str, Any]:
        """Fetch all organization field definitions from Pipedrive"""
        try:
            logger.info("Fetching organization field definitions...")
            response = requests.get(f'{self.base_url}/organizationFields', 
                                 params={'api_token': self.api_key})
            
            if response.status_code == 200:
                data = response.json()
                fields = {}
                
                for field in data.get('data', []):
                    field_id = str(field.get('id'))
                    fields[field_id] = {
                        'name': field.get('name'),
                        'key': field.get('key'),
                        'type': field.get('field_type'),
                        'options': field.get('options', [])
                    }
                
                logger.info(f"Fetched {len(fields)} field definitions")
                return fields
            else:
                logger.error(f"Failed to fetch field definitions: {response.status_code}")
                return {}
                
        except Exception as e:
            logger.error(f"Error fetching field definitions: {e}")
            return {}
    
    def cache_field_definitions(self, fields: Dict[str, Any]):
        """Cache field definitions in database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            now = datetime.now().isoformat()
            
            for field_id, field_info in fields.items():
                cursor.execute('''
                    INSERT OR REPLACE INTO field_definitions 
                    (field_id, field_name, field_key, field_type, options_json, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    field_id,
                    field_info.get('name'),
                    field_info.get('key'),
                    field_info.get('type'),
                    json.dumps(field_info.get('options', [])),
                    now,
                    now
                ))
            
            conn.commit()
            conn.close()
            logger.info(f"Cached {len(fields)} field definitions")
            
        except Exception as e:
            logger.error(f"Error caching field definitions: {e}")
    
    def get_cached_field_definitions(self) -> Dict[str, Any]:
        """Get field definitions from cache"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('SELECT field_id, field_name, field_key, field_type, options_json FROM field_definitions')
            rows = cursor.fetchall()
            
            fields = {}
            for row in rows:
                field_id, name, key, field_type, options_json = row
                fields[field_id] = {
                    'name': name,
                    'key': key,
                    'type': field_type,
                    'options': json.loads(options_json) if options_json else []
                }
            
            conn.close()
            return fields
            
        except Exception as e:
            logger.error(f"Error getting cached field definitions: {e}")
            return {}
    
    def fetch_filter_conditions(self, filter_id: str) -> Optional[Dict[str, Any]]:
        """Fetch detailed filter conditions from Pipedrive"""
        try:
            logger.info(f"Fetching conditions for filter {filter_id}")
            response = requests.get(f'{self.base_url}/filters/{filter_id}', 
                                 params={'api_token': self.api_key})
            
            if response.status_code == 200:
                data = response.json()
                filter_data = data.get('data', {})
                
                # Get field definitions for mapping
                field_definitions = self.get_cached_field_definitions()
                if not field_definitions:
                    field_definitions = self.fetch_field_definitions()
                    self.cache_field_definitions(field_definitions)
                
                # Parse and enhance conditions
                conditions = filter_data.get('conditions', {})
                enhanced_conditions = self._enhance_conditions(conditions, field_definitions)
                
                return {
                    'filter_id': filter_id,
                    'filter_name': filter_data.get('name'),
                    'filter_url': f"https://procuros.pipedrive.com/organizations/list/filter/{filter_id}",
                    'conditions': enhanced_conditions,
                    'field_mappings': field_definitions,
                    'raw_conditions': conditions
                }
            else:
                logger.error(f"Failed to fetch filter {filter_id}: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Error fetching filter conditions for {filter_id}: {e}")
            return None
    
    def _enhance_conditions(self, conditions: Dict[str, Any], field_definitions: Dict[str, Any]) -> Dict[str, Any]:
        """Enhance conditions with field names and option labels"""
        try:
            if not isinstance(conditions, dict) or 'conditions' not in conditions:
                return conditions
            
            enhanced = conditions.copy()
            condition_groups = enhanced.get('conditions', [])
            
            for group in condition_groups:
                if 'conditions' in group:
                    individual_conditions = group['conditions']
                    for condition in individual_conditions:
                        field_id = str(condition.get('field_id', ''))
                        field_info = field_definitions.get(field_id, {})
                        
                        # Add field information
                        condition['field_name'] = field_info.get('name', f'Unknown Field {field_id}')
                        condition['field_type'] = field_info.get('type', 'unknown')
                        
                        # Add option label if it's an enum field
                        if field_info.get('type') == 'enum' and condition.get('value'):
                            value_id = str(condition.get('value'))
                            options = field_info.get('options', [])
                            for option in options:
                                if str(option.get('id')) == value_id:
                                    condition['value_label'] = option.get('label', f'Unknown Option {value_id}')
                                    break
                        elif field_info.get('type') == 'set' and condition.get('value'):
                            # For set fields, try to find the option
                            options = field_info.get('options', [])
                            for option in options:
                                if str(option.get('id')) == str(condition.get('value')):
                                    condition['value_label'] = option.get('label', f'Unknown Option {condition.get("value")}')
                                    break
            
            return enhanced
            
        except Exception as e:
            logger.error(f"Error enhancing conditions: {e}")
            return conditions
    
    def store_filter_conditions(self, filter_data: Dict[str, Any]):
        """Store filter conditions in database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            now = datetime.now().isoformat()
            
            cursor.execute('''
                INSERT OR REPLACE INTO filter_conditions 
                (filter_id, filter_name, filter_url, conditions_json, field_mappings, created_at, updated_at, last_synced)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                filter_data['filter_id'],
                filter_data['filter_name'],
                filter_data['filter_url'],
                json.dumps(filter_data['conditions']),
                json.dumps(filter_data['field_mappings']),
                now,
                now,
                now
            ))
            
            conn.commit()
            conn.close()
            logger.info(f"Stored conditions for filter {filter_data['filter_id']}")
            
        except Exception as e:
            logger.error(f"Error storing filter conditions: {e}")
    
    def get_filter_conditions(self, filter_id: str) -> Optional[Dict[str, Any]]:
        """Get stored filter conditions"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT filter_id, filter_name, filter_url, conditions_json, field_mappings, 
                       created_at, updated_at, last_synced
                FROM filter_conditions WHERE filter_id = ?
            ''', (filter_id,))
            
            row = cursor.fetchone()
            conn.close()
            
            if row:
                return {
                    'filter_id': row[0],
                    'filter_name': row[1],
                    'filter_url': row[2],
                    'conditions': json.loads(row[3]),
                    'field_mappings': json.loads(row[4]),
                    'created_at': row[5],
                    'updated_at': row[6],
                    'last_synced': row[7]
                }
            return None
            
        except Exception as e:
            logger.error(f"Error getting filter conditions: {e}")
            return None
    
    def get_all_filter_conditions(self) -> List[Dict[str, Any]]:
        """Get all stored filter conditions"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT filter_id, filter_name, filter_url, conditions_json, field_mappings, 
                       created_at, updated_at, last_synced
                FROM filter_conditions ORDER BY updated_at DESC
            ''')
            
            rows = cursor.fetchall()
            conn.close()
            
            conditions = []
            for row in rows:
                conditions.append({
                    'filter_id': row[0],
                    'filter_name': row[1],
                    'filter_url': row[2],
                    'conditions': json.loads(row[3]),
                    'field_mappings': json.loads(row[4]),
                    'created_at': row[5],
                    'updated_at': row[6],
                    'last_synced': row[7]
                })
            
            return conditions
            
        except Exception as e:
            logger.error(f"Error getting all filter conditions: {e}")
            return []
    
    def sync_all_filter_conditions(self, filter_ids: List[str]):
        """Sync conditions for all provided filter IDs"""
        try:
            logger.info(f"Syncing conditions for {len(filter_ids)} filters")
            
            # First, ensure we have fresh field definitions
            field_definitions = self.fetch_field_definitions()
            if field_definitions:
                self.cache_field_definitions(field_definitions)
            
            synced_count = 0
            for filter_id in filter_ids:
                try:
                    filter_data = self.fetch_filter_conditions(filter_id)
                    if filter_data:
                        self.store_filter_conditions(filter_data)
                        synced_count += 1
                        logger.info(f"✅ Synced conditions for filter {filter_id}")
                    else:
                        logger.warning(f"⚠️  No data for filter {filter_id}")
                except Exception as e:
                    logger.error(f"❌ Failed to sync filter {filter_id}: {e}")
            
            logger.info(f"Synced {synced_count}/{len(filter_ids)} filters")
            return synced_count
            
        except Exception as e:
            logger.error(f"Error syncing filter conditions: {e}")
            return 0

def main():
    """Test the filter conditions manager"""
    # API key from the existing codebase
    api_key = "64bb757c7d27fc5be60cc352858bba22bd5ba377"
    
    # Initialize manager
    manager = FilterConditionsManager(api_key)
    
    # Test with filter 3608
    print("🧪 Testing Filter Conditions Manager")
    print("=" * 50)
    
    # Test fetching conditions
    conditions = manager.fetch_filter_conditions("3608")
    if conditions:
        print("✅ Successfully fetched filter conditions")
        print(f"Filter: {conditions['filter_name']}")
        print(f"URL: {conditions['filter_url']}")
        print(f"Number of condition groups: {len(conditions['conditions'].get('conditions', []))}")
        
        # Store the conditions
        manager.store_filter_conditions(conditions)
        print("✅ Stored filter conditions")
        
        # Retrieve and display
        stored = manager.get_filter_conditions("3608")
        if stored:
            print("✅ Successfully retrieved stored conditions")
            print(f"Last synced: {stored['last_synced']}")
    else:
        print("❌ Failed to fetch filter conditions")

if __name__ == "__main__":
    main()
