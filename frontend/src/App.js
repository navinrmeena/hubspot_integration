import React, { useState } from 'react';
import { Box, CssBaseline } from '@mui/material';
import { IntegrationForm } from './integration-form';
import DataManagementPage from './DataManagementPage';
import Navigation from './Navigation';

function App() {
  const [currentPage, setCurrentPage] = useState('data');

  const renderPage = () => {
    switch (currentPage) {
      case 'data':
        return <DataManagementPage />;
      case 'integration':
        return <IntegrationForm />;
      default:
        return <DataManagementPage />;
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - 0px)` },
          mt: '64px'
        }}
      >
        {renderPage()}
      </Box>
    </Box>
  );
}

export default App;
