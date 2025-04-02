import { useState } from 'react';
import { Container, Paper, Title, Text, Box } from '@mantine/core';
import StructurePredictionForm from './StructurePredictionForm';
import StructureViewer from './StructureViewer';

const StructurePredictionPage = () => {
  const [predictionData, setPredictionData] = useState(null);
  
  const handlePredictionComplete = (data) => {
    setPredictionData(data);
  };
  
  const handleBack = () => {
    setPredictionData(null);
  };
  
  return (
    <Container size="lg" py="xl">
      <Paper
        shadow="sm"
        p="lg"
        style={{
          marginBottom: '2rem',
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: '#DCE8E0',
          borderRadius: '0.375rem',
          backgroundColor: '#F7F9F8',
        }}
      >
        <Title 
          order={2}
          style={{
            fontSize: '1.75rem',
            marginBottom: '0.5rem',
            color: '#33523E',
            letterSpacing: '0.05em',
          }}
        >
          Protein Structure Prediction
        </Title>
        <Text color="dimmed" mb="md">
          Predict the 3D structure of proteins using ESMFold, Meta AI's state-of-the-art protein structure prediction model.
        </Text>
      </Paper>
      
      {predictionData ? (
        <StructureViewer data={predictionData} onBack={handleBack} />
      ) : (
        <StructurePredictionForm onPredictionComplete={handlePredictionComplete} />
      )}
      
      <Box mt="xl">
        <Text size="sm" color="dimmed" align="center">
          Powered by ESMFold, developed by Meta AI Research.
        </Text>
      </Box>
    </Container>
  );
};

export default StructurePredictionPage; 