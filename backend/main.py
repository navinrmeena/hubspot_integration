import os
from dotenv import load_dotenv
from fastapi import FastAPI, Form, Request
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables
load_dotenv()

from integrations.airtable import authorize_airtable, get_items_airtable, oauth2callback_airtable, get_airtable_credentials, create_record_airtable, get_airtable_bases_and_tables
from integrations.notion import authorize_notion, get_items_notion, oauth2callback_notion, get_notion_credentials
from integrations.hubspot import authorize_hubspot, get_hubspot_credentials, get_items_hubspot, oauth2callback_hubspot, create_contact_hubspot, get_contact_hubspot, update_contact_hubspot, delete_contact_hubspot

app = FastAPI()

origins = [
    "http://localhost:3000",  # React app address
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get('/')
def read_root():
    return {'Ping': 'Pong'}


# Airtable
@app.post('/integrations/airtable/authorize')
async def authorize_airtable_integration(user_id: str = Form(...), org_id: str = Form(...)):
    return await authorize_airtable(user_id, org_id)

@app.get('/integrations/airtable/oauth2callback')
async def oauth2callback_airtable_integration(request: Request):
    return await oauth2callback_airtable(request)

@app.post('/integrations/airtable/credentials')
async def get_airtable_credentials_integration(user_id: str = Form(...), org_id: str = Form(...)):
    return await get_airtable_credentials(user_id, org_id)

@app.post('/integrations/airtable/load')
async def get_airtable_items(credentials: str = Form(...)):
    return await get_items_airtable(credentials)

@app.post('/integrations/airtable/bases')
async def get_airtable_bases(credentials: str = Form(...)):
    return await get_airtable_bases_and_tables(credentials)

@app.post('/integrations/airtable/create_record')
async def create_airtable_record(credentials: str = Form(...), base_id: str = Form(...), table_id: str = Form(...), record_data: str = Form(...)):
    import json
    record_data_dict = json.loads(record_data)
    return await create_record_airtable(credentials, base_id, table_id, record_data_dict)


# Notion
@app.post('/integrations/notion/authorize')
async def authorize_notion_integration(user_id: str = Form(...), org_id: str = Form(...)):
    return await authorize_notion(user_id, org_id)

@app.get('/integrations/notion/oauth2callback')
async def oauth2callback_notion_integration(request: Request):
    return await oauth2callback_notion(request)

@app.post('/integrations/notion/credentials')
async def get_notion_credentials_integration(user_id: str = Form(...), org_id: str = Form(...)):
    return await get_notion_credentials(user_id, org_id)

@app.post('/integrations/notion/load')
async def get_notion_items(credentials: str = Form(...)):
    return await get_items_notion(credentials)

# HubSpot
@app.post('/integrations/hubspot/authorize')
async def authorize_hubspot_integration(user_id: str = Form(...), org_id: str = Form(...)):
    return await authorize_hubspot(user_id, org_id)

@app.get('/integrations/hubspot/oauth2callback')
async def oauth2callback_hubspot_integration(request: Request):
    return await oauth2callback_hubspot(request)

@app.post('/integrations/hubspot/credentials')
async def get_hubspot_credentials_integration(user_id: str = Form(...), org_id: str = Form(...)):
    return await get_hubspot_credentials(user_id, org_id)

@app.post('/integrations/hubspot/get_hubspot_items')
async def load_slack_data_integration(credentials: str = Form(...)):
    return await get_items_hubspot(credentials)

@app.post('/integrations/hubspot/create_contact')
async def create_hubspot_contact(credentials: str = Form(...), contact_data: str = Form(...)):
    import json
    contact_data_dict = json.loads(contact_data)
    return await create_contact_hubspot(credentials, contact_data_dict)

@app.post('/integrations/hubspot/get_contact')
async def get_hubspot_contact(credentials: str = Form(...), contact_id: str = Form(...)):
    return await get_contact_hubspot(credentials, contact_id)

@app.post('/integrations/hubspot/update_contact')
async def update_hubspot_contact(credentials: str = Form(...), contact_id: str = Form(...), contact_data: str = Form(...)):
    import json
    contact_data_dict = json.loads(contact_data)
    return await update_contact_hubspot(credentials, contact_id, contact_data_dict)

@app.post('/integrations/hubspot/delete_contact')
async def delete_hubspot_contact(credentials: str = Form(...), contact_id: str = Form(...)):
    result = await delete_contact_hubspot(credentials, contact_id)
    return {"success": result}
