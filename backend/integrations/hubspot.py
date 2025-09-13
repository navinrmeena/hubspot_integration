import os
import json
import secrets
import base64
import asyncio
import httpx
import requests
from fastapi import Request, HTTPException
from fastapi.responses import HTMLResponse
from integrations.integration_item import IntegrationItem
from redis_client import add_key_value_redis, get_value_redis, delete_key_redis

# Load environment variables
CLIENT_ID = os.getenv('HUBSPOT_CLIENT_ID')
CLIENT_SECRET = os.getenv('HUBSPOT_CLIENT_SECRET')
REDIRECT_URI = 'http://localhost:8000/integrations/hubspot/oauth2callback'
SCOPE = 'crm.objects.contacts.read crm.objects.contacts.write' 

if not CLIENT_ID or not CLIENT_SECRET:
    raise ValueError("HUBSPOT_CLIENT_ID and HUBSPOT_CLIENT_SECRET must be set in environment variables")

AUTH_URL = (
    f'https://app.hubspot.com/oauth/authorize?client_id={CLIENT_ID}'
    f'&redirect_uri={REDIRECT_URI}'
    f'&scope={SCOPE}'
    f'&response_type=code'
)

async def authorize_hubspot(user_id, org_id):
    state_data = {
        'state': secrets.token_urlsafe(32),
        'user_id': user_id,
        'org_id': org_id
    }
    encoded_state = base64.urlsafe_b64encode(json.dumps(state_data).encode('utf-8')).decode('utf-8')
    await add_key_value_redis(f'hubspot_state:{org_id}:{user_id}', json.dumps(state_data), expire=600)
    return f'{AUTH_URL}&state={encoded_state}'

async def oauth2callback_hubspot(request: Request):
    if request.query_params.get('error'):
        raise HTTPException(status_code=400, detail=request.query_params.get('error'))
    code = request.query_params.get('code')
    encoded_state = request.query_params.get('state')
    if not code or not encoded_state:
        raise HTTPException(status_code=400, detail='Missing code or state parameter')
    try:
        state_data = json.loads(base64.urlsafe_b64decode(encoded_state).decode('utf-8'))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f'Invalid state parameter: {str(e)}')
    original_state = state_data.get('state')
    user_id = state_data.get('user_id')
    org_id = state_data.get('org_id')
    if not user_id or not org_id:
        raise HTTPException(status_code=400, detail='Missing user_id or org_id in state')
    saved_state = await get_value_redis(f'hubspot_state:{org_id}:{user_id}')
    if not saved_state:
        raise HTTPException(status_code=400, detail='State not found or expired')
    saved_state_data = json.loads(saved_state)
    if original_state != saved_state_data.get('state'):
        raise HTTPException(status_code=400, detail='State does not match.')

    token_url = 'https://api.hubapi.com/oauth/v1/token'
    data = {
        'grant_type': 'authorization_code',
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'redirect_uri': REDIRECT_URI,
        'code': code
    }
    async with httpx.AsyncClient() as client:
        try:
            response, _ = await asyncio.gather(
                client.post(token_url, data=data, headers={'Content-Type': 'application/x-www-form-urlencoded'}),
                delete_key_redis(f'hubspot_state:{org_id}:{user_id}'),
            )
            if response.status_code != 200:
                error_detail = response.text
                try:
                    error_json = response.json()
                    error_detail = error_json.get('error_description', error_json.get('error', error_detail))
                except:
                    pass
                raise HTTPException(status_code=400, detail=f'Token exchange failed: {error_detail}')
            
            token_data = response.json()
            credentials = {
                'access_token': token_data.get('access_token'),
                'refresh_token': token_data.get('refresh_token'),
                'expires_in': token_data.get('expires_in')
            }
            await add_key_value_redis(f'hubspot_credentials:{org_id}:{user_id}', json.dumps(credentials), expire=3600)
            
        except httpx.RequestError as e:
            raise HTTPException(status_code=500, detail=f'Request failed: {str(e)}')
        except Exception as e:
            raise HTTPException(status_code=500, detail=f'Unexpected error: {str(e)}')

    close_window_script = """
    <html>
        <head><title>Authorization Complete</title></head>
        <body>
            <h2>Authorization Complete</h2>
            <p>You can close this window and return to the application.</p>
            <script>
                window.close();
            </script>
        </body>
    </html>
"""
    return HTMLResponse(content=close_window_script)

async def get_hubspot_credentials(user_id, org_id):
    credentials = await get_value_redis(f'hubspot_credentials:{org_id}:{user_id}')
    if not credentials:
        raise HTTPException(status_code=404, detail='No credentials found. Please authorize first.')
    try:
        credentials = json.loads(credentials)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail='Invalid credentials format')
    if not credentials or 'access_token' not in credentials:
        raise HTTPException(status_code=404, detail='Invalid credentials. Please authorize again.')
    await delete_key_redis(f'hubspot_credentials:{org_id}:{user_id}')
    return credentials

