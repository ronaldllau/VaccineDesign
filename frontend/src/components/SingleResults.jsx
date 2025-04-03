import { useState, useEffect, useRef } from 'react'
import { Card, Row, Col, Table, Alert } from 'react-bootstrap'
import { Chart, DoughnutController, ArcElement, Tooltip, Legend, Title } from 'chart.js'
import { Button, Loader } from '@mantine/core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCube, faDownload } from '@fortawesome/free-solid-svg-icons'
import * as $3Dmol from '3dmol'
import axios from 'axios'

// Register Chart.js components
Chart.register(DoughnutController, ArcElement, Tooltip, Legend, Title)

const SingleResults = ({ results }) => {
  const chartRef = useRef(null)
  const chartInstance = useRef(null)
  const [isHovered, setIsHovered] = useState(false)
  const [hoveredResidue, setHoveredResidue] = useState(null)
  const [structureModalOpen, setStructureModalOpen] = useState(false)
  
  // Refs and state for 3D viewer
  const viewerRef = useRef(null)
  const containerRef = useRef(null)
  const [pdbStructure, setPdbStructure] = useState(null)
  const [loading3D, setLoading3D] = useState(false)
  const [error3D, setError3D] = useState(null)

  useEffect(() => {
    createChart()
    
    // Load the structure when component mounts
    if (results && results.peptide) {
      loadStructure(results.peptide)
    }
    
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
      if (viewerRef.current) {
        try {
          viewerRef.current = null
        } catch (e) {
          console.error("Error cleaning up viewer:", e)
        }
      }
    }
  }, [results])

  // Effect to update highlighting in 3D viewer when hovering over a residue
  useEffect(() => {
    if (viewerRef.current && hoveredResidue !== null) {
      highlightResidue(hoveredResidue)
    } else if (viewerRef.current && hoveredResidue === null) {
      resetHighlighting()
    }
  }, [hoveredResidue])

  const createChart = () => {
    if (!chartRef.current || !results) return
    
    // Destroy existing chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy()
    }
    
    const ctx = chartRef.current.getContext('2d')
    const isEpitope = results.results[0].is_epitope
    const probability = results.results[0].probability
    
    // Chart data and options
    const data = {
      labels: ['Epitope Probability', 'Remaining'],
      datasets: [{
        data: [probability, 1 - probability],
        backgroundColor: [
          isEpitope ? 'rgba(94, 159, 127, 0.8)' : 'rgba(192, 192, 192, 0.5)', // Green primary if epitope, gray if not
          'rgba(233, 235, 238, 0.7)'  // Gray light
        ],
        borderColor: [
          isEpitope ? 'rgba(94, 159, 127, 1)' : 'rgba(150, 150, 150, 1)', // Green primary if epitope
          'rgba(185, 194, 204, 1)'  // Gray mid
        ],
        borderWidth: 1
      }]
    }
    
    // Create chart
    chartInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '70%', // Makes the doughnut chart thinner
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
                if (label === 'Epitope Probability') {
                  return `${label}: ${(context.raw * 100).toFixed(1)}%`
                }
                return `${label}: ${(context.raw * 100).toFixed(1)}%`
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
            text: `HLA Class ${results.results[0].hla_class} Prediction`,
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

  const loadStructure = async (sequence) => {
    setLoading3D(true)
    setError3D(null)
    
    try {
      const response = await axios.post('/api/predict-structure', { sequence })
      setPdbStructure(response.data.pdb_structure)
      
      // Increase timeout to ensure container is properly rendered
      setTimeout(() => {
        initViewer(response.data.pdb_structure)
        setLoading3D(false)
      }, 500) // Increased from 100ms to 500ms
    } catch (error) {
      console.error("Error loading structure:", error)
      setError3D("Failed to load protein structure")
      setLoading3D(false)
    }
  }

  const initViewer = (structure) => {
    if (!containerRef.current || !structure) return
    
    // Make sure the container has dimensions
    const containerElement = $(containerRef.current)
    if (containerElement.width() === 0 || containerElement.height() === 0) {
      console.error("Container has zero dimensions, cannot initialize viewer")
      setError3D("Error initializing 3D viewer: container has zero size")
      return
    }
    
    // Clear any previous viewer
    if (viewerRef.current) {
      try {
        $(containerRef.current).empty()
      } catch (e) {
        console.error("Error clearing container:", e)
      }
    }

    // Create the viewer
    try {
      viewerRef.current = $3Dmol.createViewer(
        containerElement,
        {
          defaultcolors: $3Dmol.rasmolElementColors,
          backgroundColor: 'white',
        }
      )

      // Add the PDB data
      viewerRef.current.addModel(structure, "pdb")
      
      // Style the protein
      viewerRef.current.setStyle({}, { cartoon: { color: 'spectrum' } })
      
      // Add surface representation
      viewerRef.current.addSurface($3Dmol.SurfaceType.VDW, {
        opacity: 0.6,
        color: 'white'
      })
      
      // Zoom to fit the protein
      viewerRef.current.zoomTo()
      
      // Render the scene
      viewerRef.current.render()
    } catch (e) {
      console.error("Error initializing 3Dmol viewer:", e)
      setError3D("Error initializing 3D viewer")
    }
  }

  // Function to highlight a specific residue in the 3D viewer
  const highlightResidue = (resIndex) => {
    if (!viewerRef.current) return
    
    try {
      // Reset previous highlighting
      resetHighlighting()
      
      // Add highlighting for the hovered residue
      // In PDB files, residue indices typically start from 1
      const displayIndex = resIndex + 1
      
      // Highlight the residue with a brighter color and thicker cartoon
      viewerRef.current.setStyle({resi: displayIndex}, {
        cartoon: { color: '#FF9500', thickness: 0.8 },
        stick: { radius: 0.2, color: '#FF9500' }
      })
      
      // Add a transparent sphere around the residue
      viewerRef.current.addSurface($3Dmol.SurfaceType.VDW, {
        opacity: 0.4,
        color: '#FF9500',
        singleSurface: true
      }, {resi: displayIndex})
      
      // Add a border outline around the residue using a slightly larger SAS surface
      // with a different color and higher opacity
      viewerRef.current.addSurface($3Dmol.SurfaceType.SAS, {
        opacity: 0.8,
        color: '#333333',
        singleSurface: true,
        wireframe: true,
        linewidth: 2.0
      }, {resi: displayIndex})
      
      // Render the changes
      viewerRef.current.render()
    } catch (e) {
      console.error("Error highlighting residue:", e)
    }
  }

  // Function to reset all highlighting
  const resetHighlighting = () => {
    if (!viewerRef.current) return
    
    try {
      // Remove all surfaces first
      viewerRef.current.removeAllSurfaces()
      
      // Reset to default style
      viewerRef.current.setStyle({}, { cartoon: { color: 'spectrum' } })
      
      // Add back the overall surface
      viewerRef.current.addSurface($3Dmol.SurfaceType.VDW, {
        opacity: 0.6,
        color: 'white'
      })
      
      // Render the changes
      viewerRef.current.render()
    } catch (e) {
      console.error("Error resetting highlighting:", e)
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

  if (!results || !results.results || !results.results.length) {
    return <div>No results available</div>
  }

  const peptide = results.peptide
  const result = results.results[0]
  const isEpitope = result.is_epitope
  const hlaClass = result.hla_class
  
  // Get min and max for scaled gradient - for single peptide we can use 
  // the actual probability and a delta to create a meaningful range
  const probability = result.probability
  const min = isEpitope ? Math.max(0, probability - 0.2) : 0
  const max = isEpitope ? Math.min(1, probability + 0.1) : 0.5

  return (
    <div className="single-result">
      {/* Alert showing the prediction result */}
      <div 
        className={`alert ${isEpitope ? 'alert-success' : 'alert-secondary'}`}
        style={{
          backgroundColor: isEpitope ? '#EFF5F1' : '#F1F3F5',
          color: isEpitope ? '#33523E' : '#3A424E',
          border: isEpitope ? '1px solid #C6D8CC' : '1px solid #DDE1E6',
          padding: '1rem',
          borderRadius: '0.375rem',
          marginBottom: '1.5rem'
        }}
      >
        <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1rem' }}>Prediction Result:</span>
          <span style={{ fontSize: '0.9rem' }}>
            {isEpitope 
              ? `This peptide is a potential ${hlaClass === 'I' ? 'Class I' : 'Class II'} epitope with a probability of ${result.probability.toFixed(3)}`
              : `This peptide is not predicted to be a ${hlaClass === 'I' ? 'Class I' : 'Class II'} epitope (probability: ${result.probability.toFixed(3)})`
            }
          </span>
        </div>
      </div>

      <div className="content-wrapper" style={{ backgroundColor: '#F5F5F5', borderRadius: '0.375rem', padding: '1.25rem', border: '1px solid #DCE8E0', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)', marginBottom: '1.5rem' }}>
        <div style={{ color: '#33523E', fontWeight: 500, textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.05em', marginBottom: '1rem' }}>
          PEPTIDE VISUALIZATION
        </div>
        
        <div style={{ backgroundColor: 'white', borderRadius: '0.375rem', padding: '1.5rem', border: '1px solid #DCE8E0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <div 
              style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                flexWrap: 'wrap',
                padding: '1rem 0'
              }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              {peptide.split('').map((char, index) => {
                // Function to determine color based on probability - continuous gradient
                const getColor = () => {
                  if (!isEpitope) {
                    return 'rgba(220, 220, 220, 0.3)'; // Light gray for non-epitopes
                  }
                  
                  // Normalize probability to the specified range
                  const normalizedProb = Math.min(1, Math.max(0, (probability - min) / (max - min)));
                  
                  // Brown-orange to green gradient for better visibility
                  // Low: light brown/orange (hue 30-40), High: green (hue 120)
                  const hue = Math.round(40 + (normalizedProb * 80)); // 40 (orange-brown) to 120 (green)
                  const saturation = Math.round(80 + (normalizedProb * 15)); // 80-95%
                  const lightness = Math.round(75 - (normalizedProb * 25)); // 75-50%
                  
                  // Stronger base opacity for all probabilities
                  return `hsla(${hue}, ${saturation}%, ${lightness}%, ${0.7 + (normalizedProb * 0.3)})`;
                };
                
                // Function to get amino acid properties
                const getAminoAcidProperties = (aa) => {
                  const properties = {
                    'A': { name: 'Alanine', abbreviation: 'Ala', property: 'Hydrophobic' },
                    'R': { name: 'Arginine', abbreviation: 'Arg', property: 'Positive charge' },
                    'N': { name: 'Asparagine', abbreviation: 'Asn', property: 'Polar' },
                    'D': { name: 'Aspartic acid', abbreviation: 'Asp', property: 'Negative charge' },
                    'C': { name: 'Cysteine', abbreviation: 'Cys', property: 'Polar' },
                    'E': { name: 'Glutamic acid', abbreviation: 'Glu', property: 'Negative charge' },
                    'Q': { name: 'Glutamine', abbreviation: 'Gln', property: 'Polar' },
                    'G': { name: 'Glycine', abbreviation: 'Gly', property: 'Hydrophobic' },
                    'H': { name: 'Histidine', abbreviation: 'His', property: 'Positive charge' },
                    'I': { name: 'Isoleucine', abbreviation: 'Ile', property: 'Hydrophobic' },
                    'L': { name: 'Leucine', abbreviation: 'Leu', property: 'Hydrophobic' },
                    'K': { name: 'Lysine', abbreviation: 'Lys', property: 'Positive charge' },
                    'M': { name: 'Methionine', abbreviation: 'Met', property: 'Hydrophobic' },
                    'F': { name: 'Phenylalanine', abbreviation: 'Phe', property: 'Hydrophobic' },
                    'P': { name: 'Proline', abbreviation: 'Pro', property: 'Hydrophobic' },
                    'S': { name: 'Serine', abbreviation: 'Ser', property: 'Polar' },
                    'T': { name: 'Threonine', abbreviation: 'Thr', property: 'Polar' },
                    'W': { name: 'Tryptophan', abbreviation: 'Trp', property: 'Hydrophobic' },
                    'Y': { name: 'Tyrosine', abbreviation: 'Tyr', property: 'Polar' },
                    'V': { name: 'Valine', abbreviation: 'Val', property: 'Hydrophobic' }
                  };
                  
                  return properties[aa.toUpperCase()] || { name: 'Unknown', abbreviation: 'Unk', property: 'Unknown' };
                };
                
                const aaProps = getAminoAcidProperties(char);
                
                return (
                  <div 
                    key={index} 
                    style={{ 
                      display: 'inline-flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      margin: '0.15rem',
                      width: '2.5rem'
                    }}
                    title={`${aaProps.name} (${aaProps.abbreviation})\nProperty: ${aaProps.property}\nPosition: ${index+1}`}
                    onMouseEnter={() => setHoveredResidue(index)}
                    onMouseLeave={() => setHoveredResidue(null)}
                  >
                    <div style={{
                      backgroundColor: getColor(),
                      width: '2.2rem',
                      height: '2.2rem',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderRadius: '0.3rem',
                      fontFamily: 'monospace',
                      fontSize: '1.4rem',
                      fontWeight: (isHovered || hoveredResidue === index) && isEpitope ? 'bold' : '600',
                      color: isHovered || hoveredResidue === index ? '#000000' : '#666666',
                      border: isEpitope ? 
                        (isHovered || hoveredResidue === index ? '3px solid rgba(94, 159, 127, 0.9)' : '1px solid rgba(94, 159, 127, 0.3)') : 
                        '1px solid rgba(185, 194, 204, 0.3)',
                      boxShadow: (isHovered || hoveredResidue === index) && isEpitope ? '0 0 4px rgba(0, 0, 0, 0.2)' : 'none',
                      transform: (isHovered || hoveredResidue === index) && isEpitope ? 'scale(1.08)' : 'scale(1)',
                      transition: 'all 0.15s ease-in-out',
                      cursor: 'pointer'
                    }}>
                      {char}
                    </div>
                    <div style={{
                      fontSize: '0.7rem',
                      marginTop: '0.2rem',
                      color: '#7F8A99',
                      textAlign: 'center'
                    }}>
                      {aaProps.abbreviation}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {isEpitope && (
              <div style={{ 
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '0.5rem',
                backgroundColor: 'rgba(94, 159, 127, 0.1)',
                borderRadius: '0.3rem'
              }}>
                <div style={{ fontSize: '0.9rem', color: '#33523E' }}>
                  <strong>Epitope Probability:</strong> {results.results[0].probability.toFixed(3)} 
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#5E9F7F' }}>
                    ({results.results[0].probability < 0.7 ? 'Moderate' : 'Strong'} binding prediction)
                  </span>
                </div>
              </div>
            )}
            
            {/* Legend if epitope */}
            {isEpitope && (
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.8rem' }}>Color intensity indicates binding strength</div>
                <div style={{ display: 'flex', alignItems: 'center', height: '15px', width: '150px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #DCE8E0' }}>
                  <div style={{ 
                    background: 'linear-gradient(to right, hsla(40, 80%, 75%, 0.85) 0%, hsla(80, 85%, 65%, 0.9) 50%, hsla(120, 95%, 50%, 0.95) 100%)',
                    height: '100%', 
                    width: '100%'
                  }}></div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.7rem' }}>
                  <span>{min.toFixed(2)}</span>
                  <span>{probability.toFixed(2)}</span>
                  <span>{max.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3D Structure Visualization */}
      <div className="content-wrapper" style={{ backgroundColor: '#F5F5F5', borderRadius: '0.375rem', padding: '1.25rem', border: '1px solid #DCE8E0', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ color: '#33523E', fontWeight: 500, textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.05em' }}>
            3D STRUCTURE VISUALIZATION
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
      </div>

      <div className="content-wrapper" style={{ backgroundColor: '#F5F5F5', borderRadius: '0.375rem', padding: '1.25rem', border: '1px solid #DCE8E0', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)' }}>
        <div className="row" style={{ display: 'flex', flexWrap: 'wrap', margin: '0 -12px' }}>
          <div className="col-md-6" style={{ padding: '0 12px', marginBottom: '1rem' }}>
            <div className="chart-title" style={{ color: '#33523E', fontWeight: 500, textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              Prediction Visualization
            </div>
            <div className="chart-container" style={{ height: '220px', backgroundColor: 'white', borderRadius: '0.375rem', padding: '0.75rem', border: '1px solid #DCE8E0' }}>
              <canvas ref={chartRef}></canvas>
            </div>
          </div>
          <div className="col-md-6" style={{ padding: '0 12px' }}>
            <div className="chart-title" style={{ color: '#33523E', fontWeight: 500, textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              Detailed Result
            </div>
            <div className="table-container" style={{ height: '220px', backgroundColor: 'white', borderRadius: '0.375rem', border: '1px solid #DCE8E0', overflow: 'auto' }}>
              <Table striped hover className="results-table mb-0">
                <thead>
                  <tr>
                    <th>PEPTIDE</th>
                    <th>HLA CLASS</th>
                    <th>PROBABILITY</th>
                    <th>RESULT</th>
                  </tr>
                </thead>
                <tbody>
                  {results.results.map((result, index) => (
                    <tr key={index}>
                      <td style={{ fontFamily: 'monospace' }}>{result.peptide}</td>
                      <td>{result.hla_class}</td>
                      <td>{result.probability.toFixed(3)}</td>
                      <td className={result.is_epitope ? 'result-positive' : 'result-negative'}
                        style={{ 
                          color: result.is_epitope ? '#33523E' : '#3A424E',
                          fontWeight: 500
                        }}>
                        {result.is_epitope ? 'Epitope' : 'Non-Epitope'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SingleResults 