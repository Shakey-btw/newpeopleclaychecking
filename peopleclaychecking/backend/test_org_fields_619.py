#!/usr/bin/env python3
"""
Test script to get all fields and options for organization ID 619
"""

import requests
import json
from typing import Dict, List, Any

class PipedriveOrgFieldsTest:
    def __init__(self, api_token: str):
        self.api_token = api_token
        self.base_url = "https://api.pipedrive.com/v1"
        self.headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    
    def get_organization_fields(self) -> List[Dict[str, Any]]:
        """Get all organization fields"""
        url = f"{self.base_url}/organizationFields"
        params = {'api_token': self.api_token}
        
        try:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data.get('success'):
                return data.get('data', [])
            else:
                print(f"Error: {data.get('error', 'Unknown error')}")
                return []
                
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return []
    
    def get_field_options(self, field_id: str) -> List[Dict[str, Any]]:
        """Get options for a specific field (for dropdowns, etc.)"""
        url = f"{self.base_url}/organizationFieldOptions"
        params = {
            'api_token': self.api_token,
            'field_id': field_id
        }
        
        try:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data.get('success'):
                return data.get('data', [])
            else:
                print(f"Error getting options for field {field_id}: {data.get('error', 'Unknown error')}")
                return []
                
        except requests.exceptions.RequestException as e:
            print(f"Request failed for field {field_id}: {e}")
            return []
    
    def get_organization_details(self, org_id: int) -> Dict[str, Any]:
        """Get details of a specific organization"""
        url = f"{self.base_url}/organizations/{org_id}"
        params = {'api_token': self.api_token}
        
        try:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data.get('success'):
                return data.get('data', {})
            else:
                print(f"Error getting organization {org_id}: {data.get('error', 'Unknown error')}")
                return {}
                
        except requests.exceptions.RequestException as e:
            print(f"Request failed for organization {org_id}: {e}")
            return {}
    
    def test_org_619_fields(self) -> Dict[str, Any]:
        """Test getting all fields and options for organization 619"""
        print("🔍 Testing Organization Fields for Org ID: 619")
        print("=" * 60)
        
        # Get organization details first
        print("📋 Getting organization details...")
        org_details = self.get_organization_details(619)
        if org_details:
            print(f"✅ Organization Name: {org_details.get('name', 'N/A')}")
            print(f"✅ Organization ID: {org_details.get('id', 'N/A')}")
        else:
            print("❌ Could not retrieve organization details")
        
        print("\n📊 Getting all organization fields...")
        fields = self.get_organization_fields()
        
        if not fields:
            print("❌ No fields found")
            return {}
        
        print(f"✅ Found {len(fields)} organization fields")
        
        result = {
            'organization_id': 619,
            'organization_name': org_details.get('name', 'N/A'),
            'total_fields': len(fields),
            'fields': []
        }
        
        # Process each field
        for i, field in enumerate(fields, 1):
            field_info = {
                'id': field.get('id'),
                'key': field.get('key'),
                'name': field.get('name'),
                'field_type': field.get('field_type'),
                'mandatory': field.get('mandatory', False),
                'options': []
            }
            
            print(f"\n[{i}/{len(fields)}] Processing: {field.get('name')} ({field.get('field_type')})")
            
            # Get options for dropdown/select fields
            if field.get('field_type') in ['enum', 'set']:
                print(f"  🔽 Getting options for dropdown field...")
                options = self.get_field_options(str(field.get('id')))
                field_info['options'] = options
                print(f"  ✅ Found {len(options)} options")
                
                # Show first few options
                for j, option in enumerate(options[:3]):
                    print(f"    - {option.get('label', 'N/A')} (ID: {option.get('id', 'N/A')})")
                if len(options) > 3:
                    print(f"    ... and {len(options) - 3} more options")
            
            result['fields'].append(field_info)
        
        return result
    
    def print_summary(self, data: Dict[str, Any]):
        """Print a summary of the results"""
        print("\n" + "=" * 60)
        print("📈 SUMMARY")
        print("=" * 60)
        print(f"Organization: {data.get('organization_name')} (ID: {data.get('organization_id')})")
        print(f"Total Fields: {data.get('total_fields')}")
        
        # Count field types
        field_types = {}
        dropdown_fields = 0
        total_options = 0
        
        for field in data.get('fields', []):
            field_type = field.get('field_type', 'unknown')
            field_types[field_type] = field_types.get(field_type, 0) + 1
            
            if field.get('options'):
                dropdown_fields += 1
                total_options += len(field['options'])
        
        print(f"\nField Types:")
        for field_type, count in field_types.items():
            print(f"  - {field_type}: {count}")
        
        print(f"\nDropdown Fields: {dropdown_fields}")
        print(f"Total Options: {total_options}")
        
        # Show dropdown fields with their options
        print(f"\n🔽 DROPDOWN FIELDS WITH OPTIONS:")
        for field in data.get('fields', []):
            if field.get('options'):
                print(f"\n📋 {field['name']} ({field['field_type']}):")
                for option in field['options']:
                    print(f"  - {option.get('label', 'N/A')} (ID: {option.get('id', 'N/A')})")

def main():
    # Use the API key from your existing code
    API_TOKEN = "64bb757c7d27fc5be60cc352858bba22bd5ba377"
    
    client = PipedriveOrgFieldsTest(API_TOKEN)
    
    print("🚀 Starting Pipedrive Organization Fields Test")
    print("=" * 60)
    
    # Test organization 619
    data = client.test_org_619_fields()
    
    if data:
        # Print summary
        client.print_summary(data)
        
        # Save to file
        filename = 'org_619_fields_test.json'
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"\n💾 Results saved to: {filename}")
        except Exception as e:
            print(f"❌ Error saving file: {e}")
    else:
        print("❌ Test failed - no data retrieved")

if __name__ == "__main__":
    main()
