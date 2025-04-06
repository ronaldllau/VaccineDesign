import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { 
  Paper, 
  Title,
  Stack, 
  Textarea, 
  Grid, 
  Radio, 
  Group, 
  Button, 
  Text, 
  Alert,
  Box,
  Divider,
  Checkbox,
  Select
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
        backgroundColor: '#5E9F7F',
        border: 'none',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.3s ease, background-color 0.3s ease, box-shadow 0.3s ease',
        '&:hover': {
          backgroundColor: '#4A8264',
          transform: 'scale(1.05) translateY(-2px)',
          boxShadow: '0 6px 12px rgba(0, 0, 0, 0.15)',
        },
        '&:active': {
          transform: 'scale(0.98)',
          boxShadow: '0 2px 3px rgba(0, 0, 0, 0.1)',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 70%)',
          transform: 'scale(0)',
          opacity: 0,
          transition: 'transform 0.4s, opacity 0.3s',
        },
        '&:hover::after': {
          opacity: 1,
          transform: 'scale(1)',
        }
      },
      loading: {
        color: '#FFFFFF',
      },
    }}
    {...props}
  >
    {children}
  </Button>
);

const PredictorForm = ({ onPredictionComplete, isLoading, setIsLoading }) => {
  const [lengthWarning, setLengthWarning] = useState('')
  const [useFixedWindowSize, setUseFixedWindowSize] = useState(false)
  const [windowSize, setWindowSize] = useState(9) // Default for Class I
  const [windowSizeOptions, setWindowSizeOptions] = useState([])
  
  const { setValue, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      sequence: '',
      mode: 'single',
      hlaClass: 'I',
      useFixedWindowSize: false,
      windowSize: '9'
    }
  })

  const sequence = watch('sequence')
  const mode = watch('mode')
  const hlaClass = watch('hlaClass')

  // Update window size options when HLA class changes
  useEffect(() => {
    // Set window size options based on HLA class
    if (hlaClass === 'I') {
      setWindowSizeOptions([
        { value: '8', label: '8 amino acids' },
        { value: '9', label: '9 amino acids' },
        { value: '10', label: '10 amino acids' },
        { value: '11', label: '11 amino acids' },
        { value: '12', label: '12 amino acids' },
        { value: '13', label: '13 amino acids' },
        { value: '14', label: '14 amino acids' }
      ]);
      setWindowSize(9)
      setValue('windowSize', '9')
    } else {
      setWindowSizeOptions([
        { value: '13', label: '13 amino acids' },
        { value: '14', label: '14 amino acids' },
        { value: '15', label: '15 amino acids' },
        { value: '16', label: '16 amino acids' },
        { value: '17', label: '17 amino acids' },
        { value: '18', label: '18 amino acids' },
        { value: '19', label: '19 amino acids' },
        { value: '20', label: '20 amino acids' },
        { value: '21', label: '21 amino acids' }
      ]);
      setWindowSize(15)
      setValue('windowSize', '15')
    }
  }, [hlaClass, setValue])
  
  // Input validation
  useEffect(() => {
    checkPeptideLength()
  }, [sequence, mode, hlaClass])

  // Filter input to only valid amino acids
  const handleSequenceChange = (e) => {
    const value = e.target.value.toUpperCase()
    const validAminoAcids = 'ACDEFGHIKLMNPQRSTVWY'
    
    // Filter out invalid characters
    const filteredValue = value
      .split('')
      .filter(char => validAminoAcids.includes(char))
      .join('')
      
    // Set the filtered value in react-hook-form
    setValue('sequence', filteredValue)
  }

  // Function to check peptide length and show warnings
  const checkPeptideLength = () => {
    const peptideSeq = sequence?.trim().toUpperCase() || ''
    if (!peptideSeq) {
      setLengthWarning('')
      return
    }
    
    const peptideLength = peptideSeq.length
    const isSingleMode = mode === 'single'
    const isClassI = hlaClass === 'I'
    
    if (isSingleMode) {
      // Universal minimum length check
      if (peptideLength < 8) {
        setLengthWarning('This peptide is too short. Minimum required length is 8 amino acids for any HLA class.')
        return
      }
      
      // Universal maximum length check for single peptide mode
      if (peptideLength > 21) {
        setLengthWarning('This peptide is too long for single analysis. Maximum length is 21 amino acids. Use Sliding Window Analysis for longer sequences.')
        return
      }
      
      // Class-specific optimal length checks
      if (isClassI && peptideLength > 14) {
        setLengthWarning('This peptide length exceeds optimal range for HLA Class I (8-14 aa). Consider switching to HLA Class II.')
      } else if (!isClassI && peptideLength < 13) {
        setLengthWarning('This peptide length is below optimal range for HLA Class II (13-21 aa). Consider switching to HLA Class I.')
      } else {
        setLengthWarning('')
      }
    } else {
      // For sliding window, only show warning if sequence is too short for both classes
      if (peptideLength < 8) {
        setLengthWarning('This sequence is too short to generate any valid peptides. Minimum required length is 8 amino acids.')
      } else if (peptideLength > 1000) {
        setLengthWarning('This sequence is too long for sliding window analysis. Maximum allowed length is 1000 amino acids. Please use a shorter sequence or select a specific region of interest.')
      } else {
        setLengthWarning('')
      }
    }
  }

  const handleModeChange = (value) => {
    setValue('mode', value);
    // Re-check length warnings when mode changes
    setTimeout(() => checkPeptideLength(), 50);
  }

  const handleClassChange = (value) => {
    setValue('hlaClass', value);
  }

  const handleUseFixedWindowSizeChange = (event) => {
    const checked = event.currentTarget.checked;
    setUseFixedWindowSize(checked);
    setValue('useFixedWindowSize', checked);
  }

  const handleWindowSizeChange = (value) => {
    setWindowSize(value);
    setValue('windowSize', value);
  }

  const submitForm = (data) => {
    const peptideSeq = data.sequence?.trim().toUpperCase() || ''
    
    if (!peptideSeq) {
      notifications.show({
        title: 'Input required',
        message: 'Please enter an amino acid sequence',
        color: 'red'
      });
      return
    }
    
    if (lengthWarning) {
      notifications.show({
        title: 'Validation Warning',
        message: lengthWarning,
        color: 'orange'
      });
      // Don't submit if we have certain critical warnings
      if (lengthWarning.includes('too short') || 
          lengthWarning.includes('too long') || 
          (data.mode === 'sliding' && peptideSeq.length > 1000)) {
        return;
      }
    }
    
    // Validate peptide length for single peptide mode
    if (data.mode === 'single') {
      const peptideLength = peptideSeq.length
      
      if (peptideLength < 8 || peptideLength > 21) {
        return
      }
    }
    
    setIsLoading(true);
    
    // Configure request based on mode
    const requestData = {
      sequence: peptideSeq,
      mode: data.mode,
      hla_class: data.hlaClass
    };
    
    // Add window size parameters if in sliding window mode and fixed size is enabled
    if (data.mode === 'sliding' && data.useFixedWindowSize) {
      requestData.useFixedWindowSize = true;
      requestData.windowSize = parseInt(data.windowSize);
    }
    
    // Submit the request
    axios.post('/predict', requestData)
      .then(response => {
        console.log('Prediction results:', response.data);
        onPredictionComplete(response.data);
      })
      .catch(error => {
        console.error('Prediction error:', error);
        let errorMessage = 'An error occurred during prediction.';
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

  // For loading sample sequences
  const loadSample = () => {
    const sampleSequences = {
      'I': {
        single: 'AALGLWLSV',
        sliding: 'MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLSHGSAQVKGHGKKVADALTNAVAHVDDMPNALSALSDLHAHKLRVDPVNFKLLSHCLLVTLAAHLPAEFTPAVHASLDKFLASVSTVLTSKYR'
      },
      'II': {
        single: 'SGELKFEKRTSSAQ',
        sliding: 'MSKLKDTQLIQKAKQILGADASAEISAKLKEAIDSQTVSINTKLSTLKTELDNVAGKIADLEKSFDSLLNLIQSIDTQTQNITDLKIQIEKLRVGVEKRIGELEEELKSTSRRYADLQSQLNSADNLISSLNNLETKYGEF'
      }
    };
    
    setValue('sequence', sampleSequences[hlaClass][mode]);
  }

  return (
    <StyledPaper>
      <StyledTitle>PEPTIDE ANALYSIS</StyledTitle>
      
      <Alert 
        color="green" 
        style={{ 
          marginBottom: '1.5rem',
          backgroundColor: '#EFF5F1',
          color: '#33523E',
          border: '1px solid #C6D8CC'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Text weight={500} style={{ textTransform: 'uppercase', letterSpacing: '0.03em' }}>INSTRUCTIONS</Text>
          <Text weight={400} size="sm">Enter a peptide sequence to predict its potential as an HLA epitope.</Text>
          <Divider my="xs" style={{ borderColor: '#DCE8E0' }} />
          <Text weight={500} style={{ textTransform: 'uppercase', letterSpacing: '0.03em' }}>RECOMMENDED LENGTH RANGES</Text>
          <Box ml="md">
            <ul style={{ marginTop: '0.25rem', fontSize: '0.9rem' }}>
              <li>HLA Class I epitopes: typically 8-14 amino acids</li>
              <li>HLA Class II epitopes: typically 13-21 amino acids</li>
              <li>For longer sequences: Enter any sequence length and use the "Sliding Window Analysis" option</li>
            </ul>
          </Box>
          <Text size="xs" style={{ color: '#7F8A99', marginTop: '0.5rem' }}>Valid amino acids: A, C, D, E, F, G, H, I, K, L, M, N, P, Q, R, S, T, V, W, Y</Text>
        </div>
      </Alert>

      <form onSubmit={handleSubmit(submitForm)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Textarea
            label={<Text weight={500} style={{ textTransform: 'uppercase', letterSpacing: '0.03em', color: '#33523E' }}>PEPTIDE SEQUENCE</Text>}
            placeholder="e.g., GILGFVFTL or longer sequence"
            rows={3}
            required
            value={sequence || ''}
            onChange={handleSequenceChange}
            description="Enter a peptide sequence using standard amino acid letters."
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

          <Grid>
            <Grid.Col xs={12} md={6}>
              <Radio.Group
                name="mode"
                label={<Text weight={500} style={{ textTransform: 'uppercase', letterSpacing: '0.03em', color: '#33523E' }}>ANALYSIS MODE</Text>}
                value={mode}
                onChange={handleModeChange}
                defaultValue="single"
                styles={{
                  label: {
                    marginBottom: '0.5rem'
                  }
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', backgroundColor: 'white', padding: '1rem', border: '1px solid #DCE8E0' }}>
                  <Radio 
                    value="single" 
                    label="Single Peptide Analysis" 
                    styles={{
                      radio: {
                        backgroundColor: 'white',
                        borderColor: '#C6D8CC',
                        '&:checked': {
                          backgroundColor: '#6E9F7F',
                          borderColor: '#6E9F7F'
                        }
                      }
                    }}
                  />
                  <Text size="sm" color="dimmed" style={{ marginLeft: '1.5rem', color: '#7F8A99', fontSize: '0.8rem' }}>Use for individual peptides</Text>
                  
                  <Divider my="xs" style={{ borderColor: '#DCE8E0' }} />
                  
                  <Radio 
                    value="sliding" 
                    label="Sliding Window Analysis" 
                    styles={{
                      radio: {
                        backgroundColor: 'white',
                        borderColor: '#C6D8CC',
                        '&:checked': {
                          backgroundColor: '#6E9F7F',
                          borderColor: '#6E9F7F'
                        }
                      }
                    }}
                  />
                  <Text size="sm" color="dimmed" style={{ marginLeft: '1.5rem', color: '#7F8A99', fontSize: '0.8rem' }}>Identify all potential epitopes in a longer sequence</Text>
                </div>
              </Radio.Group>
            </Grid.Col>

            <Grid.Col xs={12} md={6}>
              <Radio.Group
                name="hlaClass"
                label={<Text weight={500} style={{ textTransform: 'uppercase', letterSpacing: '0.03em', color: '#33523E' }}>HLA CLASS</Text>}
                value={hlaClass}
                onChange={handleClassChange}
                defaultValue="I"
                styles={{
                  label: {
                    marginBottom: '0.5rem'
                  }
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', backgroundColor: 'white', padding: '1rem', border: '1px solid #DCE8E0' }}>
                  <Radio 
                    value="I" 
                    label="HLA Class I" 
                    styles={{
                      radio: {
                        backgroundColor: 'white',
                        borderColor: '#C6D8CC',
                        '&:checked': {
                          backgroundColor: '#6E9F7F',
                          borderColor: '#6E9F7F'
                        }
                      }
                    }}
                  />
                  <Text size="sm" color="dimmed" style={{ marginLeft: '1.5rem', color: '#7F8A99', fontSize: '0.8rem' }}>For peptides typically 8-14aa, presented to CD8+ T cells</Text>
                  
                  <Divider my="xs" style={{ borderColor: '#DCE8E0' }} />
                  
                  <Radio 
                    value="II" 
                    label="HLA Class II" 
                    styles={{
                      radio: {
                        backgroundColor: 'white',
                        borderColor: '#C6D8CC',
                        '&:checked': {
                          backgroundColor: '#6E9F7F',
                          borderColor: '#6E9F7F'
                        }
                      }
                    }}
                  />
                  <Text size="sm" color="dimmed" style={{ marginLeft: '1.5rem', color: '#7F8A99', fontSize: '0.8rem' }}>For peptides typically 13-21aa, presented to CD4+ T cells</Text>
                </div>
              </Radio.Group>
            </Grid.Col>
          </Grid>

          {/* Window Size Options - Only show when Sliding Window is selected */}
          {mode === 'sliding' && (
            <div style={{ backgroundColor: 'white', padding: '1rem', border: '1px solid #DCE8E0', borderRadius: '0.375rem' }}>
              <Text weight={500} style={{ textTransform: 'uppercase', letterSpacing: '0.03em', color: '#33523E', marginBottom: '0.75rem' }}>
                ADVANCED OPTIONS
              </Text>
              
              <Checkbox
                label="Use fixed peptide length"
                checked={useFixedWindowSize}
                onChange={handleUseFixedWindowSizeChange}
                styles={{
                  input: {
                    backgroundColor: 'white',
                    borderColor: '#C6D8CC',
                    '&:checked': {
                      backgroundColor: '#6E9F7F',
                      borderColor: '#6E9F7F'
                    }
                  }
                }}
              />
              
              {useFixedWindowSize && (
                <div style={{ marginTop: '0.75rem', marginLeft: '1.75rem' }}>
                  <Text size="sm" style={{ marginBottom: '0.5rem', color: '#33523E' }}>Select peptide length:</Text>
                  <Select
                    data={windowSizeOptions}
                    value={windowSize.toString()}
                    onChange={handleWindowSizeChange}
                    style={{ maxWidth: '200px' }}
                    styles={{
                      input: {
                        backgroundColor: 'white',
                        border: '1px solid #DCE8E0',
                        '&:focus': {
                          borderColor: '#6E9F7F',
                        }
                      }
                    }}
                  />
                  <Text size="xs" style={{ marginTop: '0.5rem', color: '#7F8A99' }}>
                    This will reduce the number of predictions by only analyzing peptides of the selected length.
                  </Text>
                </div>
              )}
            </div>
          )}
          
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
                  <Text weight={500} style={{ textTransform: 'uppercase', letterSpacing: '0.03em' }}>LENGTH WARNING</Text> 
                  <Text size="sm">{lengthWarning}</Text>
                </div>
              </div>
            </Alert>
          )}
          
          <Group position="apart">
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
            >
              PREDICT
            </StyledButton>
          </Group>
        </div>
      </form>
    </StyledPaper>
  )
}

export default PredictorForm 