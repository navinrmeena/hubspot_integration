import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Divider,
  Stack,
  Avatar,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  CloudDone as CloudDoneIcon,
  CloudOff as CloudOffIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import axios from 'axios';

const DataManagementPage = () => {
  const [integrations, setIntegrations] = useState({
    hubspot: { 
      connected: false, 
      credentials: null, 
      data: [],
      buttonLoading: {
        connect: false,
        fetch: false,
        create: false,
        view: false,
        edit: false,
        delete: false
      }
    },
    airtable: { 
      connected: false, 
      credentials: null, 
      data: [],
      buttonLoading: {
        connect: false,
        fetch: false,
        create: false
      }
    },
    notion: { 
      connected: false, 
      credentials: null, 
      data: [],
      buttonLoading: {
        connect: false,
        fetch: false
      }
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedIntegration, setSelectedIntegration] = useState('');
  const [createContactDialog, setCreateContactDialog] = useState(false);
  const [createRecordDialog, setCreateRecordDialog] = useState(false);
  const [viewContactDialog, setViewContactDialog] = useState(false);
  const [editContactDialog, setEditContactDialog] = useState(false);
  const [airtableBases, setAirtableBases] = useState({});
  const [selectedBase, setSelectedBase] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [newContact, setNewContact] = useState({
    firstname: '',
    lastname: '',
    email: '',
    phone: '',
    company: ''
  });
  const [editContact, setEditContact] = useState({
    firstname: '',
    lastname: '',
    email: '',
    phone: '',
    company: ''
  });
  const [newRecord, setNewRecord] = useState({
    Name: '',
    Description: '',
    Status: 'Active'
  });

  const integrationConfig = {
    hubspot: {
      name: 'HubSpot',
      color: '#ff7a59',
      icon: '🏢',
      description: 'CRM and Marketing Platform'
    },
    airtable: {
      name: 'Airtable',
      color: '#18bfff',
      icon: '📊',
      description: 'Database and Spreadsheet Platform'
    },
    notion: {
      name: 'Notion',
      color: '#000000',
      icon: '📝',
      description: 'Workspace and Documentation Platform'
    }
  };

  // Helper functions for button-specific loading states
  const setButtonLoading = (integrationType, buttonType, loading) => {
    setIntegrations(prev => ({
      ...prev,
      [integrationType]: {
        ...prev[integrationType],
        buttonLoading: {
          ...prev[integrationType].buttonLoading,
          [buttonType]: loading
        }
      }
    }));
  };

  const isButtonLoading = (integrationType, buttonType) => {
    return integrations[integrationType]?.buttonLoading?.[buttonType] || false;
  };

  const handleConnect = async (integrationType) => {
    try {
      setButtonLoading(integrationType, 'connect', true);
      setError(null);
      
      const formData = new FormData();
      formData.append('user_id', 'TestUser');
      formData.append('org_id', 'TestOrg');
      
      const response = await axios.post(
        `http://localhost:8000/integrations/${integrationType}/authorize`,
        formData
      );
      
      const authURL = response.data;
      const newWindow = window.open(authURL, `${integrationType} Authorization`, 'width=600, height=600');
      
      const pollTimer = setInterval(() => {
        if (newWindow?.closed) {
          clearInterval(pollTimer);
          handleWindowClosed(integrationType);
        }
      }, 200);
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Connection failed');
      setButtonLoading(integrationType, 'connect', false);
    }
  };

  const handleWindowClosed = async (integrationType) => {
    try {
      const formData = new FormData();
      formData.append('user_id', 'TestUser');
      formData.append('org_id', 'TestOrg');
      
      const response = await axios.post(
        `http://localhost:8000/integrations/${integrationType}/credentials`,
        formData
      );
      
      const credentials = response.data;
      
      setIntegrations(prev => ({
        ...prev,
        [integrationType]: {
          ...prev[integrationType],
          connected: true,
          credentials: credentials,
          buttonLoading: {
            ...prev[integrationType].buttonLoading,
            connect: false
          }
        }
      }));
      
      setSuccess(`${integrationConfig[integrationType].name} connected successfully!`);
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to get credentials');
      setButtonLoading(integrationType, 'connect', false);
    }
  };

  const handleFetchData = async (integrationType) => {
    try {
      setButtonLoading(integrationType, 'fetch', true);
      setError(null);
      
      const credentials = integrations[integrationType].credentials;
      const formData = new FormData();
      formData.append('credentials', JSON.stringify(credentials));
      
      let endpoint;
      if (integrationType === 'hubspot') {
        endpoint = 'get_hubspot_items';
      } else {
        endpoint = 'load';
      }
      
      const response = await axios.post(
        `http://localhost:8000/integrations/${integrationType}/${endpoint}`,
        formData
      );
      
      const data = response.data || [];
      
      setIntegrations(prev => ({
        ...prev,
        [integrationType]: {
          ...prev[integrationType],
          data: data,
          buttonLoading: {
            ...prev[integrationType].buttonLoading,
            fetch: false
          }
        }
      }));
      
      setSuccess(`Fetched ${data.length} items from ${integrationConfig[integrationType].name}`);
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch data');
      setButtonLoading(integrationType, 'fetch', false);
    }
  };

  const handleCreateContact = async () => {
    try {
      setButtonLoading('hubspot', 'create', true);
      setError(null);
      
      const credentials = integrations.hubspot.credentials;
      const formData = new FormData();
      formData.append('credentials', JSON.stringify(credentials));
      formData.append('contact_data', JSON.stringify(newContact));
      
      const response = await axios.post(
        'http://localhost:8000/integrations/hubspot/create_contact',
        formData
      );
      
      const createdContact = response.data;
      
      setIntegrations(prev => ({
        ...prev,
        hubspot: {
          ...prev.hubspot,
          data: [createdContact, ...prev.hubspot.data],
          buttonLoading: {
            ...prev.hubspot.buttonLoading,
            create: false
          }
        }
      }));
      
      setSuccess('Contact created successfully in HubSpot!');
      setCreateContactDialog(false);
      setNewContact({
        firstname: '',
        lastname: '',
        email: '',
        phone: '',
        company: ''
      });
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create contact');
      setButtonLoading('hubspot', 'create', false);
    }
  };

  const handleFetchAirtableBases = async () => {
    try {
      setButtonLoading('airtable', 'create', true);
      setError(null);
      
      const credentials = integrations.airtable.credentials;
      const formData = new FormData();
      formData.append('credentials', JSON.stringify(credentials));
      
      const response = await axios.post(
        'http://localhost:8000/integrations/airtable/bases',
        formData
      );
      
      setAirtableBases(response.data);
      setCreateRecordDialog(true);
      setButtonLoading('airtable', 'create', false);
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch Airtable bases');
      setButtonLoading('airtable', 'create', false);
    }
  };

  const handleCreateRecord = async () => {
    try {
      setButtonLoading('airtable', 'create', true);
      setError(null);
      
      if (!selectedBase || !selectedTable) {
        setError('Please select a base and table');
        setButtonLoading('airtable', 'create', false);
        return;
      }
      
      const credentials = integrations.airtable.credentials;
      const formData = new FormData();
      formData.append('credentials', JSON.stringify(credentials));
      formData.append('base_id', selectedBase);
      formData.append('table_id', selectedTable);
      formData.append('record_data', JSON.stringify(newRecord));
      
      const response = await axios.post(
        'http://localhost:8000/integrations/airtable/create_record',
        formData
      );
      
      const createdRecord = response.data;
      
      setIntegrations(prev => ({
        ...prev,
        airtable: {
          ...prev.airtable,
          data: [createdRecord, ...prev.airtable.data],
          buttonLoading: {
            ...prev.airtable.buttonLoading,
            create: false
          }
        }
      }));
      
      setSuccess('Record created successfully in Airtable!');
      setCreateRecordDialog(false);
      setNewRecord({
        Name: '',
        Description: '',
        Status: 'Active'
      });
      setSelectedBase('');
      setSelectedTable('');
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create record');
      setButtonLoading('airtable', 'create', false);
    }
  };

  const handleViewContact = async (contact) => {
    try {
      setButtonLoading('hubspot', 'view', true);
      setError(null);
      
      const credentials = integrations.hubspot.credentials;
      const formData = new FormData();
      formData.append('credentials', JSON.stringify(credentials));
      formData.append('contact_id', contact.id);
      
      const response = await axios.post(
        'http://localhost:8000/integrations/hubspot/get_contact',
        formData
      );
      
      setSelectedContact(response.data);
      setViewContactDialog(true);
      setButtonLoading('hubspot', 'view', false);
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch contact details');
      setButtonLoading('hubspot', 'view', false);
    }
  };

  const handleEditContact = (contact) => {
    setSelectedContact(contact);
    setEditContact({
      firstname: contact.properties?.firstname || '',
      lastname: contact.properties?.lastname || '',
      email: contact.properties?.email || '',
      phone: contact.properties?.phone || '',
      company: contact.properties?.company || ''
    });
    setEditContactDialog(true);
  };

  const handleUpdateContact = async () => {
    try {
      setButtonLoading('hubspot', 'edit', true);
      setError(null);
      
      const credentials = integrations.hubspot.credentials;
      const formData = new FormData();
      formData.append('credentials', JSON.stringify(credentials));
      formData.append('contact_id', selectedContact.id);
      formData.append('contact_data', JSON.stringify(editContact));
      
      const response = await axios.post(
        'http://localhost:8000/integrations/hubspot/update_contact',
        formData
      );
      
      const updatedContact = response.data;
      
      setIntegrations(prev => ({
        ...prev,
        hubspot: {
          ...prev.hubspot,
          data: prev.hubspot.data.map(contact => 
            contact.id === selectedContact.id ? updatedContact : contact
          ),
          buttonLoading: {
            ...prev.hubspot.buttonLoading,
            edit: false
          }
        }
      }));
      
      setSuccess('Contact updated successfully!');
      setEditContactDialog(false);
      setSelectedContact(null);
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update contact');
      setButtonLoading('hubspot', 'edit', false);
    }
  };

  const handleDeleteContact = async (contact) => {
    if (!window.confirm(`Are you sure you want to delete ${contact.name}?`)) {
      return;
    }
    
    try {
      setButtonLoading('hubspot', 'delete', true);
      setError(null);
      
      const credentials = integrations.hubspot.credentials;
      const formData = new FormData();
      formData.append('credentials', JSON.stringify(credentials));
      formData.append('contact_id', contact.id);
      
      await axios.post(
        'http://localhost:8000/integrations/hubspot/delete_contact',
        formData
      );
      
      setIntegrations(prev => ({
        ...prev,
        hubspot: {
          ...prev.hubspot,
          data: prev.hubspot.data.filter(c => c.id !== contact.id),
          buttonLoading: {
            ...prev.hubspot.buttonLoading,
            delete: false
          }
        }
      }));
      
      setSuccess('Contact deleted successfully!');
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete contact');
      setButtonLoading('hubspot', 'delete', false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const renderDataTable = (data, integrationType) => {
    if (!data || data.length === 0) {
      return (
        <Box textAlign="center" py={4}>
          <Typography variant="body2" color="text.secondary">
            No data available. Click "Fetch Data" to load items.
          </Typography>
        </Box>
      );
    }

    return (
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Modified</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((item, index) => (
              <TableRow key={item.id || index}>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {item.id?.substring(0, 8) || 'N/A'}...
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {item.name || 'Unnamed'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={item.type || 'Unknown'} 
                    size="small" 
                    color="primary"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>{formatDate(item.creation_time)}</TableCell>
                <TableCell>{formatDate(item.last_modified_time)}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="View Details">
                      <IconButton 
                        size="small" 
                        onClick={() => handleViewContact(item)}
                        disabled={isButtonLoading('hubspot', 'view')}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton 
                        size="small" 
                        onClick={() => handleEditContact(item)}
                        disabled={isButtonLoading('hubspot', 'edit')}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDeleteContact(item)}
                        disabled={isButtonLoading('hubspot', 'delete')}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 4 }}>
        Integration Data Management
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {Object.entries(integrations).map(([key, integration]) => {
          const config = integrationConfig[key];
          return (
            <Grid item xs={12} md={4} key={key}>
              <Card 
                sx={{ 
                  height: '100%',
                  border: integration.connected ? `2px solid ${config.color}` : '1px solid #e0e0e0',
                  transition: 'all 0.3s ease'
                }}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Avatar sx={{ bgcolor: config.color, mr: 2 }}>
                      {config.icon}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        {config.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {config.description}
                      </Typography>
                    </Box>
                  </Box>

                  <Box display="flex" alignItems="center" mb={2}>
                    <Badge
                      color={integration.connected ? 'success' : 'default'}
                      variant="dot"
                    >
                      <Chip
                        icon={integration.connected ? <CloudDoneIcon /> : <CloudOffIcon />}
                        label={integration.connected ? 'Connected' : 'Disconnected'}
                        color={integration.connected ? 'success' : 'default'}
                        variant={integration.connected ? 'filled' : 'outlined'}
                      />
                    </Badge>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Stack spacing={2}>
                    {!integration.connected ? (
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={() => handleConnect(key)}
                        disabled={isButtonLoading(key, 'connect')}
                        startIcon={isButtonLoading(key, 'connect') ? <CircularProgress size={20} /> : <AddIcon />}
                        sx={{ bgcolor: config.color, '&:hover': { bgcolor: config.color, opacity: 0.9 } }}
                      >
                        Connect to {config.name}
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outlined"
                          fullWidth
                          onClick={() => handleFetchData(key)}
                          disabled={isButtonLoading(key, 'fetch')}
                          startIcon={isButtonLoading(key, 'fetch') ? <CircularProgress size={20} /> : <RefreshIcon />}
                        >
                          Fetch Data
                        </Button>
                        
                        {key === 'hubspot' && (
                          <Button
                            variant="contained"
                            fullWidth
                            onClick={() => setCreateContactDialog(true)}
                            disabled={isButtonLoading('hubspot', 'create')}
                            startIcon={<AddIcon />}
                            sx={{ bgcolor: config.color, '&:hover': { bgcolor: config.color, opacity: 0.9 } }}
                          >
                            Create Contact
                          </Button>
                        )}
                        
                        {key === 'airtable' && (
                          <Button
                            variant="contained"
                            fullWidth
                            onClick={handleFetchAirtableBases}
                            disabled={isButtonLoading('airtable', 'create')}
                            startIcon={<AddIcon />}
                            sx={{ bgcolor: config.color, '&:hover': { bgcolor: config.color, opacity: 0.9 } }}
                          >
                            Create Record
                          </Button>
                        )}
                      </>
                    )}

                    {integration.data.length > 0 && (
                      <Typography variant="body2" color="text.secondary" textAlign="center">
                        {integration.data.length} items loaded
                      </Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Data Display Section */}
      {Object.entries(integrations).some(([_, integration]) => integration.connected && integration.data.length > 0) && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
            Data Overview
          </Typography>
          
          {Object.entries(integrations).map(([key, integration]) => {
            if (!integration.connected || integration.data.length === 0) return null;
            
            const config = integrationConfig[key];
            return (
              <Box key={key} sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom sx={{ color: config.color, fontWeight: 'bold' }}>
                  {config.name} Data ({integration.data.length} items)
                </Typography>
                {renderDataTable(integration.data, key)}
              </Box>
            );
          })}
        </Box>
      )}

      {/* Create Contact Dialog */}
      <Dialog 
        open={createContactDialog} 
        onClose={() => setCreateContactDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New HubSpot Contact</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="First Name"
                value={newContact.firstname}
                onChange={(e) => setNewContact(prev => ({ ...prev, firstname: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={newContact.lastname}
                onChange={(e) => setNewContact(prev => ({ ...prev, lastname: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Phone"
                value={newContact.phone}
                onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Company"
                value={newContact.company}
                onChange={(e) => setNewContact(prev => ({ ...prev, company: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateContactDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateContact} 
            variant="contained"
            disabled={isButtonLoading('hubspot', 'create') || !newContact.firstname || !newContact.lastname}
          >
            {isButtonLoading('hubspot', 'create') ? <CircularProgress size={20} /> : 'Create Contact'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Airtable Record Dialog */}
      <Dialog 
        open={createRecordDialog} 
        onClose={() => setCreateRecordDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Airtable Record</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Select Base</InputLabel>
                <Select
                  value={selectedBase}
                  onChange={(e) => {
                    setSelectedBase(e.target.value);
                    setSelectedTable(''); // Reset table selection
                  }}
                  label="Select Base"
                >
                  {Object.entries(airtableBases).map(([baseId, base]) => (
                    <MenuItem key={baseId} value={baseId}>
                      {base.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth disabled={!selectedBase}>
                <InputLabel>Select Table</InputLabel>
                <Select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  label="Select Table"
                >
                  {selectedBase && airtableBases[selectedBase]?.tables.map((table) => (
                    <MenuItem key={table.id} value={table.id}>
                      {table.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                value={newRecord.Name}
                onChange={(e) => setNewRecord(prev => ({ ...prev, Name: e.target.value }))}
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={newRecord.Description}
                onChange={(e) => setNewRecord(prev => ({ ...prev, Description: e.target.value }))}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={newRecord.Status}
                  onChange={(e) => setNewRecord(prev => ({ ...prev, Status: e.target.value }))}
                  label="Status"
                >
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Inactive">Inactive</MenuItem>
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateRecordDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateRecord} 
            variant="contained"
            disabled={isButtonLoading('airtable', 'create') || !selectedBase || !selectedTable || !newRecord.Name}
            sx={{ bgcolor: '#18bfff', '&:hover': { bgcolor: '#18bfff', opacity: 0.9 } }}
          >
            {isButtonLoading('airtable', 'create') ? <CircularProgress size={20} /> : 'Create Record'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Contact Dialog */}
      <Dialog 
        open={viewContactDialog} 
        onClose={() => setViewContactDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Contact Details</DialogTitle>
        <DialogContent>
          {selectedContact && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">First Name</Typography>
                <Typography variant="body1">{selectedContact.properties?.firstname || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Last Name</Typography>
                <Typography variant="body1">{selectedContact.properties?.lastname || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                <Typography variant="body1">{selectedContact.properties?.email || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Phone</Typography>
                <Typography variant="body1">{selectedContact.properties?.phone || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Company</Typography>
                <Typography variant="body1">{selectedContact.properties?.company || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Created</Typography>
                <Typography variant="body1">{formatDate(selectedContact.creation_time)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">Modified</Typography>
                <Typography variant="body1">{formatDate(selectedContact.last_modified_time)}</Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewContactDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog 
        open={editContactDialog} 
        onClose={() => setEditContactDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Contact</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="First Name"
                value={editContact.firstname}
                onChange={(e) => setEditContact(prev => ({ ...prev, firstname: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={editContact.lastname}
                onChange={(e) => setEditContact(prev => ({ ...prev, lastname: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={editContact.email}
                onChange={(e) => setEditContact(prev => ({ ...prev, email: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Phone"
                value={editContact.phone}
                onChange={(e) => setEditContact(prev => ({ ...prev, phone: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Company"
                value={editContact.company}
                onChange={(e) => setEditContact(prev => ({ ...prev, company: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditContactDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleUpdateContact} 
            variant="contained"
            disabled={isButtonLoading('hubspot', 'edit') || !editContact.firstname || !editContact.lastname}
            sx={{ bgcolor: '#ff7a59', '&:hover': { bgcolor: '#ff7a59', opacity: 0.9 } }}
          >
            {isButtonLoading('hubspot', 'edit') ? <CircularProgress size={20} /> : 'Update Contact'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataManagementPage;
