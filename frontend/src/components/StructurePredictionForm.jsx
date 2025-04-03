import { useState } from 'react'
import { 
  Paper, 
  Title,
  Stack, 
  Textarea, 
  Button, 
  Text, 
  Alert,
  Box,
  Divider,
  Loader
} from '@mantine/core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import { notifications } from '@mantine/notifications'
import axios from 'axios'

// Custom styled components
const StyledPaper = ({ children, interactive = false, ...props }) => (
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
      ...(interactive ? { cursor: 'pointer' } : {})
    }} 
    className={interactive ? 'interactive-section' : 'animate-entrance'}
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

// Extended version of our epitope sequences as an example for protein structure prediction
const EXAMPLE_SEQUENCE = "SGELKFEKRTSSAQFDEYMKELGVGIALMLRILERSKEPVSGAQLAEELSVSRQVIVQDIAYLRSLGYNAALGLWLSV";

const StructurePredictionForm = ({ onPredictionComplete }) => {
  const [sequence, setSequence] = useState('')
  const [lengthWarning, setLengthWarning] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // Filter input to only valid amino acids
  const handleSequenceChange = (e) => {
    const value = e.target.value.toUpperCase()
    const validAminoAcids = 'ACDEFGHIKLMNPQRSTVWY'
    
    // Filter out invalid characters
    const filteredValue = value
      .split('')
      .filter(char => validAminoAcids.includes(char))
      .join('')
      
    setSequence(filteredValue)
    
    // Show warning for very long sequences
    if (filteredValue.length > 500) {
      setLengthWarning('Long sequences may take several minutes to process')
    } else if (filteredValue.length < 10) {
      setLengthWarning('Sequence is very short. Predictions may be less reliable.')
    } else {
      setLengthWarning('')
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!sequence.trim()) {
      notifications.show({
        title: 'Input required',
        message: 'Please enter a protein sequence',
        color: 'red'
      });
      return
    }
    
    setIsLoading(true)
    
    // Call the backend API through the Vite proxy
    axios.post('/api/predict-structure', { sequence })
      .then(response => {
        console.log('Structure prediction results:', response.data);
        onPredictionComplete(response.data);
      })
      .catch(error => {
        console.error('Prediction error:', error);
        let errorMessage = 'An error occurred during structure prediction.';
        if (error.response && error.response.data && error.response.data.error) {
          errorMessage = error.response.data.error;
        }
        
        notifications.show({
          title: 'Prediction Failed',
          message: errorMessage,
          color: 'red'
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  // Load sample sequence
  const loadSample = () => {
    setSequence(EXAMPLE_SEQUENCE);
  }

  return (
    <StyledPaper>
      <StyledTitle>Protein Structure Prediction</StyledTitle>
      
      <Text mb="md" size="sm" color="#555">
        Predict the 3D structure of a protein using ESMFold. Enter your protein sequence below.
      </Text>
      
      <form onSubmit={handleSubmit}>
        <Stack spacing="md">
          <Textarea
            label={<Text weight={500} style={{ textTransform: 'uppercase', letterSpacing: '0.03em', color: '#33523E' }}>PROTEIN SEQUENCE</Text>}
            placeholder="e.g., MKTVRQERLKSIVRILERSKEPVSGAQLAEELSVSRQVIVQDIAYLRSLGYNIVATPRGYVLAGG"
            rows={5}
            required
            value={sequence}
            onChange={handleSequenceChange}
            description="Enter a protein sequence using standard amino acid letters (ACDEFGHIKLMNPQRSTVWY)."
            styles={{
              input: {
                backgroundColor: 'white',
                border: '1px solid #DCE8E0',
                '&:focus': {
                  borderColor: '#6E9F7F',
                }
              },
              description: {
                color: '#7F8A99',
                fontSize: '0.8rem'
              }
            }}
          />
          
          {lengthWarning && (
            <Alert 
              color="orange"
              style={{
                backgroundColor: '#FBF5F0',
                color: '#794925',
                border: '1px solid #F0D8C0'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <FontAwesomeIcon icon={faTriangleExclamation} style={{ marginRight: '0.75rem', marginTop: '0.2rem', color: '#E39A66' }} />
                <div>
                  <Text weight={500} style={{ textTransform: 'uppercase', letterSpacing: '0.03em' }}>NOTE</Text> 
                  <Text size="sm">{lengthWarning}</Text>
                </div>
              </div>
            </Alert>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button 
              variant="outline" 
              onClick={loadSample} 
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
              LOAD SAMPLE
            </Button>
          
            <StyledButton 
              type="submit"
              loading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? 'PREDICTING...' : 'PREDICT STRUCTURE'}
            </StyledButton>
          </div>
        </Stack>
      </form>
    </StyledPaper>
  )
}

export default StructurePredictionForm; 