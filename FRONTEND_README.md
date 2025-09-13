# Integration Hub Frontend

A modern React application for managing integrations with HubSpot, Airtable, and Notion. This frontend provides a beautiful and intuitive interface for connecting to these services, creating data, and fetching existing data.

## Features

### 🎨 Modern UI Design
- Clean, responsive Material-UI design
- Dark/light theme support
- Mobile-friendly navigation
- Real-time status indicators
- Loading states and error handling

### 🔗 Multi-Platform Integration
- **HubSpot**: CRM contact management with create/read operations
- **Airtable**: Database and spreadsheet integration
- **Notion**: Workspace and documentation platform integration

### 📊 Data Management
- Unified data table displaying IntegrationItem objects
- Real-time data fetching and display
- Contact creation with form validation
- Data visualization with proper formatting

### 🚀 Key Components

#### DataManagementPage
The main page featuring:
- Integration connection cards with OAuth flow
- Data fetching and display
- HubSpot contact creation dialog
- Unified data table for all integrations

#### Navigation
- Responsive navigation bar
- Page switching between Data Management and Integration Setup
- Mobile-friendly drawer navigation

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Backend server running on localhost:8000

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Environment Setup

Make sure your backend server is running with the following environment variables:
- `HUBSPOT_CLIENT_ID`
- `HUBSPOT_CLIENT_SECRET`
- `AIRTABLE_CLIENT_ID`
- `AIRTABLE_CLIENT_SECRET`
- `NOTION_CLIENT_ID`
- `NOTION_CLIENT_SECRET`

## Usage

### Connecting to Integrations

1. **Select Integration**: Choose from HubSpot, Airtable, or Notion
2. **Connect**: Click the "Connect" button to initiate OAuth flow
3. **Authorize**: Complete the OAuth process in the popup window
4. **Fetch Data**: Once connected, click "Fetch Data" to load existing items

### Creating HubSpot Contacts

1. **Connect to HubSpot**: Follow the connection process above
2. **Create Contact**: Click "Create Contact" button
3. **Fill Form**: Enter contact details (first name, last name, email, phone, company)
4. **Submit**: Click "Create Contact" to add to HubSpot

### Viewing Data

- All fetched data is displayed in a unified table format
- Data includes ID, name, type, creation date, and modification date
- Actions available: view, edit, delete (UI ready for implementation)

## API Integration

The frontend communicates with the backend through the following endpoints:

### HubSpot
- `POST /integrations/hubspot/authorize` - Initiate OAuth
- `POST /integrations/hubspot/credentials` - Get OAuth credentials
- `POST /integrations/hubspot/get_hubspot_items` - Fetch contacts
- `POST /integrations/hubspot/create_contact` - Create new contact

### Airtable
- `POST /integrations/airtable/authorize` - Initiate OAuth
- `POST /integrations/airtable/credentials` - Get OAuth credentials
- `POST /integrations/airtable/load` - Fetch bases and tables

### Notion
- `POST /integrations/notion/authorize` - Initiate OAuth
- `POST /integrations/notion/credentials` - Get OAuth credentials
- `POST /integrations/notion/load` - Fetch workspace data

## Data Structure

The application works with `IntegrationItem` objects that contain:
- `id`: Unique identifier
- `type`: Item type (contact, base, table, etc.)
- `name`: Display name
- `creation_time`: Creation timestamp
- `last_modified_time`: Last modification timestamp
- `parent_id`: Parent item ID (for hierarchical data)
- Additional properties specific to each integration

## Styling and Theming

The application uses Material-UI with custom styling:
- Primary colors match each integration's brand
- Responsive grid layout
- Consistent spacing and typography
- Loading states and error handling
- Modern card-based design

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development

### Project Structure
```
src/
├── App.js                 # Main application component
├── DataManagementPage.js  # Main data management interface
├── Navigation.js          # Navigation component
├── integration-form.js    # Legacy integration form
├── data-form.js          # Legacy data form
└── integrations/         # Integration-specific components
    ├── hubspot.js
    ├── airtable.js
    └── notion.js
```

### Key Dependencies
- `@mui/material`: UI component library
- `@mui/icons-material`: Material icons
- `axios`: HTTP client for API calls
- `react`: React framework

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the VectorShift Integration Technical Assessment.
