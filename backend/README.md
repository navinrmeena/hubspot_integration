# HubSpot Integration Backend

A FastAPI-based backend service for integrating with Airtable, Notion, and HubSpot APIs.

## Features

- **Airtable Integration**: OAuth2 authentication and data retrieval
- **Notion Integration**: OAuth2 authentication and data retrieval  
- **HubSpot Integration**: OAuth2 authentication and data retrieval
- **Redis Caching**: Session and credential management
- **CORS Support**: Frontend integration ready

## Prerequisites

- Python 3.9+
- Redis server
- API credentials for the services you want to integrate with

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hubspot_integration/backend
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual API credentials
   ```

4. **Start Redis server**
   ```bash
   redis-server
   ```

5. **Run the application**
   ```bash
   uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```

## Environment Variables

Copy `.env.example` to `.env` and fill in your API credentials:

### Required Variables

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `AIRTABLE_CLIENT_ID` | Airtable OAuth client ID | [Airtable Developer](https://airtable.com/create/tokens) |
| `AIRTABLE_CLIENT_SECRET` | Airtable OAuth client secret | [Airtable Developer](https://airtable.com/create/tokens) |
| `NOTION_CLIENT_ID` | Notion OAuth client ID | [Notion Integrations](https://www.notion.so/my-integrations) |
| `NOTION_CLIENT_SECRET` | Notion OAuth client secret | [Notion Integrations](https://www.notion.so/my-integrations) |
| `HUBSPOT_CLIENT_ID` | HubSpot OAuth client ID | [HubSpot Developer](https://developers.hubspot.com/) |
| `HUBSPOT_CLIENT_SECRET` | HubSpot OAuth client secret | [HubSpot Developer](https://developers.hubspot.com/) |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_HOST` | localhost | Redis server host |
| `REDIS_PORT` | 6379 | Redis server port |
| `REDIS_DB` | 0 | Redis database number |
| `HOST` | 127.0.0.1 | Server host |
| `PORT` | 8000 | Server port |

## API Endpoints

### Health Check
- **GET** `/` - Returns `{"Ping": "Pong"}`

### Airtable Integration
- **POST** `/integrations/airtable/authorize` - Start OAuth flow
- **GET** `/integrations/airtable/oauth2callback` - OAuth callback
- **POST** `/integrations/airtable/credentials` - Get stored credentials
- **POST** `/integrations/airtable/load` - Load Airtable data

### Notion Integration
- **POST** `/integrations/notion/authorize` - Start OAuth flow
- **GET** `/integrations/notion/oauth2callback` - OAuth callback
- **POST** `/integrations/notion/credentials` - Get stored credentials
- **POST** `/integrations/notion/load` - Load Notion data

### HubSpot Integration
- **POST** `/integrations/hubspot/authorize` - Start OAuth flow
- **GET** `/integrations/hubspot/oauth2callback` - OAuth callback
- **POST** `/integrations/hubspot/credentials` - Get stored credentials
- **POST** `/integrations/hubspot/get_hubspot_items` - Load HubSpot data

## API Documentation

Once the server is running, you can access:
- **Swagger UI**: http://127.0.0.1:8000/docs
- **ReDoc**: http://127.0.0.1:8000/redoc

## Testing with Postman

1. **Health Check**
   - Method: GET
   - URL: `http://127.0.0.1:8000/`
   - Expected Response: `{"Ping": "Pong"}`

2. **Integration Authorization**
   - Method: POST
   - URL: `http://127.0.0.1:8000/integrations/{service}/authorize`
   - Body (form-data):
     - `user_id`: any string
     - `org_id`: any string

## Development

### Project Structure
```
backend/
├── integrations/
│   ├── airtable.py      # Airtable integration logic
│   ├── notion.py        # Notion integration logic
│   ├── hubspot.py       # HubSpot integration logic
│   └── integration_item.py  # Data models
├── main.py              # FastAPI application
├── redis_client.py      # Redis connection and utilities
├── requirements.txt     # Python dependencies
├── .env.example        # Environment variables template
└── README.md           # This file
```

### Adding New Integrations

1. Create a new file in `integrations/` directory
2. Implement the required functions:
   - `authorize_{service}()`
   - `oauth2callback_{service}()`
   - `get_{service}_credentials()`
   - `get_items_{service}()`
3. Add the endpoints to `main.py`
4. Update this README with the new endpoints

## Security Notes

- Never commit `.env` file to version control
- Use strong, unique API secrets
- Regularly rotate API credentials
- Consider using environment-specific configurations for production

## Troubleshooting

### Common Issues

1. **Redis Connection Error**
   - Ensure Redis server is running: `redis-server`
   - Check Redis connection: `redis-cli ping`

2. **Import Errors**
   - Ensure all dependencies are installed: `pip install -r requirements.txt`
   - Check Python path and virtual environment

3. **OAuth Errors**
   - Verify API credentials in `.env` file
   - Check redirect URIs match exactly
   - Ensure OAuth apps are properly configured

### Logs

Check the console output for detailed error messages and debugging information.

## License

[Add your license information here]

