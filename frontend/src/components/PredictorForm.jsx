import { useState, useEffect } from 'react'
import { Card, Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap'

const PredictorForm = ({ onSubmit, loading }) => {
  const [sequence, setSequence] = useState('')
  const [mode, setMode] = useState('single')
  const [hlaClass, setHlaClass] = useState('I')
  const [lengthWarning, setLengthWarning] = useState('')

  // Input validation
  useEffect(() => {
    checkPeptideLength()
  }, [sequence, mode, hlaClass])

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault()
    
    const peptideSeq = sequence.trim().toUpperCase()
    
    if (!peptideSeq) {
      return
    }
    
    // Validate peptide length for single peptide mode
    if (mode === 'single') {
      const peptideLength = peptideSeq.length
      
      if (peptideLength < 8) {
        return
      }
      
      if (peptideLength > 21) {
        return
      }
    }
    
    onSubmit({
      sequence: peptideSeq,
      mode,
      hlaClass
    })
  }

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
  }

  // Function to check peptide length and show warnings
  const checkPeptideLength = () => {
    const peptideSeq = sequence.trim().toUpperCase()
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
      } else {
        setLengthWarning('')
      }
    }
  }

  return (
    <Card className="shadow-sm mb-4">
      <Card.Header className="bg-light">
        <h4>Peptide HLA Epitope Prediction</h4>
      </Card.Header>
      <Card.Body>
        <Alert variant="info">
          <p><strong>Instructions:</strong> Enter a peptide sequence to predict its potential as an HLA epitope.</p>
          <p><strong>Recommended length ranges:</strong></p>
          <ul>
            <li>HLA Class I epitopes: typically 8-14 amino acids</li>
            <li>HLA Class II epitopes: typically 13-21 amino acids</li>
            <li>For longer sequences: Enter any sequence length and use the "Sliding Window Analysis" option to identify all potential epitopes</li>
          </ul>
          <p className="mb-0"><small>Valid amino acids: A, C, D, E, F, G, H, I, K, L, M, N, P, Q, R, S, T, V, W, Y</small></p>
        </Alert>

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Peptide Sequence</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={sequence}
              onChange={handleSequenceChange}
              placeholder="e.g., GILGFVFTL or longer sequence"
              required
            />
            <Form.Text className="text-muted">
              Enter a peptide sequence using standard amino acid letters.
            </Form.Text>
          </Form.Group>

          <Row className="mb-3">
            <Col md={6}>
              <Form.Label>Analysis Mode</Form.Label>
              <Form.Check
                type="radio"
                id="mode-single"
                name="analysis-mode"
                label="Single Peptide Analysis"
                checked={mode === 'single'}
                onChange={() => setMode('single')}
              />
              <small className="text-muted d-block">Use for individual peptides</small>
              
              <Form.Check
                className="mt-2"
                type="radio"
                id="mode-sliding"
                name="analysis-mode"
                label="Sliding Window Analysis"
                checked={mode === 'sliding'}
                onChange={() => setMode('sliding')}
              />
              <small className="text-muted d-block">Identify all potential epitopes in a longer sequence</small>
            </Col>

            <Col md={6}>
              <Form.Label>HLA Class</Form.Label>
              <Form.Check
                type="radio"
                id="hla-class-i"
                name="hla-class"
                label="HLA Class I"
                checked={hlaClass === 'I'}
                onChange={() => setHlaClass('I')}
              />
              <small className="text-muted d-block">For peptides typically 8-14aa, presented to CD8+ T cells</small>
              
              <Form.Check
                className="mt-2"
                type="radio"
                id="hla-class-ii"
                name="hla-class"
                label="HLA Class II"
                checked={hlaClass === 'II'}
                onChange={() => setHlaClass('II')}
              />
              <small className="text-muted d-block">For peptides typically 13-21aa, presented to CD4+ T cells</small>
            </Col>
          </Row>

          {lengthWarning && (
            <Alert variant="warning">
              <i className="fas fa-exclamation-triangle"></i> <strong>Length Warning:</strong> {lengthWarning}
            </Alert>
          )}

          <Button 
            type="submit" 
            variant="primary"
            disabled={loading}
          >
            Predict
            {loading && <Spinner animation="border" size="sm" className="ms-2" />}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  )
}

export default PredictorForm 