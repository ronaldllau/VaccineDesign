import { useState, useEffect, useRef } from 'react';
import { Modal, Button, Loader } from '@mantine/core';
import axios from 'axios';
import * as $3Dmol from '3dmol';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons';

const StructureModal = ({ opened, onClose, sequence, title }) => {
  const viewerRef = useRef(null);
  const containerRef = useRef(null);
  const [pdbStructure, setPdbStructure] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!opened || !sequence) return;
    
    loadStructure(sequence);
    
    return () => {
      if (viewerRef.current) {
        try {
          if (containerRef.current) {
            $(containerRef.current).empty();
          }
          viewerRef.current = null;
        } catch (e) {
          console.error("Error cleaning up viewer:", e);
        }
      }
    };
  }, [opened, sequence]);

  const loadStructure = async (seq) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/predict-structure', { sequence: seq });
      setPdbStructure(response.data.pdb_structure);
      
      // Add a timeout to ensure the modal is fully rendered
      setTimeout(() => {
        initViewer(response.data.pdb_structure);
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error("Error loading structure:", error);
      setError("Failed to load protein structure");
      setLoading(false);
    }
  };

  const initViewer = (structure) => {
    if (!containerRef.current || !structure) return;
    
    // Make sure the container has dimensions
    const containerElement = $(containerRef.current);
    if (containerElement.width() === 0 || containerElement.height() === 0) {
      console.error("Container has zero dimensions, cannot initialize viewer");
      setError("Error initializing 3D viewer: container has zero size");
      return;
    }
    
    if (viewerRef.current) {
      try {
        containerElement.empty();
      } catch (e) {
        console.error("Error clearing container:", e);
      }
    }
    
    try {
      viewerRef.current = $3Dmol.createViewer(
        containerElement,
        {
          defaultcolors: $3Dmol.rasmolElementColors,
          backgroundColor: 'white',
        }
      );
      
      viewerRef.current.addModel(structure, "pdb");
      viewerRef.current.setStyle({}, { cartoon: { color: 'spectrum' } });
      viewerRef.current.addSurface($3Dmol.SurfaceType.VDW, {
        opacity: 0.6,
        color: 'white'
      });
      viewerRef.current.zoomTo();
      viewerRef.current.render();
    } catch (e) {
      console.error("Error initializing 3Dmol viewer:", e);
      setError("Error initializing 3D viewer");
    }
  };

  const handleDownload = () => {
    if (!pdbStructure) return;

    const blob = new Blob([pdbStructure], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'peptide_structure.pdb';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title || "Protein Structure"}
      size="lg"
      styles={{
        title: {
          fontWeight: 500,
          color: '#33523E',
        },
        body: {
          padding: '0',
        }
      }}
    >
      <div style={{ position: 'relative' }}>
        <div 
          ref={containerRef} 
          style={{ 
            width: '100%', 
            height: '400px',
            borderRadius: '0.375rem'
          }}
        ></div>
        
        {loading && (
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            borderRadius: '0.375rem'
          }}>
            <div style={{ textAlign: 'center' }}>
              <Loader color="#6E9F7F" size="md" />
              <div style={{ marginTop: '1rem', color: '#33523E' }}>
                Predicting structure...
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            borderRadius: '0.375rem'
          }}>
            <div style={{ textAlign: 'center', color: '#d63031', maxWidth: '80%' }}>
              <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Error</div>
              <div>{error}</div>
            </div>
          </div>
        )}
      </div>
      
      <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.8rem', color: '#555' }}>
          Sequence: <span style={{ fontFamily: 'monospace' }}>{sequence}</span>
        </div>
        
        {pdbStructure && (
          <Button
            size="xs"
            variant="subtle"
            leftIcon={<FontAwesomeIcon icon={faDownload} />}
            onClick={handleDownload}
            styles={{
              root: {
                color: '#6E9F7F',
                '&:hover': {
                  backgroundColor: 'rgba(94, 159, 127, 0.1)',
                }
              }
            }}
          >
            Download PDB
          </Button>
        )}
      </div>
    </Modal>
  );
};

export default StructureModal; 