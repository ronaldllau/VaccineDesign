import { useEffect, useRef } from 'react'
import { Card, Row, Col, Table, Alert } from 'react-bootstrap'
import { Chart, DoughnutController, ArcElement, Tooltip, Legend, Title } from 'chart.js'

// Register Chart.js components
Chart.register(DoughnutController, ArcElement, Tooltip, Legend, Title)

const SingleResults = ({ results }) => {
  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  useEffect(() => {
    // Create the chart when component mounts or results change
    if (results && chartRef.current) {
      // Destroy existing chart if it exists
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }

      const ctx = chartRef.current.getContext('2d')
      const result = results.results[0]

      // Create chart with themed colors
      chartInstance.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Epitope Probability', 'Non-Epitope Probability'],
          datasets: [{
            data: [result.probability, 1 - result.probability],
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
                padding: 15
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || ''
                  const value = (context.raw * 100).toFixed(1) + '%'
                  return `${label}: ${value}`
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
              text: `HLA Class ${result.hla_class} Epitope Prediction`,
              font: {
                family: 'Helvetica, Inter, system-ui, sans-serif',
                size: 14,
                weight: 500
              },
              color: '#33523E', // Green dark
              padding: 15
            }
          },
          cutout: '70%' // Make the doughnut thinner for a more modern look
        }
      })
    }

    // Cleanup function to destroy chart when component unmounts
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
    }
  }, [results])

  if (!results) return null

  const isEpitope = results.results[0].is_epitope
  
  return (
    <div className="results-section">
      <div style={{ 
        marginBottom: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        <Alert variant={isEpitope ? "success" : "secondary"} 
          className="mb-0" 
          style={{ 
            borderLeft: isEpitope ? '4px solid #5E9F7F' : '4px solid #B9C2CC',
            backgroundColor: '#EFF5F1',
            color: '#33523E',
            border: '1px solid #C6D8CC',
            padding: '1rem',
            borderRadius: '0.375rem',
          }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>ANALYSIS RESULT</div>
            <div>
              The peptide <span style={{ fontWeight: 500 }}>{results.peptide}</span> is predicted to be 
              {isEpitope 
                ? ` a potential HLA class ${results.results[0].hla_class} epitope.` 
                : ` a non-epitope when presented by HLA class ${results.results[0].hla_class}.`
              }
            </div>
          </div>
        </Alert>

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
    </div>
  )
}

export default SingleResults 