# Demo Instructions for Integration Hub

## Quick Start Demo

### 1. Start the Backend Server
```bash
cd backend
pip install -r requirements.txt
python main.py
```
The backend will run on `http://localhost:8000`

### 2. Start the Frontend
```bash
cd frontend
npm install
npm start
```
The frontend will run on `http://localhost:3000`

### 3. Demo Flow

#### Step 1: Connect to HubSpot
1. Open the application in your browser
2. You'll see three integration cards: HubSpot, Airtable, and Notion
3. Click "Connect to HubSpot" on the HubSpot card
4. Complete the OAuth flow in the popup window
5. Once connected, the card will show "Connected" status

#### Step 2: Fetch HubSpot Data
1. After connecting to HubSpot, click "Fetch Data"
2. The application will retrieve existing contacts from HubSpot
3. Data will be displayed in a table below the integration cards

#### Step 3: Create a New Contact
1. Click "Create Contact" on the HubSpot card
2. Fill in the contact form:
   - First Name: John
   - Last Name: Doe
   - Email: john.doe@example.com
   - Phone: +1-555-0123
   - Company: Acme Corp
3. Click "Create Contact"
4. The new contact will be added to HubSpot and appear in the data table

#### Step 4: Connect to Other Integrations
1. Repeat the process for Airtable and Notion
2. Each integration will show its own data when fetched
3. All data is displayed in a unified format

### 4. Features to Highlight

#### Modern UI Design
- Clean, card-based layout
- Color-coded integration cards
- Responsive design that works on mobile
- Loading states and error handling
- Success/error notifications

#### Data Management
- Unified data table for all integrations
- Real-time data fetching
- Contact creation with validation
- Proper date formatting
- Action buttons for future functionality

#### Navigation
- Top navigation bar
- Mobile-friendly drawer menu
- Easy switching between pages
- Professional branding

### 5. Technical Features

#### OAuth Integration
- Secure OAuth 2.0 flow for all platforms
- Popup window handling
- Automatic credential management
- Error handling for failed authentications

#### API Communication
- RESTful API calls to backend
- Form data handling
- JSON serialization/deserialization
- Proper error handling and user feedback

#### State Management
- React hooks for state management
- Integration status tracking
- Data caching and display
- Loading and error states

### 6. Error Scenarios to Test

1. **Invalid Credentials**: Try connecting without proper OAuth setup
2. **Network Errors**: Disconnect internet and try operations
3. **Empty Data**: Connect to an account with no data
4. **Form Validation**: Try creating a contact with missing required fields

### 7. Browser Compatibility

Test the application in:
- Chrome (recommended)
- Firefox
- Safari
- Edge

### 8. Mobile Testing

1. Open browser developer tools
2. Switch to mobile view
3. Test the responsive navigation
4. Verify touch interactions work properly

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure backend is running on port 8000
2. **OAuth Failures**: Check environment variables are set correctly
3. **Data Not Loading**: Verify API endpoints are working
4. **Styling Issues**: Clear browser cache and reload

### Environment Variables Required

Backend needs these environment variables:
```
HUBSPOT_CLIENT_ID=your_hubspot_client_id
HUBSPOT_CLIENT_SECRET=your_hubspot_client_secret
AIRTABLE_CLIENT_ID=your_airtable_client_id
AIRTABLE_CLIENT_SECRET=your_airtable_client_secret
NOTION_CLIENT_ID=your_notion_client_id
NOTION_CLIENT_SECRET=your_notion_client_secret
```

## Success Criteria

The demo should demonstrate:
- ✅ Modern, professional UI design
- ✅ Seamless OAuth integration
- ✅ Real-time data fetching and display
- ✅ Contact creation functionality
- ✅ Error handling and user feedback
- ✅ Responsive design
- ✅ Clean code architecture
- ✅ Integration with all three platforms (HubSpot, Airtable, Notion)
