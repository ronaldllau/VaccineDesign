import { useState } from 'react'
import { Container, Navbar } from 'react-bootstrap'
import PredictorForm from './components/PredictorForm'
import SingleResults from './components/SingleResults'
import SlidingResults from './components/SlidingResults'
import Footer from './components/Footer'
import AboutSection from './components/AboutSection'

function App() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [singleResults, setSingleResults] = useState(null)
  const [slidingResults, setSlidingResults] = useState(null)

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
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar bg="primary" variant="dark" expand="lg">
        <Container>
          <Navbar.Brand href="#">TransHLA Epitope Predictor</Navbar.Brand>
        </Container>
      </Navbar>

      <Container className="mt-4">
        <PredictorForm 
          onSubmit={handleSubmit} 
          loading={loading} 
        />

        {error && (
          <div className="alert alert-danger mt-3">{error}</div>
        )}

        {singleResults && (
          <SingleResults results={singleResults} />
        )}

        {slidingResults && (
          <SlidingResults results={slidingResults} />
        )}

        <AboutSection />
      </Container>

      <Footer />
    </>
  )
}

export default App
