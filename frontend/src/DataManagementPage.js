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
  Stack,
  Avatar
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
  // User configuration state
  const [user, setUser] = useState('TestUser');
  const [org, setOrg] = useState('TestOrg');
  
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
      formData.append('user_id', user);
      formData.append('org_id', org);
      
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
      formData.append('user_id', user);
      formData.append('org_id', org);
      
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
      
      const formData = new FormData();
      formData.append('credentials', JSON.stringify(integrations[integrationType].credentials));
      
      let response;
      if (integrationType === 'hubspot') {
        response = await axios.post('http://localhost:8000/integrations/hubspot/get_hubspot_items', formData);
      } else if (integrationType === 'airtable') {
        response = await axios.post('http://localhost:8000/integrations/airtable/load', formData);
      } else if (integrationType === 'notion') {
        response = await axios.post('http://localhost:8000/integrations/notion/load', formData);
      }
      
      const data = response.data;
      
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
      
      setSuccess(`Data fetched successfully from ${integrationConfig[integrationType].name}!`);
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch data');
      setButtonLoading(integrationType, 'fetch', false);
    }
  };

  const handleDisconnect = (integrationType) => {
    setIntegrations(prev => ({
      ...prev,
      [integrationType]: {
        ...prev[integrationType],
        connected: false,
        credentials: null,
        data: []
      }
    }));
    setSuccess(`${integrationConfig[integrationType].name} disconnected successfully!`);
  };

  const handleCreateContact = async () => {
    try {
      setButtonLoading('hubspot', 'create', true);
      setError(null);
      
      const formData = new FormData();
      formData.append('credentials', JSON.stringify(integrations.hubspot.credentials));
      formData.append('contact_data', JSON.stringify(newContact));
      
      const response = await axios.post('http://localhost:8000/integrations/hubspot/create_contact', formData);
      
      setSuccess('Contact created successfully!');
      setCreateContactDialog(false);
      setNewContact({
        firstname: '',
        lastname: '',
        email: '',
        phone: '',
        company: ''
      });
      
      // Refresh the data
      handleFetchData('hubspot');
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create contact');
    } finally {
      setButtonLoading('hubspot', 'create', false);
    }
  };

  const handleViewContact = async (contactId) => {
    try {
      setButtonLoading('hubspot', 'view', true);
      setError(null);
      
      const formData = new FormData();
      formData.append('credentials', JSON.stringify(integrations.hubspot.credentials));
      formData.append('contact_id', contactId);
      
      const response = await axios.post('http://localhost:8000/integrations/hubspot/get_contact', formData);
      
      setSelectedContact(response.data);
      setViewContactDialog(true);
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch contact');
    } finally {
      setButtonLoading('hubspot', 'view', false);
    }
  };

  const handleEditContact = async () => {
    try {
      setButtonLoading('hubspot', 'edit', true);
      setError(null);
      
      const formData = new FormData();
      formData.append('credentials', JSON.stringify(integrations.hubspot.credentials));
      formData.append('contact_id', selectedContact.id);
      formData.append('contact_data', JSON.stringify(editContact));
      
      const response = await axios.post('http://localhost:8000/integrations/hubspot/update_contact', formData);
      
      setSuccess('Contact updated successfully!');
      setEditContactDialog(false);
      
      // Refresh the data
      handleFetchData('hubspot');
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update contact');
    } finally {
      setButtonLoading('hubspot', 'edit', false);
    }
  };

  const handleDeleteContact = async (contactId) => {
    try {
      setButtonLoading('hubspot', 'delete', true);
      setError(null);
      
      const formData = new FormData();
      formData.append('credentials', JSON.stringify(integrations.hubspot.credentials));
      formData.append('contact_id', contactId);
      
      const response = await axios.post('http://localhost:8000/integrations/hubspot/delete_contact', formData);
      
      setSuccess('Contact deleted successfully!');
      
      // Refresh the data
      handleFetchData('hubspot');
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete contact');
    } finally {
      setButtonLoading('hubspot', 'delete', false);
    }
  };

  const handleCreateRecord = async () => {
    try {
      setButtonLoading('airtable', 'create', true);
      setError(null);
      
      const formData = new FormData();
      formData.append('credentials', JSON.stringify(integrations.airtable.credentials));
      formData.append('base_id', selectedBase);
      formData.append('table_id', selectedTable);
      formData.append('record_data', JSON.stringify(newRecord));
      
      const response = await axios.post('http://localhost:8000/integrations/airtable/create_record', formData);
      
      setSuccess('Record created successfully!');
      setCreateRecordDialog(false);
      setNewRecord({
        Name: '',
        Description: '',
        Status: 'Active'
      });
      
      // Refresh the data
      handleFetchData('airtable');
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create record');
    } finally {
      setButtonLoading('airtable', 'create', false);
    }
  };

  const loadAirtableBases = async () => {
    try {
      const formData = new FormData();
      formData.append('credentials', JSON.stringify(integrations.airtable.credentials));
      
      const response = await axios.post('http://localhost:8000/integrations/airtable/bases', formData);
      setAirtableBases(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load Airtable bases');
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* User Input Section */}
      <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          User Configuration
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="User ID"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Organization ID"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              variant="outlined"
              size="small"
            />
          </Grid>
        </Grid>
      </Box>

      {/* Error and Success Messages */}
      {error && (
        <Alert severity="error" onClose={clearMessages} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={clearMessages} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Integration Cards */}
      <Grid container spacing={3}>
        {Object.entries(integrationConfig).map(([key, config]) => (
          <Grid item xs={12} md={4} key={key}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Avatar sx={{ bgcolor: config.color, mr: 2 }}>
                    {config.icon}
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{config.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {config.description}
                    </Typography>
                  </Box>
                </Box>

                <Box display="flex" alignItems="center" mb={2}>
                  <Chip
                    icon={integrations[key].connected ? <CloudDoneIcon /> : <CloudOffIcon />}
                    label={integrations[key].connected ? 'Connected' : 'Disconnected'}
                    color={integrations[key].connected ? 'success' : 'default'}
                    variant="outlined"
                  />
                </Box>

                <Stack spacing={1}>
                  {!integrations[key].connected ? (
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={() => handleConnect(key)}
                      disabled={isButtonLoading(key, 'connect')}
                      startIcon={isButtonLoading(key, 'connect') ? <CircularProgress size={20} /> : null}
                    >
                      {isButtonLoading(key, 'connect') ? 'Connecting...' : 'Connect'}
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
                        {isButtonLoading(key, 'fetch') ? 'Fetching...' : 'Fetch Data'}
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        fullWidth
                        onClick={() => handleDisconnect(key)}
                      >
                        Disconnect
                      </Button>
                    </>
                  )}
                </Stack>

                {/* HubSpot specific actions */}
                {key === 'hubspot' && integrations[key].connected && (
                  <Box mt={2}>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => setCreateContactDialog(true)}
                      disabled={isButtonLoading(key, 'create')}
                      startIcon={<AddIcon />}
                      sx={{ mb: 1 }}
                    >
                      Create Contact
                    </Button>
                  </Box>
                )}

                {/* Airtable specific actions */}
                {key === 'airtable' && integrations[key].connected && (
                  <Box mt={2}>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => {
                        loadAirtableBases();
                        setCreateRecordDialog(true);
                      }}
                      disabled={isButtonLoading(key, 'create')}
                      startIcon={<AddIcon />}
                    >
                      Create Record
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Data Display */}
      {Object.entries(integrations).map(([key, integration]) => (
        integration.connected && integration.data.length > 0 && (
          <Box key={key} mt={4}>
            <Typography variant="h5" gutterBottom>
              {integrationConfig[key].name} Data
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {integration.data.map((item, index) => (
                    <TableRow key={item.id || index}>
                      <TableCell>{item.id}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.type}</TableCell>
                      <TableCell>
                        {key === 'hubspot' && (
                          <Box>
                            <IconButton
                              size="small"
                              onClick={() => handleViewContact(item.id)}
                              disabled={isButtonLoading(key, 'view')}
                            >
                              <VisibilityIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedContact(item);
                                // Populate edit form with existing data
                                setEditContact({
                                  firstname: item.properties?.firstname || '',
                                  lastname: item.properties?.lastname || '',
                                  email: item.properties?.email || '',
                                  phone: item.properties?.phone || '',
                                  company: item.properties?.company || ''
                                });
                                setEditContactDialog(true);
                              }}
                              disabled={isButtonLoading(key, 'edit')}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteContact(item.id)}
                              disabled={isButtonLoading(key, 'delete')}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )
      ))}

      {/* Create Contact Dialog */}
      <Dialog open={createContactDialog} onClose={() => setCreateContactDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Contact</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={newContact.firstname}
                onChange={(e) => setNewContact(prev => ({ ...prev, firstname: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
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
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={newContact.phone}
                onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
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
            disabled={isButtonLoading('hubspot', 'create')}
          >
            {isButtonLoading('hubspot', 'create') ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Contact Dialog */}
      <Dialog open={viewContactDialog} onClose={() => setViewContactDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Contact Details</DialogTitle>
        <DialogContent>
          {selectedContact && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={selectedContact.properties?.firstname || ''}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={selectedContact.properties?.lastname || ''}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  value={selectedContact.properties?.email || ''}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={selectedContact.properties?.phone || ''}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Company"
                  value={selectedContact.properties?.company || ''}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewContactDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog open={editContactDialog} onClose={() => setEditContactDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Contact</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={editContact.firstname}
                onChange={(e) => setEditContact(prev => ({ ...prev, firstname: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
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
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={editContact.phone}
                onChange={(e) => setEditContact(prev => ({ ...prev, phone: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
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
            onClick={handleEditContact}
            variant="contained"
            disabled={isButtonLoading('hubspot', 'edit')}
          >
            {isButtonLoading('hubspot', 'edit') ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Record Dialog */}
      <Dialog open={createRecordDialog} onClose={() => setCreateRecordDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Record</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Base</InputLabel>
                <Select
                  value={selectedBase}
                  onChange={(e) => setSelectedBase(e.target.value)}
                >
                  {Object.entries(airtableBases).map(([baseId, baseName]) => (
                    <MenuItem key={baseId} value={baseId}>{baseName}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Table</InputLabel>
                <Select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  disabled={!selectedBase}
                >
                  {selectedBase && airtableBases[selectedBase] && 
                    Object.entries(airtableBases[selectedBase]).map(([tableId, tableName]) => (
                      <MenuItem key={tableId} value={tableId}>{tableName}</MenuItem>
                    ))
                  }
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                value={newRecord.Name}
                onChange={(e) => setNewRecord(prev => ({ ...prev, Name: e.target.value }))}
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
              <TextField
                fullWidth
                label="Status"
                value={newRecord.Status}
                onChange={(e) => setNewRecord(prev => ({ ...prev, Status: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateRecordDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreateRecord}
            variant="contained"
            disabled={isButtonLoading('airtable', 'create') || !selectedBase || !selectedTable}
          >
            {isButtonLoading('airtable', 'create') ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataManagementPage;
