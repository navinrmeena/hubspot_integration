import os
import json
import secrets
import base64
import asyncio
import httpx
import requests
from datetime import datetime
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

def log_info(message, **kwargs):
    """Log info message with timestamp"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [HUBSPOT-INFO] {message}")
    if kwargs:
        for key, value in kwargs.items():
            print(f"[{timestamp}] [HUBSPOT-INFO] {key}: {value}")

def log_error(message, error=None, **kwargs):
    """Log error message with timestamp"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [HUBSPOT-ERROR] {message}")
    if error:
        print(f"[{timestamp}] [HUBSPOT-ERROR] Error details: {str(error)}")
    if kwargs:
        for key, value in kwargs.items():
            print(f"[{timestamp}] [HUBSPOT-ERROR] {key}: {value}")

def log_success(message, **kwargs):
    """Log success message with timestamp"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [HUBSPOT-SUCCESS] {message}")
    if kwargs:
        for key, value in kwargs.items():
            print(f"[{timestamp}] [HUBSPOT-SUCCESS] {key}: {value}")

async def authorize_hubspot(user_id, org_id):
    log_info("Starting HubSpot authorization", user_id=user_id, org_id=org_id)
    
    try:
        state_data = {
            'state': secrets.token_urlsafe(32),
            'user_id': user_id,
            'org_id': org_id
        }
        encoded_state = base64.urlsafe_b64encode(json.dumps(state_data).encode('utf-8')).decode('utf-8')
        
        log_info("Generated state data", state=state_data['state'], encoded_state=encoded_state[:20] + "...")
        
        await add_key_value_redis(f'hubspot_state:{org_id}:{user_id}', json.dumps(state_data), expire=600)
        log_success("Stored state in Redis", redis_key=f"hubspot_state:{org_id}:{user_id}")
        
        auth_url = f'{AUTH_URL}&state={encoded_state}'
        log_success("Generated authorization URL", url=auth_url)
        
        return auth_url
        
    except Exception as e:
        log_error("Failed to authorize HubSpot", error=e, user_id=user_id, org_id=org_id)
        raise

async def oauth2callback_hubspot(request: Request):
    log_info("Processing HubSpot OAuth2 callback", query_params=dict(request.query_params))
    
    if request.query_params.get('error'):
        error_msg = request.query_params.get('error')
        log_error("OAuth2 callback error", error=error_msg)
        raise HTTPException(status_code=400, detail=error_msg)
    
    code = request.query_params.get('code')
    encoded_state = request.query_params.get('state')
    
    if not code or not encoded_state:
        log_error("Missing required parameters", code=code, state=encoded_state)
        raise HTTPException(status_code=400, detail='Missing code or state parameter')
    
    log_info("Received OAuth2 parameters", code=code[:10] + "...", state=encoded_state[:20] + "...")
    
    try:
        state_data = json.loads(base64.urlsafe_b64decode(encoded_state).decode('utf-8'))
        log_info("Decoded state data", user_id=state_data.get('user_id'), org_id=state_data.get('org_id'))
    except Exception as e:
        log_error("Failed to decode state parameter", error=e)
        raise HTTPException(status_code=400, detail=f'Invalid state parameter: {str(e)}')
    
    original_state = state_data.get('state')
    user_id = state_data.get('user_id')
    org_id = state_data.get('org_id')
    
    if not user_id or not org_id:
        log_error("Missing user_id or org_id in state", user_id=user_id, org_id=org_id)
        raise HTTPException(status_code=400, detail='Missing user_id or org_id in state')
    
    log_info("Validating state", user_id=user_id, org_id=org_id)
    
    saved_state = await get_value_redis(f'hubspot_state:{org_id}:{user_id}')
    if not saved_state:
        log_error("State not found in Redis", redis_key=f"hubspot_state:{org_id}:{user_id}")
        raise HTTPException(status_code=400, detail='State not found or expired')
    
    saved_state_data = json.loads(saved_state)
    if original_state != saved_state_data.get('state'):
        log_error("State mismatch", original_state=original_state, saved_state=saved_state_data.get('state'))
        raise HTTPException(status_code=400, detail='State does not match.')

    log_success("State validation passed", user_id=user_id, org_id=org_id)

    token_url = 'https://api.hubapi.com/oauth/v1/token'
    data = {
        'grant_type': 'authorization_code',
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'redirect_uri': REDIRECT_URI,
        'code': code
    }
    
    log_info("Exchanging code for token", token_url=token_url, client_id=CLIENT_ID)
    
    async with httpx.AsyncClient() as client:
        try:
            response, _ = await asyncio.gather(
                client.post(token_url, data=data, headers={'Content-Type': 'application/x-www-form-urlencoded'}),
                delete_key_redis(f'hubspot_state:{org_id}:{user_id}'),
            )
            
            log_info("Token exchange response", status_code=response.status_code)
            
            if response.status_code != 200:
                error_detail = response.text
                try:
                    error_json = response.json()
                    error_detail = error_json.get('error_description', error_json.get('error', error_detail))
                except:
                    pass
                log_error("Token exchange failed", status_code=response.status_code, error=error_detail)
                raise HTTPException(status_code=400, detail=f'Token exchange failed: {error_detail}')
            
            token_data = response.json()
            log_success("Token exchange successful", access_token=token_data.get('access_token', '')[:10] + "...")
            
            credentials = {
                'access_token': token_data.get('access_token'),
                'refresh_token': token_data.get('refresh_token'),
                'expires_in': token_data.get('expires_in')
            }
            
            await add_key_value_redis(f'hubspot_credentials:{org_id}:{user_id}', json.dumps(credentials), expire=3600)
            log_success("Stored credentials in Redis", redis_key=f"hubspot_credentials:{org_id}:{user_id}", expires_in=3600)
            
        except httpx.RequestError as e:
            log_error("Request failed during token exchange", error=e)
            raise HTTPException(status_code=500, detail=f'Request failed: {str(e)}')
        except Exception as e:
            log_error("Unexpected error during token exchange", error=e)
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
    log_success("OAuth2 callback completed successfully", user_id=user_id, org_id=org_id)
    return HTMLResponse(content=close_window_script)

async def get_hubspot_credentials(user_id, org_id):
    log_info("Retrieving HubSpot credentials", user_id=user_id, org_id=org_id)
    
    credentials = await get_value_redis(f'hubspot_credentials:{org_id}:{user_id}')
    if not credentials:
        log_error("No credentials found in Redis", redis_key=f"hubspot_credentials:{org_id}:{user_id}")
        raise HTTPException(status_code=404, detail='No credentials found. Please authorize first.')
    
    try:
        credentials = json.loads(credentials)
        log_info("Parsed credentials from Redis", has_access_token=bool(credentials.get('access_token')))
    except json.JSONDecodeError as e:
        log_error("Failed to parse credentials JSON", error=e)
        raise HTTPException(status_code=500, detail='Invalid credentials format')
    
    if not credentials or 'access_token' not in credentials:
        log_error("Invalid credentials structure", has_access_token=bool(credentials.get('access_token')))
        raise HTTPException(status_code=404, detail='Invalid credentials. Please authorize again.')
    
    await delete_key_redis(f'hubspot_credentials:{org_id}:{user_id}')
    log_success("Retrieved and deleted credentials from Redis", user_id=user_id, org_id=org_id)
    return credentials

def create_integration_item_metadata_object(response_json):
    log_info("Creating integration item metadata", object_id=response_json.get('id'), object_type=response_json.get('objectType'))
    
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
    
    log_success("Created integration item", id=integration_item_metadata.id, name=integration_item_metadata.name)
    return integration_item_metadata

async def get_items_hubspot(credentials) -> list[IntegrationItem]:
    log_info("Fetching HubSpot items")
    
    credentials = json.loads(credentials)
    access_token = credentials.get('access_token')
    url = 'https://api.hubapi.com/crm/v3/objects/contacts'
    headers = {'Authorization': f'Bearer {access_token}'}
    
    log_info("Making API request to HubSpot", url=url, access_token=access_token[:10] + "...")
    
    response = requests.get(url, headers=headers)
    log_info("HubSpot API response", status_code=response.status_code)
    
    if response.status_code == 200:
        results = response.json().get('results', [])
        log_success("Successfully fetched HubSpot items", count=len(results))
        
        list_of_integration_item_metadata = []
        for result in results:
            list_of_integration_item_metadata.append(create_integration_item_metadata_object(result))
        
        log_success("Created integration items", total_items=len(list_of_integration_item_metadata))
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [HUBSPOT-INFO] Integration items: {list_of_integration_item_metadata}")
        return list_of_integration_item_metadata
    else:
        log_error("Failed to fetch HubSpot items", status_code=response.status_code, response=response.text)
        return []

async def create_contact_hubspot(credentials, contact_data) -> IntegrationItem:
    log_info("Creating HubSpot contact", contact_data=contact_data)
    
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
    
    log_info("Sending contact creation request", url=url, payload=payload)
    
    response = requests.post(url, headers=headers, json=payload)
    log_info("Contact creation response", status_code=response.status_code)
    
    if response.status_code == 201:
        result = response.json()
        log_success("Contact created successfully", contact_id=result.get('id'))
        
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
        log_error("Failed to create HubSpot contact", status_code=response.status_code, response=response.text)
        raise HTTPException(status_code=400, detail=f'Failed to create contact: {response.text}')

async def get_contact_hubspot(credentials, contact_id) -> IntegrationItem:
    log_info("Fetching HubSpot contact", contact_id=contact_id)
    
    credentials = json.loads(credentials)
    access_token = credentials.get('access_token')
    
    url = f'https://api.hubapi.com/crm/v3/objects/contacts/{contact_id}'
    headers = {'Authorization': f'Bearer {access_token}'}
    
    log_info("Making API request to fetch contact", url=url)
    
    response = requests.get(url, headers=headers)
    log_info("Contact fetch response", status_code=response.status_code)
    
    if response.status_code == 200:
        result = response.json()
        log_success("Contact fetched successfully", contact_id=contact_id)
        
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
        log_error("Failed to fetch HubSpot contact", status_code=response.status_code, response=response.text)
        raise HTTPException(status_code=400, detail=f'Failed to fetch contact: {response.text}')

async def update_contact_hubspot(credentials, contact_id, contact_data) -> IntegrationItem:
    log_info("Updating HubSpot contact", contact_id=contact_id, contact_data=contact_data)
    
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
    
    log_info("Sending contact update request", url=url, payload=payload)
    
    response = requests.patch(url, headers=headers, json=payload)
    log_info("Contact update response", status_code=response.status_code)
    
    if response.status_code == 200:
        result = response.json()
        log_success("Contact updated successfully", contact_id=contact_id)
        
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
        log_error("Failed to update HubSpot contact", status_code=response.status_code, response=response.text)
        raise HTTPException(status_code=400, detail=f'Failed to update contact: {response.text}')

async def delete_contact_hubspot(credentials, contact_id) -> bool:
    log_info("Deleting HubSpot contact", contact_id=contact_id)
    
    credentials = json.loads(credentials)
    access_token = credentials.get('access_token')
    
    url = f'https://api.hubapi.com/crm/v3/objects/contacts/{contact_id}'
    headers = {'Authorization': f'Bearer {access_token}'}
    
    log_info("Sending contact deletion request", url=url)
    
    response = requests.delete(url, headers=headers)
    log_info("Contact deletion response", status_code=response.status_code)
    
    if response.status_code == 204:
        log_success("Contact deleted successfully", contact_id=contact_id)
        return True
    else:
        log_error("Failed to delete HubSpot contact", status_code=response.status_code, response=response.text)
        raise HTTPException(status_code=400, detail=f'Failed to delete contact: {response.text}')
