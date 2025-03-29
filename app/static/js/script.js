document.addEventListener('DOMContentLoaded', () => {
    const predictionForm = document.getElementById('prediction-form');
    const peptideInput = document.getElementById('peptide-sequence');
    const predictBtn = document.getElementById('predict-btn');
    const loadingSpinner = document.getElementById('loading-spinner');
    const resultsSection = document.getElementById('results-section');
    const resultPeptide = document.getElementById('result-peptide');
    const predictionSummary = document.getElementById('prediction-summary');
    const resultsTableBody = document.getElementById('results-table-body');
    const errorMessage = document.getElementById('error-message');
    
    let resultsChart = null;

    // Input validation
    peptideInput.addEventListener('input', (e) => {
        const value = e.target.value.toUpperCase();
        const validAminoAcids = 'ACDEFGHIKLMNPQRSTVWY';
        
        // Filter out invalid characters
        const filteredValue = value
            .split('')
            .filter(char => validAminoAcids.includes(char))
            .join('');
            
        if (value !== filteredValue) {
            e.target.value = filteredValue;
        }
    });

    // Form submission
    predictionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const peptideSeq = peptideInput.value.trim().toUpperCase();
        
        if (!peptideSeq) {
            showError('Please enter a peptide sequence.');
            return;
        }
        
        const peptideLength = peptideSeq.length;
        
        // Validate peptide length based on TransHLA requirements
        if (peptideLength < 8 || peptideLength > 21) {
            showError('Peptide sequence should be between 8-21 amino acids in length.');
            return;
        }
        
        if (peptideLength > 14 && peptideLength < 13) {
            showError('Peptides of length 15-12 are not supported by the model.');
            return;
        }
        
        // Clear previous results
        hideError();
        resultsSection.classList.add('d-none');
        
        // Show loading state
        predictBtn.disabled = true;
        loadingSpinner.classList.remove('d-none');
        
        try {
            const response = await fetch('/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sequence: peptideSeq }),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Prediction failed. Please try again.');
            }
            
            displayResults(data);
            
        } catch (error) {
            showError(error.message);
        } finally {
            // Hide loading state
            predictBtn.disabled = false;
            loadingSpinner.classList.add('d-none');
        }
    });
    
    function displayResults(data) {
        // Display peptide
        resultPeptide.textContent = data.peptide;
        
        // Clear previous results
        resultsTableBody.innerHTML = '';
        
        // Process and display results
        const results = data.results;
        
        results.forEach(result => {
            const row = document.createElement('tr');
            
            // Format and display results
            row.innerHTML = `
                <td>${result.peptide}</td>
                <td>${result.probability.toFixed(3)}</td>
                <td class="${result.is_epitope ? 'result-positive' : 'result-negative'}">
                    ${result.is_epitope ? 'Potential Epitope' : 'Non-Epitope'}
                </td>
            `;
            
            resultsTableBody.appendChild(row);
        });
        
        // Display summary
        const isEpitope = results[0].is_epitope;
        predictionSummary.innerHTML = isEpitope
            ? `<strong>Result:</strong> The peptide ${data.peptide} is predicted to be a potential HLA epitope.`
            : `<strong>Result:</strong> The peptide ${data.peptide} is predicted to be a non-epitope.`;
            
        // Create visualization
        createVisualization(results);
        
        // Show results section
        resultsSection.classList.remove('d-none');
    }
    
    function createVisualization(results) {
        // If a chart exists, destroy it
        if (resultsChart) {
            resultsChart.destroy();
        }
        
        const ctx = document.getElementById('results-chart').getContext('2d');
        
        // For TransHLA, we only have one score (probability)
        const result = results[0];
        
        // Create chart - for TransHLA we use a gauge-like display
        resultsChart = new Chart(ctx, {
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
                                const label = context.label || '';
                                const value = (context.raw * 100).toFixed(1) + '%';
                                return `${label}: ${value}`;
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Epitope Prediction Probability',
                        font: {
                            size: 16
                        }
                    }
                }
            }
        });
    }
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('d-none');
    }
    
    function hideError() {
        errorMessage.textContent = '';
        errorMessage.classList.add('d-none');
    }
}); 