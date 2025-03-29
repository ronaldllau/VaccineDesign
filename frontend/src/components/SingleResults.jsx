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

      // Create chart - for TransHLA we use a gauge-like display
      chartInstance.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Epitope Probability', 'Non-Epitope Probability'],
          datasets: [{
            data: [result.probability, 1 - result.probability],
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
                  const value = (context.raw * 100).toFixed(1) + '%'
                  return `${label}: ${value}`
                }
              }
            },
            title: {
              display: true,
              text: `HLA Class ${result.hla_class} Epitope Prediction`,
              font: {
                size: 16
              }
            }
          }
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
    <div className="results-section mb-4">
      <h5>Prediction Results for: <span>{results.peptide}</span></h5>
      
      <Alert variant={isEpitope ? "success" : "secondary"}>
        <strong>Result:</strong> The peptide {results.peptide} is predicted to be 
        {isEpitope 
          ? ` a potential HLA class ${results.results[0].hla_class} epitope.` 
          : ` a non-epitope when presented by HLA class ${results.results[0].hla_class}.`
        }
      </Alert>
      
      <Row>
        <Col md={8}>
          <div className="table-responsive">
            <Table striped hover>
              <thead>
                <tr>
                  <th>Peptide</th>
                  <th>HLA Class</th>
                  <th>Probability Score</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {results.results.map((result, index) => (
                  <tr key={index}>
                    <td>{result.peptide}</td>
                    <td>{result.hla_class}</td>
                    <td>{result.probability.toFixed(3)}</td>
                    <td className={result.is_epitope ? 'result-positive' : 'result-negative'}>
                      {result.is_epitope ? 'Potential Epitope' : 'Non-Epitope'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Col>
        <Col md={4}>
          <Card>
            <Card.Header>Prediction Visualization</Card.Header>
            <Card.Body>
              <canvas ref={chartRef}></canvas>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default SingleResults 