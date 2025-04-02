import { useEffect, useRef } from 'react';
import { Paper, Title, Text, Button, Loader, Box } from '@mantine/core';
import * as $3Dmol from '3dmol';

// Custom styled components
const StyledPaper = ({ children, ...props }) => (
  <Paper 
    shadow="sm" 
    p="lg" 
    style={{ 
      borderWidth: 1, 
      borderStyle: 'solid', 
      borderColor: '#DCE8E0', 
      borderRadius: '0.375rem',
      backgroundColor: '#F5F5F5',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      transition: 'all 0.2s ease-out',
    }} 
    className="animate-entrance"
    {...props}
  >
    {children}
  </Paper>
);

const StyledTitle = ({ children, ...props }) => (
  <Title 
    order={3} 
    style={{ 
      fontSize: '1.25rem', 
      marginBottom: '1rem',
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      fontWeight: 500,
      color: '#33523E',
      display: 'flex',
      alignItems: 'center'
    }} 
    {...props}
  >
    {children}
  </Title>
);

const StyledButton = ({ children, ...props }) => (
  <Button
    styles={{
      root: {
        backgroundColor: '#6E9F7F',
        color: 'white',
        border: 'none',
        '&:hover': {
          backgroundColor: '#5A8B6A',
        },
        '&:disabled': {
          backgroundColor: '#B8D0C0',
          color: '#EFF5F1',
        }
      }
    }}
    {...props}
  >
    {children}
  </Button>
);

const StructureViewer = ({ data, onBack }) => {
  const viewerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!data || !data.pdb_structure) return;

    // Initialize 3Dmol viewer when component mounts
    if (containerRef.current) {
      // Clear any previous viewer
      if (viewerRef.current) {
        try {
          $(containerRef.current).empty();
        } catch (e) {
          console.error("Error clearing container:", e);
        }
      }

      // Create the viewer
      try {
        viewerRef.current = $3Dmol.createViewer(
          $(containerRef.current),
          {
            defaultcolors: $3Dmol.rasmolElementColors,
            backgroundColor: 'white',
          }
        );

        // Add the PDB data
        viewerRef.current.addModel(data.pdb_structure, "pdb");
        
        // Style the protein
        viewerRef.current.setStyle({}, { cartoon: { color: 'spectrum' } });
        
        // Add surface representation
        viewerRef.current.addSurface($3Dmol.SurfaceType.VDW, {
          opacity: 0.7,
          color: 'white'
        });
        
        // Zoom to fit the protein
        viewerRef.current.zoomTo();
        
        // Render the scene
        viewerRef.current.render();
      } catch (e) {
        console.error("Error initializing 3Dmol viewer:", e);
      }
    }

    // Cleanup function
    return () => {
      if (viewerRef.current) {
        try {
          viewerRef.current = null;
        } catch (e) {
          console.error("Error cleaning up viewer:", e);
        }
      }
    };
  }, [data]);

  // Download PDB file
  const handleDownload = () => {
    if (!data || !data.pdb_structure) return;

    const blob = new Blob([data.pdb_structure], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'predicted_structure.pdb';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (!data) {
    return (
      <StyledPaper>
        <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <Loader color="#6E9F7F" size="lg" />
        </Box>
      </StyledPaper>
    );
  }

  return (
    <StyledPaper>
      <StyledTitle>Predicted Protein Structure</StyledTitle>
      
      <Text mb="md" size="sm" color="#555">
        Interactive 3D model of your protein sequence. You can rotate, zoom, and explore the structure.
      </Text>
      
      {/* Container for the 3D viewer */}
      <div 
        ref={containerRef} 
        style={{ 
          width: '100%', 
          height: '500px', 
          position: 'relative',
          marginBottom: '1rem',
          border: '1px solid #DCE8E0',
          borderRadius: '0.375rem'
        }}
      ></div>
      
      {/* Viewer controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
        <Button 
          variant="outline" 
          onClick={onBack} 
          color="gray"
          styles={{
            root: {
              border: '1px solid #DCE8E0',
              color: '#33523E',
              '&:hover': {
                backgroundColor: '#EFF5F1',
                borderColor: '#6E9F7F'
              }
            }
          }}
        >
          BACK
        </Button>
        
        <StyledButton onClick={handleDownload}>
          DOWNLOAD PDB
        </StyledButton>
      </div>
    </StyledPaper>
  );
};

export default StructureViewer; 