import { useState } from 'react'
import { AppShell, Container, Group, Title, Text, Alert, Button, Paper } from '@mantine/core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFlask, faCircleInfo, faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import PredictorForm from './components/PredictorForm'
import SingleResults from './components/SingleResults'
import SlidingResults from './components/SlidingResults'
import Footer from './components/Footer'
import AboutSection from './components/AboutSection'

// Custom styled components for consistent styling
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

function App() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [singleResults, setSingleResults] = useState(null)
  const [slidingResults, setSlidingResults] = useState(null)
  const [showResults, setShowResults] = useState(false)

  // Handle form submission and API call
  const handleSubmit = async (formData) => {
    setLoading(true)
    setError(null)
    setSingleResults(null)
    setSlidingResults(null)

    try {
      const response = await fetch('/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sequence: formData.sequence,
          mode: formData.mode,
          hla_class: formData.hlaClass,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Prediction failed. Please try again.')
      }

      if (formData.mode === 'single') {
        setSingleResults(data)
      } else {
        setSlidingResults(data)
      }
      
      // Show results view after successful prediction
      setShowResults(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  // Function to go back to the form view
  const handleBackToForm = () => {
    setShowResults(false)
  }

  return (
    <AppShell
      padding="md"
      header={
        <header style={{ 
          height: 70, 
          backgroundColor: '#F5F5F5', 
          borderBottom: '2px solid #DCE8E0',
          color: '#33523E',
          display: 'flex',
          alignItems: 'center',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)'
        }}>
          <Container size="lg">
            <Group style={{ height: '100%', alignItems: 'center' }} position="left" px="md">
              <div style={{ 
                backgroundColor: 'rgba(94, 159, 127, 0.1)', 
                padding: '8px', 
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease'
              }} className="animate-glow">
                <FontAwesomeIcon icon={faFlask} size="lg" style={{ color: '#5E9F7F' }} />
              </div>
              <Title order={1} style={{ 
                fontSize: '1.5rem', 
                letterSpacing: '0.05em', 
                textTransform: 'uppercase',
                fontWeight: 500,
                color: '#33523E',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                position: 'relative',
                paddingBottom: '2px'
              }}>
                <span style={{ 
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: '-2px',
                    left: '0',
                    width: '100%',
                    height: '2px',
                    backgroundColor: '#5E9F7F',
                    transform: 'scaleX(0)',
                    transformOrigin: 'left',
                    transition: 'transform 0.3s ease'
                  },
                  '&:hover::after': {
                    transform: 'scaleX(1)'
                  }
                }}>
                  TRANSHLA EPITOPE PREDICTOR
                </span>
              </Title>
            </Group>
          </Container>
        </header>
      }
      footer={
        <footer style={{ 
          height: 60, 
          backgroundColor: '#F5F5F5', 
          borderTop: '1px solid #DCE8E0',
          color: '#7F8A99',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Container size="lg">
            <Footer />
          </Container>
        </footer>
      }
      styles={{
        main: {
          backgroundColor: '#FFFFFF',
          backgroundImage: 'linear-gradient(to bottom, rgba(240, 245, 242, 0.8) 0%, rgba(255, 255, 255, 1) 100%)',
          padding: '20px',
        },
        body: {
          minHeight: '100vh',
        }
      }}
    >
      <Container size="lg" py="xl" className="animate-entrance">
        {!showResults ? (
          /* Show the predictor form if not in results view */
          <>
            <PredictorForm 
              onSubmit={handleSubmit} 
              loading={loading} 
            />

            {error && (
              <Alert 
                color="orange" 
                title="ERROR" 
                mt="md"
                className="animate-entrance"
                styles={{
                  root: {
                    border: '1px solid #F0D8C0',
                    boxShadow: '0 2px 8px rgba(227, 137, 86, 0.1)'
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <FontAwesomeIcon icon={faCircleInfo} style={{ 
                    marginRight: '0.5rem', 
                    marginTop: '0.2rem',
                    color: '#E38956' 
                  }} />
                  <div>{error}</div>
                </div>
              </Alert>
            )}
          </>
        ) : (
          /* Show the results view */
          <div className="animate-entrance">
            <StyledPaper>
              <StyledTitle>PREDICTION RESULTS</StyledTitle>
              <Button 
                onClick={handleBackToForm}
                variant="subtle"
                leftIcon={<FontAwesomeIcon icon={faArrowLeft} />}
                style={{ 
                  color: '#5E9F7F', 
                  marginBottom: '1.5rem', 
                  fontWeight: 500,
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(94, 159, 127, 0.1)',
                  '&:hover': {
                    backgroundColor: 'rgba(94, 159, 127, 0.2)',
                  }
                }}
              >
                Back to Input Form
              </Button>

              {singleResults && <SingleResults results={singleResults} />}
              {slidingResults && <SlidingResults results={slidingResults} />}
            </StyledPaper>
          </div>
        )}

        {!showResults && <AboutSection />}
      </Container>
    </AppShell>
  )
}

export default App
