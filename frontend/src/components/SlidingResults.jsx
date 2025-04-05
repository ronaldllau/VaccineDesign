import { useState, useEffect, useRef } from 'react'
import { Card, Row, Col, Table, Alert, Form } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSort, faSortUp, faSortDown, faCube, faDownload } from '@fortawesome/free-solid-svg-icons'
import { Chart, PieController, LineController, LineElement, PointElement, LinearScale, CategoryScale, ArcElement, Tooltip, Legend, Title, Filler } from 'chart.js'
import { Button, Loader } from '@mantine/core'
import * as $3Dmol from '3dmol'
import axios from 'axios'
import StructureModal from './StructureModal'

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

// Try to get jQuery - first check if it's available globally
const $ = window.$ || window.jQuery || (element => ({
  empty: () => {
    if (element && element.innerHTML) {
      element.innerHTML = '';
    }
  },
  width: () => element ? element.clientWidth : 0,
  height: () => element ? element.clientHeight : 0
}));

const SlidingResults = ({ results }) => {
  const [showOnlyEpitopes, setShowOnlyEpitopes] = useState(true)
  const [sortBy, setSortBy] = useState('position')
  const [sortDirection, setSortDirection] = useState('asc')
  const [filteredResults, setFilteredResults] = useState([])
  const [topNFilter, setTopNFilter] = useState(5)
  const [highlightedPositions, setHighlightedPositions] = useState([])
  const [minMaxProb, setMinMaxProb] = useState({ min: 0, max: 1 })
  const [hoveredEpitope, setHoveredEpitope] = useState(null)
  const [hoveredResidue, setHoveredResidue] = useState(null)
  
  const [chartXAxis, setChartXAxis] = useState('position')
  const [chartYAxis, setChartYAxis] = useState('probability')
  
  const [selectedPeptide, setSelectedPeptide] = useState(null);
  const [structureModalOpen, setStructureModalOpen] = useState(false);
  
  const viewerRef = useRef(null)
  const containerRef = useRef(null)
  const [pdbStructure, setPdbStructure] = useState(null)
  const [loading3D, setLoading3D] = useState(false)
  const [error3D, setError3D] = useState(null)
  
  const densityChartRef = useRef(null)
  const distributionChartRef = useRef(null)
  const densityChartInstance = useRef(null)
  const distributionChartInstance = useRef(null)

  useEffect(() => {
    if (!results) return
    
    let processed = [...results.results]
    if (showOnlyEpitopes) {
      processed = processed.filter(result => result.is_epitope)
    }
    
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
        comparison = b.is_epitope - a.is_epitope
      }
      
      return sortDirection === 'asc' ? comparison : -comparison
    })
    
    setFilteredResults(processed)

    if (topNFilter > 0 && results) {
      const topEpitopes = [...results.results]
        .filter(r => r.is_epitope)
        .sort((a, b) => b.probability - a.probability)
        .slice(0, topNFilter);

      const positions = new Set();
      topEpitopes.forEach(epitope => {
        for (let i = 0; i < epitope.length; i++) {
          positions.add(epitope.position + i - 1);
        }
      });
      
      let min = 1;
      let max = 0;
      
      if (topEpitopes.length > 0) {
        min = Math.min(...topEpitopes.map(e => e.probability));
        max = Math.max(...topEpitopes.map(e => e.probability));
        
        if (min === max) {
          min = Math.max(0, min - 0.1);
          max = Math.min(1, max + 0.1);
        }
      }
      
      setMinMaxProb({ min, max });
      setHighlightedPositions(Array.from(positions));
    } else {
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

  useEffect(() => {
    if (!results) return
    
    createDensityChart()
    
    createDistributionChart()
    
    if (results.original_sequence) {
      loadStructure(results.original_sequence)
    }
    
    return () => {
      if (densityChartInstance.current) {
        densityChartInstance.current.destroy()
      }
      if (distributionChartInstance.current) {
        distributionChartInstance.current.destroy()
      }
      if (viewerRef.current) {
        try {
          if (containerRef.current) {
            $(containerRef.current).empty()
          }
          viewerRef.current = null
        } catch (e) {
          console.error("Error cleaning up viewer:", e)
        }
      }
    }
  }, [results, chartXAxis, chartYAxis])

  useEffect(() => {
    if (viewerRef.current && hoveredResidue !== null) {
      try {
        highlightResidue(hoveredResidue)
      } catch (e) {
        console.error("Error highlighting residue in 3D view:", e)
        // Continue with other highlighting even if 3D fails
      }
    } else if (viewerRef.current && hoveredResidue === null) {
      try {
        resetHighlighting()
      } catch (e) {
        console.error("Error resetting highlighting in 3D view:", e)
      }
    }
  }, [hoveredResidue])

  const createDensityChart = () => {
    if (!densityChartRef.current || !results) return
    
    if (densityChartInstance.current) {
      densityChartInstance.current.destroy()
    }
    
    const ctx = densityChartRef.current.getContext('2d')
    
    densityChartInstance.current = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Epitopes', 'Non-Epitopes'],
        datasets: [{
          data: [results.epitope_count, results.total_peptides - results.epitope_count],
          backgroundColor: [
            'rgba(94, 159, 127, 0.7)',
            'rgba(233, 235, 238, 0.7)'
          ],
          borderColor: [
            'rgba(94, 159, 127, 1)',
            'rgba(185, 194, 204, 1)'
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
              color: '#3A424E',
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
            titleColor: '#33523E',
            bodyColor: '#3A424E',
            borderColor: '#DCE8E0',
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
            color: '#33523E',
            padding: 10
          }
        }
      }
    })
  }

  const createDistributionChart = () => {
    if (!distributionChartRef.current || !results) return
    
    if (distributionChartInstance.current) {
      distributionChartInstance.current.destroy()
    }
    
    const ctx = distributionChartRef.current.getContext('2d')
    
    const xValues = Array.from(new Set(results.results.map(r => {
      if (chartXAxis === 'position') return r.position;
      if (chartXAxis === 'length') return r.length;
      return r.probability;
    }))).sort((a, b) => a - b);
    
    const chartData = xValues.map(xValue => {
      const matchingItems = results.results.filter(r => {
        if (chartXAxis === 'position') return r.position === xValue;
        if (chartXAxis === 'length') return r.length === xValue;
        return Math.abs(r.probability - xValue) < 0.001;
      });
      
      let yValue = 0;
      if (matchingItems.length > 0) {
        yValue = matchingItems.reduce((sum, item) => {
          if (chartYAxis === 'position') return sum + item.position;
          if (chartYAxis === 'length') return sum + item.length;
          return sum + item.probability;
        }, 0) / matchingItems.length;
      }
      
      return {
        x: xValue,
        y: yValue
      };
    });
    
    const xAxisLabel = chartXAxis.charAt(0).toUpperCase() + chartXAxis.slice(1);
    const yAxisLabel = chartYAxis.charAt(0).toUpperCase() + chartYAxis.slice(1);
    
    distributionChartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartData.map(d => d.x),
        datasets: [{
          label: `${yAxisLabel} by ${xAxisLabel}`,
          data: chartData.map(d => d.y),
          borderColor: 'rgba(94, 159, 127, 1)',
          backgroundColor: 'rgba(94, 159, 127, 0.2)',
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
              text: xAxisLabel,
              color: '#3A424E',
              font: {
                family: 'Helvetica, Inter, system-ui, sans-serif',
                size: 11
              }
            },
            ticks: {
              color: '#3A424E',
              font: {
                family: 'Helvetica, Inter, system-ui, sans-serif',
                size: 10
              }
            },
            grid: {
              color: 'rgba(220, 232, 224, 0.6)'
            }
          },
          y: {
            min: chartYAxis === 'probability' ? 0 : undefined,
            max: chartYAxis === 'probability' ? 1 : undefined,
            title: {
              display: true,
              text: yAxisLabel,
              color: '#3A424E',
              font: {
                family: 'Helvetica, Inter, system-ui, sans-serif',
                size: 11
              }
            },
            ticks: {
              color: '#3A424E',
              font: {
                family: 'Helvetica, Inter, system-ui, sans-serif',
                size: 10
              }
            },
            grid: {
              color: 'rgba(220, 232, 224, 0.6)'
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
                return `${yAxisLabel}: ${context.raw.toFixed(3)}`;
              },
              title: function(context) {
                return `${xAxisLabel}: ${context[0].label}`;
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
            titleColor: '#33523E',
            bodyColor: '#3A424E',
            borderColor: '#DCE8E0',
            borderWidth: 1
          },
          title: {
            display: true,
            text: `${yAxisLabel} Distribution by ${xAxisLabel}`,
            font: {
              family: 'Helvetica, Inter, system-ui, sans-serif',
              size: 13,
              weight: 500
            },
            color: '#33523E',
            padding: 10
          }
        }
      }
    });
  }

  const loadStructure = async (sequence) => {
    setLoading3D(true)
    setError3D(null)
    
    try {
      const response = await axios.post('/api/predict-structure', { sequence })
      setPdbStructure(response.data.pdb_structure)
      
      setTimeout(() => {
        initViewer(response.data.pdb_structure)
        setLoading3D(false)
      }, 500)
    } catch (error) {
      console.error("Error loading structure:", error)
      setError3D("Failed to load protein structure")
      setLoading3D(false)
    }
  }

  const initViewer = (structure) => {
    if (!containerRef.current || !structure) return
    
    try {
      // Use a safer way to check container size
      const containerElement = containerRef.current;
      const containerWidth = containerElement.clientWidth;
      const containerHeight = containerElement.clientHeight;
      
      if (containerWidth === 0 || containerHeight === 0) {
        console.error("Container has zero dimensions, cannot initialize viewer");
        setError3D("Error initializing 3D viewer: container has zero size");
        return;
      }
      
      if (viewerRef.current) {
        try {
          // Safely clear the container
          if (containerRef.current) {
            if (typeof $ === 'function') {
              $(containerRef.current).empty();
            } else {
              containerRef.current.innerHTML = '';
            }
          }
        } catch (e) {
          console.error("Error clearing container:", e);
        }
      }

      try {
        // Create a viewer with the DOM element directly
        viewerRef.current = $3Dmol.createViewer(
          containerElement,
          {
            defaultcolors: $3Dmol.rasmolElementColors,
            backgroundColor: 'white',
          }
        );

        viewerRef.current.addModel(structure, "pdb");
        
        // Revert back to spectrum coloring for positional context
        viewerRef.current.setStyle({}, { 
          cartoon: { color: 'spectrum' } 
        });
        
        viewerRef.current.addSurface($3Dmol.SurfaceType.VDW, {
          opacity: 0.6,
          color: 'white'  // Keep surface white for contrast
        });
        
        viewerRef.current.zoomTo();
        
        viewerRef.current.render();
      } catch (e) {
        console.error("Error initializing 3Dmol viewer:", e);
        setError3D("Error initializing 3D viewer. Try using another browser or device.");
      }
    } catch (e) {
      console.error("General error in initViewer:", e);
      setError3D("Failed to initialize 3D viewer");
    }
  }

  const highlightResidue = (resIndex) => {
    if (!viewerRef.current) return
    
    try {
      resetHighlighting()
      
      const displayIndex = resIndex + 1
      
      // Enhanced highlighting with more obvious color and thicker cartoon
      viewerRef.current.setStyle({resi: displayIndex}, {
        cartoon: { color: '#FF00FF', thickness: 1.2 },  // Bright magenta, thicker cartoon
        stick: { radius: 0.3, color: '#FF00FF' }  // Thicker sticks with same color
      })
      
      // Add a more vibrant and visible surface with higher opacity
      viewerRef.current.addSurface($3Dmol.SurfaceType.VDW, {
        opacity: 0.5,  // Higher opacity
        color: '#FF00FF',  // Bright magenta
        singleSurface: true
      }, {resi: displayIndex})
      
      // Add a larger wireframe surface for an outline effect
      viewerRef.current.addSurface($3Dmol.SurfaceType.SAS, {
        opacity: 0.8,
        color: '#333333',
        singleSurface: true,
        wireframe: true,
        linewidth: 3.0  // Thicker wireframe
      }, {resi: displayIndex})
      
      viewerRef.current.render()
    } catch (e) {
      console.error("Error highlighting residue:", e)
      // Don't let 3D errors block other UI functionality
    }
  }

  const resetHighlighting = () => {
    if (!viewerRef.current) return
    
    try {
      viewerRef.current.removeAllSurfaces()
      
      // Revert to spectrum coloring
      viewerRef.current.setStyle({}, { cartoon: { color: 'spectrum' } })
      
      viewerRef.current.addSurface($3Dmol.SurfaceType.VDW, {
        opacity: 0.6,
        color: 'white'
      })
      
      viewerRef.current.render()
    } catch (e) {
      console.error("Error resetting highlighting:", e)
      // Don't let 3D errors block other UI functionality
    }
  }

  const handleDownload = () => {
    if (!pdbStructure) return

    const blob = new Blob([pdbStructure], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = 'protein_structure.pdb'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const handleHeaderClick = (column) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
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

  const openStructureModal = (peptide) => {
    setSelectedPeptide(peptide);
    setStructureModalOpen(true);
  };

  const closeStructureModal = () => {
    setStructureModalOpen(false);
  };

  if (!results) return <div>No results available</div>

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
      
      {/* Add a help message for users about the click interaction */}
      <div style={{ marginTop: '0.5rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#666' }}>
        <em>Tip: You can click on sequence elements or table rows to select and highlight them.</em>
      </div>
      
      {/* Sequence Map Section */}
      <div style={{ backgroundColor: '#F5F5F5', borderRadius: '0.375rem', padding: '1.25rem', border: '1px solid #DCE8E0', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)', marginBottom: '1.5rem' }}>
        <div style={{ color: '#33523E', fontWeight: 500, textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.05em', marginBottom: '1rem' }}>
          SEQUENCE MAP WITH EPITOPE HIGHLIGHTING
        </div>
        
        <div style={{ backgroundColor: 'white', borderRadius: '0.375rem', padding: '1.5rem', border: '1px solid #DCE8E0' }}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex align-items-center">
              <span className="me-2">Top </span>
              <Form.Select 
                value={topNFilter}
                onChange={(e) => setTopNFilter(parseInt(e.target.value))}
                style={{ width: 'auto' }}
                size="sm"
              >
                <option value="0">All</option>
                <option value="1">1</option>
                <option value="3">3</option>
                <option value="5">5</option>
                <option value="10">10</option>
              </Form.Select>
              <span className="ms-2">epitopes</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', fontFamily: 'monospace', letterSpacing: '0', lineHeight: '1.5' }}>
            {results.original_sequence.split('').map((char, index) => {
              const epitopesAtPosition = results.results.filter(epitope => 
                epitope.position <= index + 1 && index + 1 < epitope.position + epitope.length && epitope.is_epitope
              );
              
              const highestProbEpitope = epitopesAtPosition.length > 0 
                ? epitopesAtPosition.reduce((prev, current) => 
                    (prev.probability > current.probability) ? prev : current
                  ) 
                : null;
              
              const isHighlighted = topNFilter === 0 || 
                (topNFilter > 0 && highestProbEpitope && highlightedPositions.includes(index));
              
              const isPartOfHoveredEpitope = hoveredEpitope && 
                index >= hoveredEpitope.position - 1 && 
                index < hoveredEpitope.position - 1 + hoveredEpitope.length;
              
              const getColor = (probability) => {
                if (!probability || !isHighlighted) return 'transparent';
                
                const { min, max } = minMaxProb;
                const normalizedProb = Math.min(1, Math.max(0, (probability - min) / (max - min)));
                
                const hue = Math.round(40 + (normalizedProb * 80));
                const saturation = Math.round(80 + (normalizedProb * 15));
                const lightness = Math.round(75 - (normalizedProb * 25));
                
                return `hsla(${hue}, ${saturation}%, ${lightness}%, ${0.7 + (normalizedProb * 0.3)})`;
              };
              
              return (
                <div
                  key={index}
                  style={{
                    position: 'relative',
                    display: 'inline-block',
                    width: '1.6em',
                    height: '1.6em',
                    lineHeight: '1.6em',
                    textAlign: 'center',
                    color: isHighlighted || isPartOfHoveredEpitope ? '#000' : '#666',
                    backgroundColor: isPartOfHoveredEpitope ? 
                      'rgba(94, 159, 127, 0.35)' : 
                      (highestProbEpitope && isHighlighted ? getColor(highestProbEpitope.probability) : 'transparent'),
                    fontWeight: isPartOfHoveredEpitope ? 'bold' : 'normal',
                    margin: '1px',
                    borderRadius: '2px',
                    border: isPartOfHoveredEpitope ? 
                      '1px solid rgba(94, 159, 127, 0.8)' : 
                      (highestProbEpitope && isHighlighted ? '1px solid rgba(94, 159, 127, 0.3)' : '1px solid transparent'),
                    cursor: 'pointer',
                    transition: 'all 0.15s ease-in-out'
                  }}
                  onMouseEnter={() => setHoveredResidue(index)}
                  onMouseLeave={() => setHoveredResidue(null)}
                  onClick={() => {
                    // Add click handler as a fallback for hover
                    if (highestProbEpitope) {
                      // Find the full epitope info from results
                      const fullEpitope = results.results.find(
                        e => e.position === highestProbEpitope.position && 
                             e.peptide === highestProbEpitope.peptide
                      );
                      setHoveredEpitope(fullEpitope || highestProbEpitope);
                      setHoveredResidue(index);
                    }
                  }}
                  title={highestProbEpitope ? 
                    `Position ${index+1}: ${char} 
Part of epitope with probability: ${highestProbEpitope.probability.toFixed(3)}` : 
                    `Position ${index+1}: ${char}`}
                >
                  {char}
                </div>
              );
            })}
          </div>
          
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
      
      {/* 3D Structure Visualization - Full Sequence */}
      <div className="content-wrapper" style={{ backgroundColor: '#F5F5F5', borderRadius: '0.375rem', padding: '1.25rem', border: '1px solid #DCE8E0', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ color: '#33523E', fontWeight: 500, textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.05em' }}>
            PROTEIN 3D STRUCTURE VISUALIZATION
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
        
        <div style={{ backgroundColor: 'white', borderRadius: '0.375rem', padding: '0', border: '1px solid #DCE8E0', position: 'relative' }}>
          <div 
            ref={containerRef} 
            style={{ 
              width: '100%', 
              height: '400px',
              borderRadius: '0.375rem'
            }}
          ></div>
          
          {loading3D && (
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
          
          {error3D && (
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
                <div>{error3D}</div>
              </div>
            </div>
          )}
        </div>
        
        <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#555' }}>
          <span style={{ fontWeight: 500 }}>Sequence Length:</span> {results.original_sequence.length} amino acids
        </div>
      </div>
      
      <div className="chart-container-wrapper" style={{ backgroundColor: '#F5F5F5', borderRadius: '0.375rem', padding: '1.25rem', border: '1px solid #DCE8E0', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)' }}>
        <div className="row" style={{ display: 'flex', flexWrap: 'wrap', margin: '0 -12px' }}>
          <div className="col-md-6" style={{ padding: '0 12px', marginBottom: '1rem' }}>
            <div className="chart-title" style={{ color: '#33523E', fontWeight: 500, textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              Epitope Density
            </div>
            <div className="chart-container" style={{ 
              height: '300px', 
              backgroundColor: 'white', 
              borderRadius: '0.375rem', 
              padding: '0.75rem', 
              border: '1px solid #DCE8E0' 
            }}>
              <canvas ref={densityChartRef}></canvas>
            </div>
          </div>
          <div className="col-md-6" style={{ padding: '0 12px' }}>
            <div className="chart-title" style={{ 
              color: '#33523E', 
              fontWeight: 500, 
              textTransform: 'uppercase', 
              fontSize: '0.9rem', 
              letterSpacing: '0.05em', 
              marginBottom: '0.75rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>Epitope Distribution</span>
              <div style={{ 
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.9)',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                marginLeft: 'auto'
              }}>
                <div className="d-flex align-items-center">
                  <span style={{ marginRight: '4px', color: '#555' }}>X:</span>
                  <Form.Select 
                    size="sm"
                    value={chartXAxis}
                    onChange={(e) => {
                      const newXAxis = e.target.value;
                      // If new X-axis is same as current Y-axis, swap them
                      if (newXAxis === chartYAxis) {
                        setChartYAxis(chartXAxis);
                      }
                      setChartXAxis(newXAxis);
                      setTimeout(() => createDistributionChart(), 50);
                    }}
                    style={{
                      fontSize: '0.75rem',
                      padding: '2px 20px 2px 6px',
                      height: 'auto',
                      width: 'auto'
                    }}
                  >
                    <option value="position">Position</option>
                    <option value="length">Length</option>
                    <option value="probability">Probability</option>
                  </Form.Select>
                </div>
                <div className="d-flex align-items-center">
                  <span style={{ marginRight: '4px', color: '#555' }}>Y:</span>
                  <Form.Select
                    size="sm"
                    value={chartYAxis}
                    onChange={(e) => {
                      const newYAxis = e.target.value;
                      // If new Y-axis is same as current X-axis, swap them
                      if (newYAxis === chartXAxis) {
                        setChartXAxis(chartYAxis);
                      }
                      setChartYAxis(newYAxis);
                      setTimeout(() => createDistributionChart(), 50);
                    }}
                    style={{
                      fontSize: '0.75rem',
                      padding: '2px 20px 2px 6px',
                      height: 'auto',
                      width: 'auto'
                    }}
                  >
                    <option value="position">Position</option>
                    <option value="length">Length</option>
                    <option value="probability">Probability</option>
                  </Form.Select>
                </div>
              </div>
            </div>
            <div className="chart-container" style={{ 
              height: '300px', 
              backgroundColor: 'white', 
              borderRadius: '0.375rem', 
              padding: '1.5rem 0.75rem 0.75rem 0.75rem', 
              border: '1px solid #DCE8E0',
              position: 'relative'
            }}>
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
            flexWrap: 'nowrap',
            gap: '1rem'
          }}>
            <Form.Group controlId="showOnlyEpitopes" className="mb-0 me-2">
              <Form.Check 
                type="checkbox"
                label="Show only epitopes"
                checked={showOnlyEpitopes}
                onChange={(e) => setShowOnlyEpitopes(e.target.checked)}
              />
            </Form.Group>
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
                  <tr 
                    key={index}
                    style={{
                      backgroundColor: hoveredEpitope === result ? 'rgba(94, 159, 127, 0.1)' : 'white',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={() => {
                      setHoveredEpitope(result)
                      setHoveredResidue(result.position - 1)
                    }}
                    onMouseLeave={() => {
                      setHoveredEpitope(null)
                      setHoveredResidue(null)
                    }}
                    onClick={() => {
                      // Toggle the selection on click
                      if (hoveredEpitope === result) {
                        setHoveredEpitope(null)
                        setHoveredResidue(null)
                      } else {
                        setHoveredEpitope(result)
                        setHoveredResidue(result.position - 1)
                      }
                    }}
                  >
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
      
      {selectedPeptide && (
        <StructureModal
          opened={structureModalOpen}
          onClose={closeStructureModal}
          sequence={selectedPeptide}
          title={`Peptide 3D Structure`}
        />
      )}
    </div>
  )
}

export default SlidingResults 