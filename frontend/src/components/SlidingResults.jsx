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
  const [topNFilter, setTopNFilter] = useState(3) // Default to top 3
  const [highlightedPositions, setHighlightedPositions] = useState([])
  const [minMaxProb, setMinMaxProb] = useState({ min: 0, max: 1 })
  const [hoveredEpitope, setHoveredEpitope] = useState(null)
  
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

    // Calculate highlighted positions and min/max probability for Top N filter
    if (topNFilter > 0 && results) {
      // Get the top N epitopes by probability
      const topEpitopes = [...results.results]
        .filter(r => r.is_epitope)
        .sort((a, b) => b.probability - a.probability)
        .slice(0, topNFilter);

      // Create an array of all positions covered by these top epitopes
      const positions = new Set();
      topEpitopes.forEach(epitope => {
        for (let i = 0; i < epitope.length; i++) {
          positions.add(epitope.position + i - 1); // -1 to convert to 0-based
        }
      });
      
      // Get min and max probability from the top N epitopes
      let min = 1;
      let max = 0;
      
      if (topEpitopes.length > 0) {
        min = Math.min(...topEpitopes.map(e => e.probability));
        max = Math.max(...topEpitopes.map(e => e.probability));
        
        // Ensure some range even with a single epitope
        if (min === max) {
          min = Math.max(0, min - 0.1);
          max = Math.min(1, max + 0.1);
        }
      }
      
      setMinMaxProb({ min, max });
      setHighlightedPositions(Array.from(positions));
    } else {
      // For "Show All" mode, find min/max across all epitopes
      const allEpitopes = results.results.filter(r => r.is_epitope);
      if (allEpitopes.length > 0) {
        const min = Math.min(...allEpitopes.map(e => e.probability));
        const max = Math.max(...allEpitopes.map(e => e.probability));
        setMinMaxProb({ min, max });
      } else {
        setMinMaxProb({ min: 0, max: 1 });
      }
      setHighlightedPositions([]);
    }
  }, [results, showOnlyEpitopes, sortBy, sortDirection, topNFilter])

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
          borderColor: 'rgba(94, 159, 127, 1)',   // Green primary
          backgroundColor: 'rgba(94, 159, 127, 0.2)', // Green with low opacity for fill
          borderWidth: 2,
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Position',
              color: '#3A424E', // Gray dark
              font: {
                family: 'Helvetica, Inter, system-ui, sans-serif',
                size: 11
              }
            },
            ticks: {
              color: '#3A424E', // Gray dark
              font: {
                family: 'Helvetica, Inter, system-ui, sans-serif',
                size: 10
              }
            },
            grid: {
              color: 'rgba(220, 232, 224, 0.6)' // Green light with opacity
            }
          },
          y: {
            min: 0,
            max: 1,
            title: {
              display: true,
              text: 'Probability',
              color: '#3A424E', // Gray dark
              font: {
                family: 'Helvetica, Inter, system-ui, sans-serif',
                size: 11
              }
            },
            ticks: {
              color: '#3A424E', // Gray dark
              font: {
                family: 'Helvetica, Inter, system-ui, sans-serif',
                size: 10
              }
            },
            grid: {
              color: 'rgba(220, 232, 224, 0.6)' // Green light with opacity
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `Probability: ${context.raw.toFixed(3)}`
              },
              title: function(context) {
                return `Position: ${context[0].label}`
              }
            },
            titleFont: {
              family: 'Helvetica, Inter, system-ui, sans-serif',
              size: 12
            },
            bodyFont: {
              family: 'Helvetica, Inter, system-ui, sans-serif',
              size: 11
            },
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            titleColor: '#33523E', // Green dark
            bodyColor: '#3A424E',   // Gray dark
            borderColor: '#DCE8E0',  // Green light
            borderWidth: 1
          },
          title: {
            display: true,
            text: 'Epitope Probability Distribution',
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

  const handleHeaderClick = (column) => {
    if (sortBy === column) {
      // Toggle direction if already sorting by this column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Set new sort column with default direction (asc)
      setSortBy(column)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (column) => {
    if (sortBy !== column) {
      return <FontAwesomeIcon icon={faSort} style={{ marginLeft: '0.5rem', opacity: 0.4 }} />
    }
    
    return sortDirection === 'asc' 
      ? <FontAwesomeIcon icon={faSortUp} style={{ marginLeft: '0.5rem', color: '#5E9F7F' }} />
      : <FontAwesomeIcon icon={faSortDown} style={{ marginLeft: '0.5rem', color: '#5E9F7F' }} />
  }

  if (!results) return <div>No results available</div>

  // Calculate total epitopes vs non-epitopes for summary
  const epitopeCount = results.epitope_count;
  const totalPeptides = results.total_peptides;
  const epitopeDensity = (epitopeCount / totalPeptides * 100).toFixed(1);

  return (
    <div className="sliding-results">
      <div className="results-summary" style={{ marginBottom: '1.5rem' }}>
        <Alert 
          variant="success" 
          style={{ 
            backgroundColor: '#EFF5F1', 
            color: '#33523E', 
            border: '1px solid #C6D8CC', 
            borderRadius: '0.375rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
            <span style={{ fontSize: '1rem' }}>Analysis Summary:</span>
            <span style={{ fontSize: '0.9rem' }}>Found {epitopeCount} potential epitopes out of {totalPeptides} possible peptides ({epitopeDensity}% epitope density)</span>
          </div>
        </Alert>
      </div>
      
      <div 
        style={{ 
          backgroundColor: '#F5F5F5', 
          borderRadius: '0.375rem', 
          padding: '1.25rem', 
          border: '1px solid #DCE8E0', 
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)', 
          marginBottom: '1.5rem' 
        }}
      >
        <div style={{ color: '#33523E', fontWeight: 500, textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.05em', marginBottom: '1rem' }}>
          SEQUENCE MAP WITH EPITOPE HIGHLIGHTING
        </div>
        
        <div style={{ backgroundColor: 'white', borderRadius: '0.375rem', padding: '1.5rem', border: '1px solid #DCE8E0' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <Form.Group style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Form.Label style={{ margin: 0, fontWeight: 500, fontSize: '0.9rem', color: '#33523E' }}>
                Top epitopes:
              </Form.Label>
              <Form.Select 
                size="sm"
                value={topNFilter}
                onChange={(e) => setTopNFilter(parseInt(e.target.value))}
                style={{
                  width: 'auto',
                  borderColor: '#DCE8E0',
                  color: '#33523E',
                  borderRadius: '4px',
                  padding: '0.25rem 0.5rem',
                  backgroundColor: 'white',
                }}
              >
                <option value="3">Top 3</option>
                <option value="5">Top 5</option>
                <option value="10">Top 10</option>
                <option value="0">Show All</option>
              </Form.Select>
            </Form.Group>
          </div>
          
          {/* The sequence with highlighting */}
          <div style={{ display: 'flex', flexWrap: 'wrap', fontFamily: 'monospace', letterSpacing: '0', lineHeight: '1.5' }}>
            {results.original_sequence.split('').map((char, index) => {
              // Find all epitopes that include this position
              const epitopesAtPosition = results.results.filter(epitope => 
                epitope.position <= index + 1 && index + 1 < epitope.position + epitope.length && epitope.is_epitope
              );
              
              // Get the highest probability epitope for this position if any exist
              const highestProbEpitope = epitopesAtPosition.length > 0 
                ? epitopesAtPosition.reduce((prev, current) => 
                    (prev.probability > current.probability) ? prev : current
                  ) 
                : null;
              
              // Determine if this position should be highlighted based on topNFilter
              const isHighlighted = topNFilter === 0 || 
                (topNFilter > 0 && highestProbEpitope && highlightedPositions.includes(index));
              
              // Check if this position is part of the currently hovered epitope
              const isPartOfHoveredEpitope = hoveredEpitope && 
                index >= hoveredEpitope.position - 1 && 
                index < hoveredEpitope.position - 1 + hoveredEpitope.length;
              
              // Color based on the probability - continuous gradient scaled to min/max
              const getColor = (probability) => {
                if (!probability || !isHighlighted) return 'transparent';
                
                // Normalize probability to the min/max range of displayed epitopes
                const { min, max } = minMaxProb;
                const normalizedProb = Math.min(1, Math.max(0, (probability - min) / (max - min)));
                
                // Brown-orange to green gradient for better visibility
                // Low: light brown/orange (hue 30-40), High: green (hue 120)
                const hue = Math.round(40 + (normalizedProb * 80)); // 40 (orange-brown) to 120 (green)
                const saturation = Math.round(80 + (normalizedProb * 15)); // 80-95%
                const lightness = Math.round(75 - (normalizedProb * 25)); // 75-50%
                
                // Stronger base opacity for all probabilities
                return `hsla(${hue}, ${saturation}%, ${lightness}%, ${0.7 + (normalizedProb * 0.3)})`;
              };
              
              return (
                <div 
                  key={index} 
                  style={{ 
                    backgroundColor: getColor(highestProbEpitope?.probability),
                    width: '1.2em',
                    height: '1.5em',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    margin: '0.05rem',
                    borderRadius: '0.2rem',
                    cursor: highestProbEpitope ? 'pointer' : 'default',
                    fontWeight: isPartOfHoveredEpitope ? 'bold' : 'normal',
                    color: isPartOfHoveredEpitope ? '#000000' : '#666666',
                    border: isPartOfHoveredEpitope ? '2px solid rgba(94, 159, 127, 0.9)' : 'none',
                    boxShadow: isPartOfHoveredEpitope ? '0 0 3px rgba(0, 0, 0, 0.2)' : 'none',
                    transform: isPartOfHoveredEpitope ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.1s ease-in-out'
                  }}
                  title={highestProbEpitope ? 
                    `Position: ${index+1}\nEpitope: ${highestProbEpitope.peptide}\nProbability: ${highestProbEpitope.probability.toFixed(3)}` : 
                    `Position: ${index+1}`
                  }
                  onMouseEnter={() => highestProbEpitope && setHoveredEpitope(highestProbEpitope)}
                  onMouseLeave={() => setHoveredEpitope(null)}
                >
                  {char}
                </div>
              );
            })}
          </div>
          
          {/* Display hovered epitope information */}
          <div style={{ 
            height: '1.5rem', 
            marginTop: '0.5rem', 
            fontSize: '0.9rem', 
            color: '#33523E', 
            fontFamily: 'monospace' 
          }}>
            {hoveredEpitope && (
              <div>
                Epitope: <strong>{hoveredEpitope.peptide}</strong> at position {hoveredEpitope.position} (Probability: {hoveredEpitope.probability.toFixed(3)})
              </div>
            )}
          </div>
          
          {/* Color gradient legend */}
          <div style={{ marginTop: '1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div>Probability: </div>
            <div style={{ display: 'flex', alignItems: 'center', height: '20px', width: '200px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #DCE8E0' }}>
              <div style={{ 
                background: 'linear-gradient(to right, hsla(40, 80%, 75%, 0.85) 0%, hsla(80, 85%, 65%, 0.9) 50%, hsla(120, 95%, 50%, 0.95) 100%)',
                height: '100%', 
                width: '100%'
              }}></div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span>{minMaxProb.min.toFixed(2)}</span>
              <span>...</span>
              <span>{minMaxProb.max.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
        
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
                  <td colSpan="6" className="text-center py-3">No matching peptides found</td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>
    </div>
  )
}

export default SlidingResults 