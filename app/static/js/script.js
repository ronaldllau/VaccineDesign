document.addEventListener('DOMContentLoaded', () => {
    const predictionForm = document.getElementById('prediction-form');
    const peptideInput = document.getElementById('peptide-sequence');
    const modeSingle = document.getElementById('mode-single');
    const modeSliding = document.getElementById('mode-sliding');
    const predictBtn = document.getElementById('predict-btn');
    const loadingSpinner = document.getElementById('loading-spinner');
    const singleResultsSection = document.getElementById('single-results-section');
    const slidingResultsSection = document.getElementById('sliding-results-section');
    const resultPeptide = document.getElementById('result-peptide');
    const slidingSequence = document.getElementById('sliding-sequence');
    const predictionSummary = document.getElementById('prediction-summary');
    const slidingSummary = document.getElementById('sliding-summary');
    const resultsTableBody = document.getElementById('results-table-body');
    const slidingResultsTable = document.getElementById('sliding-results-table');
    const errorMessage = document.getElementById('error-message');
    const showEpitopeOnly = document.getElementById('show-epitopes-only');
    const sortSelect = document.getElementById('sort-select');
    
    let resultsChart = null;
    let densityChart = null;
    let distributionChart = null;
    let slidingResults = null;

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

    // Show/hide epitopes only event listener
    showEpitopeOnly.addEventListener('change', () => {
        renderSlidingResults();
    });

    // Sort select event listener
    sortSelect.addEventListener('change', () => {
        renderSlidingResults();
    });

    // Form submission
    predictionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const peptideSeq = peptideInput.value.trim().toUpperCase();
        
        if (!peptideSeq) {
            showError('Please enter a peptide sequence.');
            return;
        }
        
        // Get analysis mode
        const mode = modeSliding.checked ? 'sliding' : 'single';
        
        // Validate peptide length for single peptide mode
        if (mode === 'single') {
            const peptideLength = peptideSeq.length;
            
            if (peptideLength < 8 || peptideLength > 21) {
                showError('For single peptide analysis, sequence should be between 8-21 amino acids. For longer sequences, use Sliding Window Analysis.');
                return;
            }
            
            if (peptideLength > 14 && peptideLength < 13) {
                showError('Peptides of length 15-12 are not supported by the model.');
                return;
            }
        }
        
        // Clear previous results
        hideError();
        singleResultsSection.classList.add('d-none');
        slidingResultsSection.classList.add('d-none');
        
        // Show loading state
        predictBtn.disabled = true;
        loadingSpinner.classList.remove('d-none');
        
        try {
            const response = await fetch('/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    sequence: peptideSeq,
                    mode: mode
                }),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Prediction failed. Please try again.');
            }
            
            if (mode === 'single') {
                displaySingleResults(data);
            } else {
                displaySlidingResults(data);
            }
            
        } catch (error) {
            showError(error.message);
        } finally {
            // Hide loading state
            predictBtn.disabled = false;
            loadingSpinner.classList.add('d-none');
        }
    });
    
    function displaySingleResults(data) {
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
                <td>${result.hla_class}</td>
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
            ? `<strong>Result:</strong> The peptide ${data.peptide} is predicted to be a potential HLA class ${results[0].hla_class} epitope.`
            : `<strong>Result:</strong> The peptide ${data.peptide} is predicted to be a non-epitope.`;
            
        // Create visualization
        createSingleVisualization(results[0]);
        
        // Show results section
        singleResultsSection.classList.remove('d-none');
    }
    
    function displaySlidingResults(data) {
        // Store the results for filtering/sorting
        slidingResults = data;
        
        // Display original sequence (truncate if too long)
        const maxDisplayLength = 50;
        const displaySequence = data.original_sequence.length > maxDisplayLength 
            ? data.original_sequence.substring(0, maxDisplayLength) + '...' 
            : data.original_sequence;
            
        slidingSequence.textContent = displaySequence;
        
        // Display summary
        slidingSummary.innerHTML = `
            <strong>Analysis Summary:</strong> 
            Found ${data.epitope_count} potential epitopes out of ${data.total_peptides} possible peptides 
            (${(data.epitope_density * 100).toFixed(1)}% epitope density).
        `;
        
        // Render the table with current filter/sort settings
        renderSlidingResults();
        
        // Create visualizations
        createDensityChart(data);
        createDistributionChart(data);
        
        // Show results section
        slidingResultsSection.classList.remove('d-none');
    }
    
    function renderSlidingResults() {
        if (!slidingResults) return;
        
        // Get current filter and sort settings
        const showOnlyEpitopes = showEpitopeOnly.checked;
        const sortBy = sortSelect.value;
        
        // Clear previous results
        slidingResultsTable.innerHTML = '';
        
        // Filter results if needed
        let results = [...slidingResults.results];
        if (showOnlyEpitopes) {
            results = results.filter(result => result.is_epitope);
        }
        
        // Sort results
        results.sort((a, b) => {
            if (sortBy === 'position') {
                return a.position - b.position;
            } else if (sortBy === 'probability') {
                return b.probability - a.probability;
            } else if (sortBy === 'length') {
                return a.length - b.length;
            }
            return 0;
        });
        
        // Add results to table
        results.forEach(result => {
            const row = document.createElement('tr');
            
            // Format and display results
            row.innerHTML = `
                <td>${result.position}</td>
                <td>${result.peptide}</td>
                <td>${result.length}</td>
                <td>${result.class}</td>
                <td>${result.probability.toFixed(3)}</td>
                <td class="${result.is_epitope ? 'result-positive' : 'result-negative'}">
                    ${result.is_epitope ? 'Potential Epitope' : 'Non-Epitope'}
                </td>
            `;
            
            slidingResultsTable.appendChild(row);
        });
        
        // Show message if no results after filtering
        if (results.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="6" class="text-center">No epitopes found with the current filter settings.</td>
            `;
            slidingResultsTable.appendChild(row);
        }
    }
    
    function createSingleVisualization(result) {
        // If a chart exists, destroy it
        if (resultsChart) {
            resultsChart.destroy();
        }
        
        const ctx = document.getElementById('results-chart').getContext('2d');
        
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
    
    function createDensityChart(data) {
        // If a chart exists, destroy it
        if (densityChart) {
            densityChart.destroy();
        }
        
        const ctx = document.getElementById('density-chart').getContext('2d');
        
        // Create density chart - pie chart showing epitope vs non-epitope ratio
        densityChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Epitopes', 'Non-Epitopes'],
                datasets: [{
                    data: [data.epitope_count, data.total_peptides - data.epitope_count],
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
                                const count = context.raw;
                                const percent = ((count / data.total_peptides) * 100).toFixed(1);
                                return `${label}: ${count} (${percent}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    function createDistributionChart(data) {
        // If a chart exists, destroy it
        if (distributionChart) {
            distributionChart.destroy();
        }
        
        const ctx = document.getElementById('distribution-chart').getContext('2d');
        
        // Prepare data for distribution chart - shows epitope probability by position
        const positions = Array.from(new Set(data.results.map(r => r.position))).sort((a, b) => a - b);
        
        // For each position, calculate the average probability
        const positionData = positions.map(pos => {
            const peptidesAtPosition = data.results.filter(r => r.position === pos);
            const avgProbability = peptidesAtPosition.reduce((sum, p) => sum + p.probability, 0) / peptidesAtPosition.length;
            return {
                position: pos,
                probability: avgProbability
            };
        });
        
        // Create distribution chart
        distributionChart = new Chart(ctx, {
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
                                return `Position: ${context[0].label}`;
                            },
                            label: function(context) {
                                return `Probability: ${context.raw.toFixed(3)}`;
                            }
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