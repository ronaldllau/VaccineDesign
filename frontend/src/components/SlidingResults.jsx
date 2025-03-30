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
    
    // Create density chart with themed colors
    densityChartInstance.current = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Epitopes', 'Non-Epitopes'],
        datasets: [{
          data: [results.epitope_count, results.total_peptides - results.epitope_count],
          backgroundColor: [
            'rgba(94, 159, 127, 0.7)', // Green primary with opacity
            'rgba(233, 235, 238, 0.7)'  // Gray light with opacity
          ],
          borderColor: [
            'rgba(94, 159, 127, 1)', // Green primary
            'rgba(185, 194, 204, 1)'  // Gray mid
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: {
                family: 'Helvetica, Inter, system-ui, sans-serif',
                size: 11
              },
              color: '#3A424E', // Gray dark
              boxWidth: 12,
              padding: 10
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || ''
                const count = context.raw
                const percent = ((count / results.total_peptides) * 100).toFixed(1)
                return `${label}: ${count} (${percent}%)`
              }
            },
            titleFont: {
              family: 'Helvetica, Inter, system-ui, sans-serif',
              size: 13
            },
            bodyFont: {
              family: 'Helvetica, Inter, system-ui, sans-serif',
              size: 12
            },
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            titleColor: '#33523E', // Green dark
            bodyColor: '#3A424E',   // Gray dark
            borderColor: '#DCE8E0',  // Green light
            borderWidth: 1
          },
          title: {
            display: true,
            text: `HLA Class ${results.hla_class} Epitope Density`,
            font: {
              family: 'Helvetica, Inter, system-ui, sans-serif',
              size: 13,
              weight: 500
            },
            color: '#33523E', // Green dark
            padding: 10
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
    
    // Create distribution chart with themed colors
    distributionChartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: positionData.map(p => p.position),
        datasets: [{
          label: 'Average Epitope Probability',
          data: positionData.map(p => p.probability),
          backgroundColor: 'rgba(94, 159, 127, 0.2)', // Green primary with opacity
          borderColor: 'rgba(94, 159, 127, 1)', // Green primary
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgba(94, 159, 127, 1)', // Green primary
          pointBorderColor: '#fff',
          pointRadius: 2,
          pointHoverRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: {
                family: 'Helvetica, Inter, system-ui, sans-serif',
                size: 11
              },
              color: '#3A424E', // Gray dark
              boxWidth: 12,
              padding: 10
            }
          },
          tooltip: {
            callbacks: {
              title: function(context) {
                return `Position: ${context[0].label}`
              },
              label: function(context) {
                return `Probability: ${context.raw.toFixed(3)}`
              }
            },
            titleFont: {
              family: 'Helvetica, Inter, system-ui, sans-serif',
              size: 13
            },
            bodyFont: {
              family: 'Helvetica, Inter, system-ui, sans-serif',
              size: 12
            },
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            titleColor: '#33523E', // Green dark
            bodyColor: '#3A424E',   // Gray dark
            borderColor: '#DCE8E0',  // Green light
            borderWidth: 1
          },
          title: {
            display: true,
            text: `HLA Class ${results.hla_class} Epitope Probability Distribution`,
            font: {
              family: 'Helvetica, Inter, system-ui, sans-serif',
              size: 13,
              weight: 500
            },
            color: '#33523E', // Green dark
            padding: 10
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 1,
            title: {
              display: true,
              text: 'Probability',
              font: {
                family: 'Helvetica, Inter, system-ui, sans-serif',
                size: 11,
                weight: 500
              },
              color: '#3A424E' // Gray dark
            },
            ticks: {
              font: {
                family: 'Helvetica, Inter, system-ui, sans-serif',
                size: 10
              },
              color: '#7F8A99' // Gray text
            },
            grid: {
              color: 'rgba(185, 194, 204, 0.2)' // Gray mid with opacity
            }
          },
          x: {
            title: {
              display: true,
              text: 'Position',
              font: {
                family: 'Helvetica, Inter, system-ui, sans-serif',
                size: 11,
                weight: 500
              },
              color: '#3A424E' // Gray dark
            },
            ticks: {
              font: {
                family: 'Helvetica, Inter, system-ui, sans-serif',
                size: 10
              },
              color: '#7F8A99', // Gray text
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 8
            },
            grid: {
              color: 'rgba(185, 194, 204, 0.2)' // Gray mid with opacity
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
    <div className="results-section">
      <div style={{ 
        marginBottom: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        <Alert variant="info" 
          className="mb-0" 
          style={{ 
            borderLeft: '4px solid #5E9F7F',
            backgroundColor: '#EFF5F1',
            color: '#33523E',
            border: '1px solid #C6D8CC',
            padding: '1rem',
            borderRadius: '0.375rem',
          }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>ANALYSIS SUMMARY</div>
            <div>
              Found {results.epitope_count} potential epitopes 
              out of {results.total_peptides} possible peptides 
              ({(results.epitope_density * 100).toFixed(1)}% epitope density) 
              for sequence <span style={{ fontWeight: 500 }}>{displaySequence}</span> 
              using HLA class {results.hla_class} prediction.
            </div>
          </div>
        </Alert>
        
        <div className="chart-container-wrapper" style={{ backgroundColor: '#F5F5F5', borderRadius: '0.375rem', padding: '1.25rem', border: '1px solid #DCE8E0', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)' }}>
          <div className="row" style={{ display: 'flex', flexWrap: 'wrap', margin: '0 -12px' }}>
            <div className="col-md-6" style={{ padding: '0 12px', marginBottom: '1rem' }}>
              <div className="chart-title" style={{ color: '#33523E', fontWeight: 500, textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                Epitope Density
              </div>
              <div className="chart-container" style={{ height: '220px', backgroundColor: 'white', borderRadius: '0.375rem', padding: '0.75rem', border: '1px solid #DCE8E0' }}>
                <canvas ref={densityChartRef}></canvas>
              </div>
            </div>
            <div className="col-md-6" style={{ padding: '0 12px' }}>
              <div className="chart-title" style={{ color: '#33523E', fontWeight: 500, textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                Epitope Distribution
              </div>
              <div className="chart-container" style={{ height: '220px', backgroundColor: 'white', borderRadius: '0.375rem', padding: '0.75rem', border: '1px solid #DCE8E0' }}>
                <canvas ref={distributionChartRef}></canvas>
              </div>
            </div>
          </div>
        </div>
        
        <div className="table-container" style={{ backgroundColor: '#F5F5F5', borderRadius: '0.375rem', padding: '1.25rem', border: '1px solid #DCE8E0', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)' }}>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap',
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '1rem'
          }}>
            <div style={{ 
              color: '#33523E', 
              fontWeight: 500, 
              textTransform: 'uppercase', 
              fontSize: '0.9rem', 
              letterSpacing: '0.05em',
              marginBottom: '0.5rem'
            }}>
              All Potential Epitopes
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              flexWrap: 'nowrap'
            }}>
              <Form.Check
                inline
                type="checkbox"
                id="show-epitopes-only"
                label="Show Epitopes Only"
                checked={showOnlyEpitopes}
                onChange={(e) => setShowOnlyEpitopes(e.target.checked)}
                style={{
                  marginRight: '1rem',
                  fontWeight: 500,
                  whiteSpace: 'nowrap'
                }}
              />
              <Form.Select 
                size="sm" 
                className="d-inline-block"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value)
                  setSortDirection('asc')
                }}
                style={{
                  width: 'auto',
                  borderColor: '#DCE8E0',
                  color: '#33523E',
                  borderRadius: '4px',
                  padding: '0.25rem 2rem 0.25rem 0.5rem',
                  backgroundColor: 'white',
                  minWidth: '160px'
                }}
              >
                <option value="position">Sort by Position</option>
                <option value="probability">Sort by Probability</option>
                <option value="length">Sort by Length</option>
                <option value="peptide">Sort by Peptide</option>
                <option value="is_epitope">Sort by Result</option>
              </Form.Select>
            </div>
          </div>
          
          <div className="table-responsive" style={{ backgroundColor: 'white', borderRadius: '0.375rem', border: '1px solid #DCE8E0' }}>
            <Table striped hover className="results-table mb-0">
              <thead>
                <tr>
                  <th className="sortable" onClick={() => handleHeaderClick('position')}
                    style={{ cursor: 'pointer' }}>
                    POSITION {getSortIcon('position')}
                  </th>
                  <th className="sortable" onClick={() => handleHeaderClick('peptide')}
                    style={{ cursor: 'pointer' }}>
                    PEPTIDE {getSortIcon('peptide')}
                  </th>
                  <th className="sortable" onClick={() => handleHeaderClick('length')}
                    style={{ cursor: 'pointer' }}>
                    LENGTH {getSortIcon('length')}
                  </th>
                  <th>HLA CLASS</th>
                  <th className="sortable" onClick={() => handleHeaderClick('probability')}
                    style={{ cursor: 'pointer' }}>
                    PROBABILITY {getSortIcon('probability')}
                  </th>
                  <th className="sortable" onClick={() => handleHeaderClick('is_epitope')}
                    style={{ cursor: 'pointer' }}>
                    RESULT {getSortIcon('is_epitope')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.length > 0 ? (
                  filteredResults.map((result, index) => (
                    <tr key={index}>
                      <td>{result.position}</td>
                      <td style={{ fontFamily: 'monospace' }}>{result.peptide}</td>
                      <td>{result.length}</td>
                      <td>{result.class}</td>
                      <td>{result.probability.toFixed(3)}</td>
                      <td className={result.is_epitope ? 'result-positive' : 'result-negative'}
                        style={{ 
                          color: result.is_epitope ? '#33523E' : '#3A424E',
                          fontWeight: 500
                        }}>
                        {result.is_epitope ? 'Potential Epitope' : 'Non-Epitope'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-4" style={{ color: '#7F8A99' }}>
                      No epitopes found with the current filter settings.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SlidingResults 