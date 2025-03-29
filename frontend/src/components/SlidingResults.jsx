import { useState, useEffect, useRef } from 'react'
import { Card, Row, Col, Table, Alert, Form } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSort, faSortUp, faSortDown } from '@fortawesome/free-solid-svg-icons'
import { Chart, PieController, LineController, LineElement, PointElement, LinearScale, CategoryScale, ArcElement, Tooltip, Legend, Title, Filler } from 'chart.js'

// Register Chart.js components
Chart.register(
  PieController, 
  LineController, 
  LineElement, 
  PointElement, 
  LinearScale, 
  CategoryScale, 
  ArcElement, 
  Tooltip, 
  Legend, 
  Title,
  Filler
)

const SlidingResults = ({ results }) => {
  const [showOnlyEpitopes, setShowOnlyEpitopes] = useState(true)
  const [sortBy, setSortBy] = useState('position')
  const [sortDirection, setSortDirection] = useState('asc')
  const [filteredResults, setFilteredResults] = useState([])
  
  const densityChartRef = useRef(null)
  const distributionChartRef = useRef(null)
  const densityChartInstance = useRef(null)
  const distributionChartInstance = useRef(null)

  // Process results when they change, or when filter/sort settings change
  useEffect(() => {
    if (!results) return
    
    // Filter results if needed
    let processed = [...results.results]
    if (showOnlyEpitopes) {
      processed = processed.filter(result => result.is_epitope)
    }
    
    // Sort results
    processed.sort((a, b) => {
      let comparison = 0
      
      if (sortBy === 'position') {
        comparison = a.position - b.position
      } else if (sortBy === 'probability') {
        comparison = b.probability - a.probability
      } else if (sortBy === 'length') {
        comparison = a.length - b.length
      } else if (sortBy === 'peptide') {
        comparison = a.peptide.localeCompare(b.peptide)
      } else if (sortBy === 'is_epitope' || sortBy === 'result') {
        // Sort by epitope status (true values first)
        comparison = b.is_epitope - a.is_epitope
      }
      
      return sortDirection === 'asc' ? comparison : -comparison
    })
    
    setFilteredResults(processed)
  }, [results, showOnlyEpitopes, sortBy, sortDirection])

  // Create visualizations when results change
  useEffect(() => {
    if (!results) return
    
    // Create density chart
    createDensityChart()
    
    // Create distribution chart
    createDistributionChart()
    
    // Cleanup function
    return () => {
      if (densityChartInstance.current) {
        densityChartInstance.current.destroy()
      }
      if (distributionChartInstance.current) {
        distributionChartInstance.current.destroy()
      }
    }
  }, [results])

  const createDensityChart = () => {
    if (!densityChartRef.current || !results) return
    
    // Destroy existing chart if it exists
    if (densityChartInstance.current) {
      densityChartInstance.current.destroy()
    }
    
    const ctx = densityChartRef.current.getContext('2d')
    
    // Create density chart - pie chart showing epitope vs non-epitope ratio
    densityChartInstance.current = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Epitopes', 'Non-Epitopes'],
        datasets: [{
          data: [results.epitope_count, results.total_peptides - results.epitope_count],
          backgroundColor: [
            'rgba(54, 162, 235, 0.7)',
            'rgba(211, 211, 211, 0.7)'
          ],
          borderColor: [
            'rgba(54, 162, 235, 1)',
            'rgba(211, 211, 211, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || ''
                const count = context.raw
                const percent = ((count / results.total_peptides) * 100).toFixed(1)
                return `${label}: ${count} (${percent}%)`
              }
            }
          },
          title: {
            display: true,
            text: `HLA Class ${results.hla_class} Epitope Density`,
            font: {
              size: 14
            }
          }
        }
      }
    })
  }

  const createDistributionChart = () => {
    if (!distributionChartRef.current || !results) return
    
    // Destroy existing chart if it exists
    if (distributionChartInstance.current) {
      distributionChartInstance.current.destroy()
    }
    
    const ctx = distributionChartRef.current.getContext('2d')
    
    // Prepare data for distribution chart - shows epitope probability by position
    const positions = Array.from(new Set(results.results.map(r => r.position))).sort((a, b) => a - b)
    
    // For each position, calculate the average probability
    const positionData = positions.map(pos => {
      const peptidesAtPosition = results.results.filter(r => r.position === pos)
      const avgProbability = peptidesAtPosition.reduce((sum, p) => sum + p.probability, 0) / peptidesAtPosition.length
      return {
        position: pos,
        probability: avgProbability
      }
    })
    
    // Create distribution chart
    distributionChartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: positionData.map(p => p.position),
        datasets: [{
          label: 'Average Epitope Probability',
          data: positionData.map(p => p.probability),
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
          },
          tooltip: {
            callbacks: {
              title: function(context) {
                return `Position: ${context[0].label}`
              },
              label: function(context) {
                return `Probability: ${context.raw.toFixed(3)}`
              }
            }
          },
          title: {
            display: true,
            text: `HLA Class ${results.hla_class} Epitope Probability Distribution`,
            font: {
              size: 14
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 1,
            title: {
              display: true,
              text: 'Probability'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Position'
            }
          }
        }
      }
    })
  }

  const handleHeaderClick = (column) => {
    // Skip HLA Class column
    if (column === 'hla class') return
    
    // Toggle sort direction if clicking the same column
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (column) => {
    if (sortBy !== column) {
      return <FontAwesomeIcon icon={faSort} className="sort-icon ms-1" />
    }
    
    return sortDirection === 'asc' 
      ? <FontAwesomeIcon icon={faSortUp} className="sort-icon ms-1" /> 
      : <FontAwesomeIcon icon={faSortDown} className="sort-icon ms-1" />
  }

  if (!results) return null
  
  // Display original sequence (truncate if too long)
  const maxDisplayLength = 50
  const displaySequence = results.original_sequence.length > maxDisplayLength 
    ? results.original_sequence.substring(0, maxDisplayLength) + '...' 
    : results.original_sequence
  
  return (
    <div className="results-section mb-4">
      <h5>Sliding Window Analysis for Sequence: <span>{displaySequence}</span></h5>
      
      <Alert variant="info">
        <strong>Analysis Summary:</strong> Found {results.epitope_count} potential epitopes 
        out of {results.total_peptides} possible peptides 
        ({(results.epitope_density * 100).toFixed(1)}% epitope density) 
        using HLA class {results.hla_class} prediction.
      </Alert>
      
      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Header>Epitope Density</Card.Header>
            <Card.Body>
              <canvas ref={densityChartRef}></canvas>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card>
            <Card.Header>Epitope Distribution</Card.Header>
            <Card.Body>
              <canvas ref={distributionChartRef}></canvas>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Card>
        <Card.Header className="bg-light d-flex justify-content-between align-items-center">
          <h5 className="mb-0">All Potential Epitopes</h5>
          <div>
            <Form.Check
              inline
              type="checkbox"
              id="show-epitopes-only"
              label="Show Epitopes Only"
              checked={showOnlyEpitopes}
              onChange={(e) => setShowOnlyEpitopes(e.target.checked)}
            />
            <Form.Select 
              size="sm" 
              className="d-inline-block w-auto"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value)
                setSortDirection('asc')
              }}
            >
              <option value="position">Sort by Position</option>
              <option value="probability">Sort by Probability</option>
              <option value="length">Sort by Length</option>
              <option value="peptide">Sort by Peptide</option>
              <option value="is_epitope">Sort by Result</option>
            </Form.Select>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="table-responsive">
            <Table striped hover className="results-table">
              <thead>
                <tr>
                  <th className="sortable" onClick={() => handleHeaderClick('position')}>
                    Position {getSortIcon('position')}
                  </th>
                  <th className="sortable" onClick={() => handleHeaderClick('peptide')}>
                    Peptide {getSortIcon('peptide')}
                  </th>
                  <th className="sortable" onClick={() => handleHeaderClick('length')}>
                    Length {getSortIcon('length')}
                  </th>
                  <th>HLA Class</th>
                  <th className="sortable" onClick={() => handleHeaderClick('probability')}>
                    Probability {getSortIcon('probability')}
                  </th>
                  <th className="sortable" onClick={() => handleHeaderClick('is_epitope')}>
                    Result {getSortIcon('is_epitope')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.length > 0 ? (
                  filteredResults.map((result, index) => (
                    <tr key={index}>
                      <td>{result.position}</td>
                      <td>{result.peptide}</td>
                      <td>{result.length}</td>
                      <td>{result.class}</td>
                      <td>{result.probability.toFixed(3)}</td>
                      <td className={result.is_epitope ? 'result-positive' : 'result-negative'}>
                        {result.is_epitope ? 'Potential Epitope' : 'Non-Epitope'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center">
                      No epitopes found with the current filter settings.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </div>
  )
}

export default SlidingResults 