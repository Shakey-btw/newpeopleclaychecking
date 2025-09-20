#!/usr/bin/env python3
"""
Push Activity Module
Handles campaign tracking and change logging for Lemlist campaigns
"""

import sqlite3
import logging
from typing import Dict, List, Any, Optional, Set
from datetime import datetime
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('push_activity.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class PushActivityDatabase:
    """Handles SQLite database operations for push activity tracking"""
    
    def __init__(self, db_path: str = "push_activity.db"):
        self.db_path = db_path
        self._init_database()
    
    def _init_database(self):
        """Initialize the database with push activity tables"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Create campaigns table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS campaigns (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT 1
                )
            ''')
            
            # Create leads table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS leads (
                    id TEXT PRIMARY KEY,
                    campaign_id TEXT NOT NULL,
                    email TEXT,
                    first_name TEXT,
                    last_name TEXT,
                    company_name TEXT,
                    job_title TEXT,
                    linkedin_url TEXT,
                    state TEXT,
                    state_system TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT 1,
                    FOREIGN KEY (campaign_id) REFERENCES campaigns (id)
                )
            ''')
            
            # Create change log table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS change_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    change_type TEXT NOT NULL, -- 'campaign_added', 'campaign_removed', 'lead_added', 'lead_removed', 'lead_updated'
                    campaign_id TEXT,
                    campaign_name TEXT,
                    lead_id TEXT,
                    lead_email TEXT,
                    lead_company TEXT,
                    old_value TEXT,
                    new_value TEXT,
                    change_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Create sync history table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sync_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sync_type TEXT NOT NULL, -- 'full', 'incremental'
                    campaigns_processed INTEGER DEFAULT 0,
                    leads_processed INTEGER DEFAULT 0,
                    campaigns_added INTEGER DEFAULT 0,
                    campaigns_removed INTEGER DEFAULT 0,
                    leads_added INTEGER DEFAULT 0,
                    leads_removed INTEGER DEFAULT 0,
                    leads_updated INTEGER DEFAULT 0,
                    sync_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    duration_seconds REAL
                )
            ''')
            
            # Create pushed_companies table to track which companies have been pushed
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS pushed_companies (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    campaign_id TEXT NOT NULL,
                    company_name TEXT NOT NULL,
                    pushed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(campaign_id, company_name)
                )
            ''')
            
            conn.commit()
            conn.close()
            
            logger.info(f"Push activity database initialized: {self.db_path}")
            
        except Exception as e:
            logger.error(f"Failed to initialize push activity database: {e}")
            raise
    
    def get_campaigns(self) -> List[Dict[str, Any]]:
        """Get all active campaigns"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, name, status, created_at, last_updated
                FROM campaigns 
                WHERE is_active = 1
                ORDER BY name
            ''')
            
            campaigns = []
            for row in cursor.fetchall():
                campaigns.append({
                    'id': row[0],
                    'name': row[1],
                    'status': row[2],
                    'created_at': row[3],
                    'last_updated': row[4]
                })
            
            conn.close()
            return campaigns
            
        except Exception as e:
            logger.error(f"Failed to get campaigns: {e}")
            return []
    
    def get_change_log(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent change log entries"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT change_type, campaign_name, lead_email, lead_company, 
                       old_value, new_value, change_timestamp
                FROM change_log 
                ORDER BY change_timestamp DESC 
                LIMIT ?
            ''', (limit,))
            
            changes = []
            for row in cursor.fetchall():
                changes.append({
                    'change_type': row[0],
                    'campaign_name': row[1],
                    'lead_email': row[2],
                    'lead_company': row[3],
                    'old_value': row[4],
                    'new_value': row[5],
                    'change_timestamp': row[6]
                })
            
            conn.close()
            return changes
            
        except Exception as e:
            logger.error(f"Failed to get change log: {e}")
            return []
    
    def update_campaigns(self, new_campaigns: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Update campaigns with change tracking"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get current campaigns
            cursor.execute('SELECT id, name, status FROM campaigns WHERE is_active = 1')
            current_campaigns = {row[0]: {'name': row[1], 'status': row[2]} for row in cursor.fetchall()}
            
            # Get new campaign IDs
            new_campaign_ids = {campaign['_id'] for campaign in new_campaigns}
            current_campaign_ids = set(current_campaigns.keys())
            
            # Find added and removed campaigns
            added_campaigns = new_campaign_ids - current_campaign_ids
            removed_campaigns = current_campaign_ids - new_campaign_ids
            
            stats = {
                'campaigns_added': 0,
                'campaigns_removed': 0,
                'campaigns_updated': 0,
                'leads_added': 0,
                'leads_removed': 0,
                'company_count_changes': {}
            }
            
            # Add new campaigns
            for campaign in new_campaigns:
                if campaign['_id'] in added_campaigns:
                    cursor.execute('''
                        INSERT INTO campaigns (id, name, status, created_at, last_updated)
                        VALUES (?, ?, ?, ?, ?)
                    ''', (
                        campaign['_id'],
                        campaign['name'],
                        campaign['status'],
                        datetime.now().isoformat(),
                        datetime.now().isoformat()
                    ))
                    
                    # Log campaign addition
                    cursor.execute('''
                        INSERT INTO change_log (change_type, campaign_id, campaign_name)
                        VALUES (?, ?, ?)
                    ''', ('campaign_added', campaign['_id'], campaign['name']))
                    
                    stats['campaigns_added'] += 1
                    logger.info(f"Added campaign: {campaign['name']}")
            
            # Mark removed campaigns as inactive
            for campaign_id in removed_campaigns:
                campaign_name = current_campaigns[campaign_id]['name']
                cursor.execute('''
                    UPDATE campaigns 
                    SET is_active = 0, last_updated = ?
                    WHERE id = ?
                ''', (datetime.now().isoformat(), campaign_id))
                
                # Log campaign removal
                cursor.execute('''
                    INSERT INTO change_log (change_type, campaign_id, campaign_name)
                    VALUES (?, ?, ?)
                ''', ('campaign_removed', campaign_id, campaign_name))
                
                stats['campaigns_removed'] += 1
                logger.info(f"Removed campaign: {campaign_name}")
            
            # Update existing campaigns
            for campaign in new_campaigns:
                if campaign['_id'] in current_campaign_ids:
                    current_campaign = current_campaigns[campaign['_id']]
                    if (current_campaign['name'] != campaign['name'] or 
                        current_campaign['status'] != campaign['status']):
                        
                        cursor.execute('''
                            UPDATE campaigns 
                            SET name = ?, status = ?, last_updated = ?
                            WHERE id = ?
                        ''', (
                            campaign['name'],
                            campaign['status'],
                            datetime.now().isoformat(),
                            campaign['_id']
                        ))
                        
                        # Log campaign update
                        cursor.execute('''
                            INSERT INTO change_log (change_type, campaign_id, campaign_name, old_value, new_value)
                            VALUES (?, ?, ?, ?, ?)
                        ''', (
                            'campaign_updated',
                            campaign['_id'],
                            campaign['name'],
                            json.dumps(current_campaign),
                            json.dumps({'name': campaign['name'], 'status': campaign['status']})
                        ))
                        
                        stats['campaigns_updated'] += 1
                        logger.info(f"Updated campaign: {campaign['name']}")
            
            # Record sync history
            cursor.execute('''
                INSERT INTO sync_history (sync_type, campaigns_processed, campaigns_added, campaigns_removed)
                VALUES (?, ?, ?, ?)
            ''', ('incremental', len(new_campaigns), stats['campaigns_added'], stats['campaigns_removed']))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Campaign update completed: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"Failed to update campaigns: {e}")
            raise
    
    def get_sync_stats(self) -> Dict[str, Any]:
        """Get sync statistics"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get latest sync
            cursor.execute('''
                SELECT sync_type, campaigns_processed, campaigns_added, campaigns_removed, 
                       sync_timestamp, duration_seconds
                FROM sync_history 
                ORDER BY sync_timestamp DESC 
                LIMIT 1
            ''')
            
            latest_sync = cursor.fetchone()
            
            # Get total counts
            cursor.execute('SELECT COUNT(*) FROM campaigns WHERE is_active = 1')
            total_campaigns = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(*) FROM leads WHERE is_active = 1')
            total_leads = cursor.fetchone()[0]
            
            conn.close()
            
            return {
                'total_campaigns': total_campaigns,
                'total_leads': total_leads,
                'latest_sync': {
                    'type': latest_sync[0] if latest_sync else None,
                    'campaigns_processed': latest_sync[1] if latest_sync else 0,
                    'campaigns_added': latest_sync[2] if latest_sync else 0,
                    'campaigns_removed': latest_sync[3] if latest_sync else 0,
                    'timestamp': latest_sync[4] if latest_sync else None,
                    'duration_seconds': latest_sync[5] if latest_sync else 0
                } if latest_sync else None
            }
            
        except Exception as e:
            logger.error(f"Failed to get sync stats: {e}")
            return {}
    
    def get_pushed_companies(self, campaign_id: str) -> Set[str]:
        """Get set of companies that have been pushed for a campaign"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('SELECT company_name FROM pushed_companies WHERE campaign_id = ?', (campaign_id,))
            companies = {row[0] for row in cursor.fetchall()}
            conn.close()
            return companies
        except Exception as e:
            logger.error(f"Failed to get pushed companies: {e}")
            return set()
    
    def mark_companies_as_pushed(self, campaign_id: str, company_names: List[str]):
        """Mark companies as pushed for a campaign"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            for company_name in company_names:
                cursor.execute('''
                    INSERT OR IGNORE INTO pushed_companies (campaign_id, company_name)
                    VALUES (?, ?)
                ''', (campaign_id, company_name))
            
            conn.commit()
            conn.close()
            logger.info(f"Marked {len(company_names)} companies as pushed for campaign {campaign_id}")
        except Exception as e:
            logger.error(f"Failed to mark companies as pushed: {e}")
    
    def get_new_companies(self, campaign_id: str, current_companies: Set[str]) -> Set[str]:
        """Get companies that haven't been pushed yet"""
        pushed_companies = self.get_pushed_companies(campaign_id)
        return current_companies - pushed_companies
    
    def log_push_activity(self, campaign_id: str, push_type: str, companies_count: int):
        """Log push activity to change log"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get campaign name
            cursor.execute('SELECT name FROM campaigns WHERE id = ?', (campaign_id,))
            campaign_result = cursor.fetchone()
            campaign_name = campaign_result[0] if campaign_result else f"Campaign {campaign_id}"
            
            # Log the push activity
            cursor.execute('''
                INSERT INTO change_log (change_type, campaign_id, campaign_name, details)
                VALUES (?, ?, ?, ?)
            ''', (
                push_type,
                campaign_id,
                campaign_name,
                f"Pushed {companies_count} companies to webhook"
            ))
            
            conn.commit()
            conn.close()
            logger.info(f"Logged {push_type} activity for campaign {campaign_id}: {companies_count} companies")
        except Exception as e:
            logger.error(f"Failed to log push activity: {e}")

class PushActivityClient:
    """Client for Lemlist API operations for push activity"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.lemlist.com/api"
        self.database = PushActivityDatabase()
        
        # Set up authentication headers
        import base64
        credentials = f":{api_key}"
        encoded_credentials = base64.b64encode(credentials.encode()).decode()
        self.headers = {
            'Authorization': f'Basic {encoded_credentials}',
            'Content-Type': 'application/json',
            'User-Agent': 'PushActivityClient/1.0'
        }
        
        self.webhook_url = "https://hook.eu1.make.com/c2b5e5fh4ctqvtdr0448eq81vyx6yye6"
        logger.info("Push activity client initialized")
    
    def get_running_campaigns(self) -> List[Dict[str, Any]]:
        """Get only running campaigns from Lemlist"""
        try:
            import requests
            
            logger.info("Fetching running campaigns from Lemlist...")
            
            params = {
                'version': 'v2',
                'limit': 100,
                'page': 1,
                'status': 'running',
                'sortBy': 'createdAt',
                'sortOrder': 'desc'
            }
            
            response = requests.get(
                f"{self.base_url}/campaigns",
                headers=self.headers,
                params=params
            )
            
            response.raise_for_status()
            data = response.json()
            
            campaigns = data.get('campaigns', [])
            logger.info(f"Retrieved {len(campaigns)} running campaigns")
            
            return campaigns
            
        except Exception as e:
            logger.error(f"Failed to get running campaigns: {e}")
            raise
    
    def get_campaign_leads(self, campaign_id: str) -> List[Dict[str, Any]]:
        """Get leads for a specific campaign"""
        try:
            import requests
            
            params = {
                'state': 'all',
                'format': 'json'
            }
            
            response = requests.get(
                f"{self.base_url}/campaigns/{campaign_id}/export/leads",
                headers=self.headers,
                params=params
            )
            
            response.raise_for_status()
            leads_data = response.json()
            
            # Handle different response formats
            if isinstance(leads_data, list):
                leads = leads_data
            elif isinstance(leads_data, dict) and 'leads' in leads_data:
                leads = leads_data['leads']
            else:
                leads = [leads_data] if leads_data else []
            
            logger.info(f"Retrieved {len(leads)} leads for campaign {campaign_id}")
            return leads
            
        except Exception as e:
            logger.error(f"Failed to get leads for campaign {campaign_id}: {e}")
            return []
    
    def get_campaigns_with_company_data(self) -> List[Dict[str, Any]]:
        """Get running campaigns that have company name data"""
        try:
            campaigns = self.get_running_campaigns()
            filtered_campaigns = []
            
            for campaign in campaigns:
                campaign_id = campaign['_id']
                campaign_name = campaign['name']
                
                logger.info(f"Checking campaign: {campaign_name}")
                
                # Get leads for this campaign
                leads = self.get_campaign_leads(campaign_id)
                
                if not leads:
                    logger.info(f"No leads found for campaign: {campaign_name}")
                    continue
                
                # Check if campaign has companyName column and data
                has_company_column = False
                unique_companies = set()
                
                for lead in leads:
                    if 'companyName' in lead and lead['companyName']:
                        has_company_column = True
                        company_name = lead['companyName'].strip()
                        if company_name:  # Only add non-empty company names
                            unique_companies.add(company_name)
                
                # Only include campaigns that have company data and more than 1 unique company
                if has_company_column and len(unique_companies) > 1:
                    campaign['unique_company_count'] = len(unique_companies)
                    campaign['has_company_data'] = True
                    campaign['leads'] = leads  # Store leads for change tracking
                    filtered_campaigns.append(campaign)
                    logger.info(f"✅ Campaign '{campaign_name}' has {len(unique_companies)} unique companies")
                else:
                    logger.info(f"❌ Campaign '{campaign_name}' filtered out (no company data or ≤1 unique companies)")
            
            logger.info(f"Filtered to {len(filtered_campaigns)} campaigns with company data")
            return filtered_campaigns
            
        except Exception as e:
            logger.error(f"Failed to get campaigns with company data: {e}")
            raise
    
    def push_companies_to_webhook(self, campaign_id: str, company_names: List[str]) -> bool:
        """Push company names to webhook"""
        try:
            import requests
            
            payload = {
                "campaign_id": campaign_id,
                "companies": company_names,
                "timestamp": datetime.now().isoformat(),
                "count": len(company_names)
            }
            
            response = requests.post(
                self.webhook_url,
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            response.raise_for_status()
            logger.info(f"Successfully pushed {len(company_names)} companies to webhook for campaign {campaign_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to push companies to webhook: {e}")
            return False
    
    def push_all_companies(self, campaign_id: str, database) -> Dict[str, Any]:
        """Push all unique companies for a campaign to webhook"""
        try:
            # Get campaign leads
            leads = self.get_campaign_leads(campaign_id)
            if not leads:
                return {"success": False, "error": "No leads found for campaign"}
            
            # Extract unique company names
            unique_companies = set()
            for lead in leads:
                if lead.get('companyName'):
                    company_name = lead['companyName'].strip()
                    if company_name:
                        unique_companies.add(company_name)
            
            if not unique_companies:
                return {"success": False, "error": "No company names found"}
            
            # Push to webhook
            success = self.push_companies_to_webhook(campaign_id, list(unique_companies))
            
            if success:
                # Mark as pushed
                database.mark_companies_as_pushed(campaign_id, list(unique_companies))
                
                # Log the push activity
                database.log_push_activity(campaign_id, "push_all", len(unique_companies))
                
                return {
                    "success": True,
                    "companies_pushed": len(unique_companies),
                    "companies": list(unique_companies)
                }
            else:
                return {"success": False, "error": "Failed to push to webhook"}
                
        except Exception as e:
            logger.error(f"Failed to push all companies: {e}")
            return {"success": False, "error": str(e)}
    
    def push_new_companies(self, campaign_id: str, database) -> Dict[str, Any]:
        """Push only new companies that haven't been pushed yet"""
        try:
            # Get campaign leads
            leads = self.get_campaign_leads(campaign_id)
            if not leads:
                return {"success": False, "error": "No leads found for campaign"}
            
            # Extract unique company names
            unique_companies = set()
            for lead in leads:
                if lead.get('companyName'):
                    company_name = lead['companyName'].strip()
                    if company_name:
                        unique_companies.add(company_name)
            
            if not unique_companies:
                return {"success": False, "error": "No company names found"}
            
            # Get new companies that haven't been pushed
            new_companies = database.get_new_companies(campaign_id, unique_companies)
            
            if not new_companies:
                return {"success": False, "error": "No new companies to push"}
            
            # Push to webhook
            success = self.push_companies_to_webhook(campaign_id, list(new_companies))
            
            if success:
                # Mark as pushed
                database.mark_companies_as_pushed(campaign_id, list(new_companies))
                
                # Log the push activity
                database.log_push_activity(campaign_id, "push_new", len(new_companies))
                
                return {
                    "success": True,
                    "companies_pushed": len(new_companies),
                    "companies": list(new_companies)
                }
            else:
                return {"success": False, "error": "Failed to push to webhook"}
                
        except Exception as e:
            logger.error(f"Failed to push new companies: {e}")
            return {"success": False, "error": str(e)}
    
    def get_campaign_push_status(self, campaign_id: str, database) -> Dict[str, Any]:
        """Get push status for a campaign"""
        try:
            # Get campaign leads
            leads = self.get_campaign_leads(campaign_id)
            if not leads:
                return {"success": False, "error": "No leads found for campaign"}
            
            # Extract unique company names
            unique_companies = set()
            for lead in leads:
                if lead.get('companyName'):
                    company_name = lead['companyName'].strip()
                    if company_name:
                        unique_companies.add(company_name)
            
            if not unique_companies:
                return {"success": False, "error": "No company names found"}
            
            # Check if campaign has ever been pushed
            pushed_companies = database.get_pushed_companies(campaign_id)
            has_ever_been_pushed = len(pushed_companies) > 0
            
            # Get new companies
            new_companies = database.get_new_companies(campaign_id, unique_companies)
            
            return {
                "success": True,
                "total_companies": len(unique_companies),
                "new_companies": len(new_companies),
                "has_new_companies": len(new_companies) > 0,
                "has_ever_been_pushed": has_ever_been_pushed,
                "show_push_new": has_ever_been_pushed and len(new_companies) > 0
            }
                
        except Exception as e:
            logger.error(f"Failed to get campaign push status: {e}")
            return {"success": False, "error": str(e)}
    
    def track_lead_changes(self, campaign_id: str, campaign_name: str, new_leads: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Track changes in leads for a specific campaign"""
        try:
            conn = sqlite3.connect(self.database.db_path)
            cursor = conn.cursor()
            
            # Get current leads for this campaign
            cursor.execute('''
                SELECT id, email, first_name, last_name, company_name, job_title, linkedin_url, state, state_system
                FROM leads 
                WHERE campaign_id = ? AND is_active = 1
            ''', (campaign_id,))
            
            current_leads = {row[0]: {
                'email': row[1], 'first_name': row[2], 'last_name': row[3], 
                'company_name': row[4], 'job_title': row[5], 'linkedin_url': row[6], 
                'state': row[7], 'state_system': row[8]
            } for row in cursor.fetchall()}
            
            # Get new lead IDs
            new_lead_ids = {lead['_id'] for lead in new_leads}
            current_lead_ids = set(current_leads.keys())
            
            # Find added and removed leads
            added_lead_ids = new_lead_ids - current_lead_ids
            removed_lead_ids = current_lead_ids - new_lead_ids
            
            changes = {
                'leads_added': 0,
                'leads_removed': 0,
                'company_count_change': 0,
                'added_leads': [],
                'removed_leads': []
            }
            
            # Process added leads
            for lead in new_leads:
                if lead['_id'] in added_lead_ids:
                    # Insert new lead
                    cursor.execute('''
                        INSERT INTO leads (id, campaign_id, email, first_name, last_name, 
                                         company_name, job_title, linkedin_url, state, state_system, 
                                         created_at, last_updated)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        lead['_id'],
                        campaign_id,
                        lead.get('email'),
                        lead.get('firstName'),
                        lead.get('lastName'),
                        lead.get('companyName'),
                        lead.get('jobTitle'),
                        lead.get('linkedinUrl'),
                        lead.get('state'),
                        lead.get('stateSystem'),
                        datetime.now().isoformat(),
                        datetime.now().isoformat()
                    ))
                    
                    # Log lead addition
                    cursor.execute('''
                        INSERT INTO change_log (change_type, campaign_id, campaign_name, lead_id, lead_email, lead_company, details)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        'lead_added',
                        campaign_id,
                        campaign_name,
                        lead['_id'],
                        lead.get('email'),
                        lead.get('companyName'),
                        f"Lead added: {lead.get('firstName', '')} {lead.get('lastName', '')} ({lead.get('email', '')}) from {lead.get('companyName', 'N/A')}"
                    ))
                    
                    changes['leads_added'] += 1
                    changes['added_leads'].append({
                        'email': lead.get('email'),
                        'company': lead.get('companyName'),
                        'name': f"{lead.get('firstName', '')} {lead.get('lastName', '')}".strip()
                    })
            
            # Process removed leads
            for lead_id in removed_lead_ids:
                lead_data = current_leads[lead_id]
                
                # Mark lead as inactive
                cursor.execute('''
                    UPDATE leads 
                    SET is_active = 0, last_updated = ?
                    WHERE id = ?
                ''', (datetime.now().isoformat(), lead_id))
                
                # Log lead removal
                cursor.execute('''
                    INSERT INTO change_log (change_type, campaign_id, campaign_name, lead_id, lead_email, lead_company, details)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    'lead_removed',
                    campaign_id,
                    campaign_name,
                    lead_id,
                    lead_data['email'],
                    lead_data['company_name'],
                    f"Lead removed: {lead_data['first_name']} {lead_data['last_name']} ({lead_data['email']}) from {lead_data['company_name'] or 'N/A'}"
                ))
                
                changes['leads_removed'] += 1
                changes['removed_leads'].append({
                    'email': lead_data['email'],
                    'company': lead_data['company_name'],
                    'name': f"{lead_data['first_name']} {lead_data['last_name']}".strip()
                })
            
            # Calculate company count change
            old_company_count = len(set(lead['company_name'] for lead in current_leads.values() if lead['company_name']))
            new_company_count = len(set(lead.get('companyName', '') for lead in new_leads if lead.get('companyName')))
            changes['company_count_change'] = new_company_count - old_company_count
            
            # Log company count change if significant
            if changes['company_count_change'] != 0:
                cursor.execute('''
                    INSERT INTO change_log (change_type, campaign_id, campaign_name, old_value, new_value)
                    VALUES (?, ?, ?, ?, ?)
                ''', (
                    'company_count_changed',
                    campaign_id,
                    campaign_name,
                    str(old_company_count),
                    str(new_company_count)
                ))
            
            conn.commit()
            conn.close()
            
            return changes
            
        except Exception as e:
            logger.error(f"Failed to track lead changes for campaign {campaign_id}: {e}")
            return {'leads_added': 0, 'leads_removed': 0, 'company_count_change': 0, 'added_leads': [], 'removed_leads': []}
    
    def update_campaigns(self) -> Dict[str, Any]:
        """Update campaigns with change tracking"""
        try:
            start_time = datetime.now()
            
            # Get running campaigns with company data from Lemlist
            campaigns = self.get_campaigns_with_company_data()
            
            # Update database with change tracking
            stats = self.database.update_campaigns(campaigns)
            
            # Track lead changes for each campaign
            total_lead_changes = {
                'leads_added': 0,
                'leads_removed': 0,
                'company_count_changes': {},
                'all_added_leads': [],
                'all_removed_leads': []
            }
            
            for campaign in campaigns:
                campaign_id = campaign['_id']
                campaign_name = campaign['name']
                leads = campaign.get('leads', [])
                
                # Track lead changes for this campaign
                lead_changes = self.track_lead_changes(campaign_id, campaign_name, leads)
                
                # Aggregate changes
                total_lead_changes['leads_added'] += lead_changes['leads_added']
                total_lead_changes['leads_removed'] += lead_changes['leads_removed']
                total_lead_changes['company_count_changes'][campaign_name] = lead_changes['company_count_change']
                total_lead_changes['all_added_leads'].extend(lead_changes['added_leads'])
                total_lead_changes['all_removed_leads'].extend(lead_changes['removed_leads'])
                
                if lead_changes['leads_added'] > 0 or lead_changes['leads_removed'] > 0:
                    logger.info(f"Campaign '{campaign_name}': +{lead_changes['leads_added']} leads, -{lead_changes['leads_removed']} leads, company count change: {lead_changes['company_count_change']:+d}")
            
            # Calculate duration
            duration = (datetime.now() - start_time).total_seconds()
            
            # Update sync history with duration
            conn = sqlite3.connect(self.database.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE sync_history 
                SET duration_seconds = ?, leads_added = ?, leads_removed = ?
                WHERE id = (SELECT id FROM sync_history ORDER BY sync_timestamp DESC LIMIT 1)
            ''', (duration, total_lead_changes['leads_added'], total_lead_changes['leads_removed']))
            conn.commit()
            conn.close()
            
            logger.info(f"Campaign update completed in {duration:.2f} seconds")
            logger.info(f"Lead changes: +{total_lead_changes['leads_added']} leads, -{total_lead_changes['leads_removed']} leads")
            
            return {
                'success': True,
                'campaigns_processed': len(campaigns),
                'duration_seconds': duration,
                'lead_changes': total_lead_changes,
                **stats
            }
            
        except Exception as e:
            logger.error(f"Failed to update campaigns: {e}")
            raise

def main():
    """Main function for testing"""
    import sys
    import argparse
    
    parser = argparse.ArgumentParser(description='Push Activity Management')
    parser.add_argument('--get-campaigns', action='store_true', help='Get campaigns with company data')
    parser.add_argument('--update-campaigns', action='store_true', help='Update campaigns')
    parser.add_argument('--get-changelog', action='store_true', help='Get change log')
    parser.add_argument('--limit', type=int, default=20, help='Limit for change log')
    parser.add_argument('--push-all', action='store_true', help='Push all companies for campaign')
    parser.add_argument('--push-new', action='store_true', help='Push new companies for campaign')
    parser.add_argument('--get-status', action='store_true', help='Get push status for campaign')
    parser.add_argument('--campaign-id', type=str, help='Campaign ID for push operations')
    
    args = parser.parse_args()
    
    try:
        # API Key
        LEMLIST_API_KEY = "fc8bbfc8a9a884abbb51ecb16c0216f2"
        
        # Initialize client and database
        client = PushActivityClient(LEMLIST_API_KEY)
        database = PushActivityDatabase()
        
        if args.get_campaigns:
            # Get campaigns with company data
            campaigns = client.get_campaigns_with_company_data()
            result = {
                "campaigns": [
                    {
                        "id": campaign['_id'],
                        "name": campaign['name'],
                        "status": "running",
                        "unique_company_count": campaign['unique_company_count']
                    }
                    for campaign in campaigns
                ],
                "lastUpdate": datetime.now().isoformat()
            }
            print(json.dumps(result))
            return 0
            
        elif args.update_campaigns:
            # Update campaigns
            print("🔄 Updating campaigns...")
            result = client.update_campaigns()
            
            print("✅ Update completed!")
            print(f"📊 Campaigns processed: {result['campaigns_processed']}")
            print(f"📊 Campaigns added: {result['campaigns_added']}")
            print(f"📊 Campaigns removed: {result['campaigns_removed']}")
            print(f"📊 Duration: {result['duration_seconds']:.2f}s")
            
            # Show current campaigns
            campaigns = database.get_campaigns()
            print(f"\n📋 Current campaigns ({len(campaigns)}):")
            for campaign in campaigns:
                print(f"  • {campaign['name']} ({campaign['status']})")
            
            # Show filtered campaigns with company data
            print(f"\n🏢 Campaigns with company data:")
            filtered_campaigns = client.get_campaigns_with_company_data()
            for campaign in filtered_campaigns:
                print(f"  • {campaign['name']} - {campaign['unique_company_count']} unique companies")
            
            # Show lead changes if any
            if 'lead_changes' in result:
                lead_changes = result['lead_changes']
                if lead_changes['leads_added'] > 0 or lead_changes['leads_removed'] > 0:
                    print(f"\n📊 Lead Changes:")
                    print(f"  • Added: {lead_changes['leads_added']} leads")
                    print(f"  • Removed: {lead_changes['leads_removed']} leads")
                    
                    # Show company count changes
                    if lead_changes['company_count_changes']:
                        print(f"\n🏢 Company Count Changes:")
                        for campaign_name, change in lead_changes['company_count_changes'].items():
                            if change != 0:
                                print(f"  • {campaign_name}: {change:+d} companies")
                    
                    # Show sample added leads
                    if lead_changes['all_added_leads']:
                        print(f"\n➕ Sample Added Leads:")
                        for lead in lead_changes['all_added_leads'][:5]:  # Show first 5
                            print(f"  • {lead['name']} ({lead['email']}) - {lead['company']}")
                    
                    # Show sample removed leads
                    if lead_changes['all_removed_leads']:
                        print(f"\n➖ Sample Removed Leads:")
                        for lead in lead_changes['all_removed_leads'][:5]:  # Show first 5
                            print(f"  • {lead['name']} ({lead['email']}) - {lead['company']}")
            
            return 0
            
        elif args.get_changelog:
            # Get change log
            change_log = database.get_change_log(args.limit)
            result = {"changeLog": change_log}
            print(json.dumps(result))
            return 0
            
        elif args.push_all:
            if not args.campaign_id:
                print(json.dumps({"success": False, "error": "Campaign ID required"}))
                return 1
            result = client.push_all_companies(args.campaign_id, database)
            print(json.dumps(result))
            return 0
            
        elif args.push_new:
            if not args.campaign_id:
                print(json.dumps({"success": False, "error": "Campaign ID required"}))
                return 1
            result = client.push_new_companies(args.campaign_id, database)
            print(json.dumps(result))
            return 0
            
        elif args.get_status:
            if not args.campaign_id:
                print(json.dumps({"success": False, "error": "Campaign ID required"}))
                return 1
            result = client.get_campaign_push_status(args.campaign_id, database)
            print(json.dumps(result))
            return 0
            
        else:
            # Default behavior - show help
            parser.print_help()
            return 0
        
    except Exception as e:
        logger.error(f"Application failed: {e}")
        print(json.dumps({"success": False, "error": str(e)}))
        return 1

if __name__ == "__main__":
    exit(main())
