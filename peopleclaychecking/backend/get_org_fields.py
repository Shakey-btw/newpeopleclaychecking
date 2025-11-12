#!/usr/bin/env python3
"""
Script to fetch all organization fields and their options from Pipedrive
"""

import requests
import json
from typing import Dict, List, Any

class PipedriveOrgFields:
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
    
    def get_all_fields_with_options(self) -> Dict[str, Any]:
        """Get all organization fields with their options"""
        fields = self.get_organization_fields()
        result = {
            'fields': [],
            'total_fields': len(fields)
        }
        
        for field in fields:
            field_info = {
                'id': field.get('id'),
                'key': field.get('key'),
                'name': field.get('name'),
                'field_type': field.get('field_type'),
                'mandatory': field.get('mandatory', False),
                'options': []
            }
            
            # Get options for dropdown/select fields
            if field.get('field_type') in ['enum', 'set']:
                options = self.get_field_options(str(field.get('id')))
                field_info['options'] = options
            
            result['fields'].append(field_info)
            print(f"Processed field: {field.get('name')} ({field.get('field_type')})")
        
        return result
    
    def save_to_file(self, data: Dict[str, Any], filename: str = 'pipedrive_org_fields.json'):
        """Save the data to a JSON file"""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"Data saved to {filename}")
        except Exception as e:
            print(f"Error saving file: {e}")

def main():
    # Replace with your actual Pipedrive API token
    API_TOKEN = "your_pipedrive_api_token_here"
    
    if API_TOKEN == "your_pipedrive_api_token_here":
        print("Please replace the API_TOKEN with your actual Pipedrive API token")
        return
    
    client = PipedriveOrgFields(API_TOKEN)
    
    print("Fetching organization fields from Pipedrive...")
    data = client.get_all_fields_with_options()
    
    print(f"\nFound {data['total_fields']} organization fields")
    
    # Print summary
    for field in data['fields']:
        options_count = len(field['options'])
        print(f"- {field['name']} ({field['field_type']}) - {options_count} options")
    
    # Save to file
    client.save_to_file(data)
    
    # Print detailed info for dropdown fields
    print("\n=== DROPDOWN FIELDS WITH OPTIONS ===")
    for field in data['fields']:
        if field['options']:
            print(f"\n{field['name']} ({field['field_type']}):")
            for option in field['options']:
                print(f"  - {option.get('label', 'N/A')} (ID: {option.get('id', 'N/A')})")

if __name__ == "__main__":
    main()