def create_integration_item_metadata_object(response_json):
    # Example for HubSpot contact object
    name = response_json.get('properties', {}).get('firstname', '') + ' ' + response_json.get('properties', {}).get('lastname', '')
    integration_item_metadata = IntegrationItem(
        id=response_json.get('id', None),
        type=response_json.get('objectType', 'contact'),
        name=name.strip() or response_json.get('id', ''),
        creation_time=response_json.get('createdAt', None),
        last_modified_time=response_json.get('updatedAt', None),
        parent_id=None,
        properties=response_json.get('properties', {})
    )
    return integration_item_metadata

async def get_items_hubspot(credentials) -> list[IntegrationItem]:
    credentials = json.loads(credentials)
    access_token = credentials.get('access_token')
    url = 'https://api.hubapi.com/crm/v3/objects/contacts'
    headers = {'Authorization': f'Bearer {access_token}'}
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        results = response.json().get('results', [])
        list_of_integration_item_metadata = []
        for result in results:
            list_of_integration_item_metadata.append(create_integration_item_metadata_object(result))
        print(list_of_integration_item_metadata)
        return list_of_integration_item_metadata
    else:
        print(f'Error fetching HubSpot items: {response.text}')
        return []

async def create_contact_hubspot(credentials, contact_data) -> IntegrationItem:
    """Create a new contact in HubSpot"""
    credentials = json.loads(credentials)
    access_token = credentials.get('access_token')
    
    url = 'https://api.hubapi.com/crm/v3/objects/contacts'
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    # Prepare the contact data in HubSpot format
    payload = {
        'properties': {
            'firstname': contact_data.get('firstname', ''),
            'lastname': contact_data.get('lastname', ''),
            'email': contact_data.get('email', ''),
            'phone': contact_data.get('phone', ''),
            'company': contact_data.get('company', '')
        }
    }
    
    response = requests.post(url, headers=headers, json=payload)
    
    if response.status_code == 201:
        result = response.json()
        # Create IntegrationItem from the created contact
        integration_item = IntegrationItem(
            id=result.get('id', ''),
            type='contact',
            name=f"{contact_data.get('firstname', '')} {contact_data.get('lastname', '')}".strip(),
            creation_time=result.get('createdAt', None),
            last_modified_time=result.get('updatedAt', None),
            properties=result.get('properties', {})
        )
        return integration_item
    else:
        print(f'Error creating HubSpot contact: {response.text}')
        raise HTTPException(status_code=400, detail=f'Failed to create contact: {response.text}')

async def get_contact_hubspot(credentials, contact_id) -> IntegrationItem:
    """Get a specific contact from HubSpot"""
    credentials = json.loads(credentials)
    access_token = credentials.get('access_token')
    
    url = f'https://api.hubapi.com/crm/v3/objects/contacts/{contact_id}'
    headers = {'Authorization': f'Bearer {access_token}'}
    
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        result = response.json()
        # Create IntegrationItem from the contact
        integration_item = IntegrationItem(
            id=result.get('id', ''),
            type='contact',
            name=f"{result.get('properties', {}).get('firstname', '')} {result.get('properties', {}).get('lastname', '')}".strip(),
            creation_time=result.get('createdAt', None),
            last_modified_time=result.get('updatedAt', None),
            properties=result.get('properties', {})
        )
        return integration_item
    else:
        print(f'Error fetching HubSpot contact: {response.text}')
        raise HTTPException(status_code=400, detail=f'Failed to fetch contact: {response.text}')

async def update_contact_hubspot(credentials, contact_id, contact_data) -> IntegrationItem:
    """Update a contact in HubSpot"""
    credentials = json.loads(credentials)
    access_token = credentials.get('access_token')
    
    url = f'https://api.hubapi.com/crm/v3/objects/contacts/{contact_id}'
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    # Prepare the contact data in HubSpot format
    payload = {
        'properties': {
            'firstname': contact_data.get('firstname', ''),
            'lastname': contact_data.get('lastname', ''),
            'email': contact_data.get('email', ''),
            'phone': contact_data.get('phone', ''),
            'company': contact_data.get('company', '')
        }
    }
    
    response = requests.patch(url, headers=headers, json=payload)
    
    if response.status_code == 200:
        result = response.json()
        # Create IntegrationItem from the updated contact
        integration_item = IntegrationItem(
            id=result.get('id', ''),
            type='contact',
            name=f"{contact_data.get('firstname', '')} {contact_data.get('lastname', '')}".strip(),
            creation_time=result.get('createdAt', None),
            last_modified_time=result.get('updatedAt', None),
            properties=result.get('properties', {})
        )
        return integration_item
    else:
        print(f'Error updating HubSpot contact: {response.text}')
        raise HTTPException(status_code=400, detail=f'Failed to update contact: {response.text}')

async def delete_contact_hubspot(credentials, contact_id) -> bool:
    """Delete a contact from HubSpot"""
    credentials = json.loads(credentials)
    access_token = credentials.get('access_token')
    
    url = f'https://api.hubapi.com/crm/v3/objects/contacts/{contact_id}'
    headers = {'Authorization': f'Bearer {access_token}'}
    
    response = requests.delete(url, headers=headers)
    
    if response.status_code == 204:
        return True
    else:
        print(f'Error deleting HubSpot contact: {response.text}')
        raise HTTPException(status_code=400, detail=f'Failed to delete contact: {response.text}')
