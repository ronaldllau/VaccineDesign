import { Paper, Title, Text, Stack, List, Anchor, Divider } from '@mantine/core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faInfoCircle, faCheck } from '@fortawesome/free-solid-svg-icons'

// Custom styled components
const StyledPaper = ({ children, ...props }) => (
  <Paper 
    shadow="sm" 
    p="lg" 
    style={{ 
      borderWidth: 1, 
      borderStyle: 'solid', 
      borderColor: '#DCE8E0', 
      borderRadius: '0.375rem',
      backgroundColor: '#F5F5F5',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      transition: 'all 0.3s ease-out',
    }} 
    className="animate-entrance"
    {...props}
  >
    {children}
  </Paper>
);

const StyledTitle = ({ children, ...props }) => (
  <Title 
    order={3} 
    style={{ 
      fontSize: '1.25rem', 
      marginBottom: '1rem',
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      fontWeight: 500,
      color: '#33523E',
      display: 'flex',
      alignItems: 'center'
    }} 
    {...props}
  >
    {children}
  </Title>
);

const AboutSection = () => {
  return (
    <StyledPaper mt={60}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '1rem',
        position: 'relative'
      }}>
        <div style={{
          backgroundColor: 'rgba(94, 159, 127, 0.1)',
          padding: '8px',
          borderRadius: '50%',
          marginRight: '0.75rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <FontAwesomeIcon 
            icon={faInfoCircle} 
            style={{ 
              color: '#5E9F7F',
              fontSize: '1.25rem'
            }} 
          />
        </div>
        <StyledTitle style={{ 
          margin: 0, 
          display: 'flex',
          alignItems: 'center'
        }}>
          About TransHLA
        </StyledTitle>
      </div>
      
      <Divider mb="lg" style={{ borderColor: '#DCE8E0' }} />
      
      <Stack gap="md">
        <Text style={{ color: '#3A424E', fontSize: '0.95rem' }}>
          This tool uses <Anchor 
            href="https://github.com/SkywalkerLuke/TransHLA" 
            target="_blank" 
            style={{ 
              color: '#5E9F7F',
              textDecoration: 'none',
              borderBottom: '1px solid #DCE8E0',
              paddingBottom: '2px',
              transition: 'color 0.2s ease, border-color 0.2s ease'
            }}
            sx={{
              '&:hover': {
                color: '#4A8264',
                borderColor: '#4A8264'
              }
            }}
          >
            TransHLA
          </Anchor>, 
          a hybrid transformer model for HLA-presented epitope detection.
        </Text>
        
        <Text style={{ color: '#3A424E', fontSize: '0.95rem' }}>
          TransHLA is the first tool capable of directly identifying peptides as epitopes without the need for inputting HLA alleles.
        </Text>
        
        <div style={{
          backgroundColor: 'rgba(94, 159, 127, 0.05)',
          padding: '1rem',
          borderLeft: '3px solid #5E9F7F',
          margin: '0.5rem 0',
          borderRadius: '0 0.25rem 0.25rem 0',
          transition: 'all 0.3s ease'
        }} className="animate-pulse-bg">
          <Text weight={500} style={{ textTransform: 'uppercase', letterSpacing: '0.03em', color: '#33523E', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            CAPABILITIES
          </Text>
          
          <List 
            spacing="sm"
            center
            icon={
              <div style={{
                backgroundColor: 'rgba(94, 159, 127, 0.1)',
                padding: '4px',
                borderRadius: '50%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <FontAwesomeIcon 
                  icon={faCheck} 
                  style={{ color: '#5E9F7F', fontSize: '0.7rem' }}
                />
              </div>
            }
            styles={{
              item: {
                color: '#3A424E',
                fontSize: '0.9rem',
                padding: '0.25rem 0',
                transition: 'transform 0.2s ease',
                '&:hover': {
                  transform: 'translateX(2px)'
                }
              }
            }}
          >
            <List.Item>TransHLA_I: For peptides presented by HLA class I molecules (typically 8-14 amino acids)</List.Item>
            <List.Item>TransHLA_II: For peptides presented by HLA class II molecules (typically 13-21 amino acids)</List.Item>
            <List.Item>Utilizes transformer encoder module and deep CNN for prediction</List.Item>
            <List.Item>Trained using pretrained sequence embeddings from ESM2 and contact map structural features</List.Item>
            <List.Item>Sliding window analysis for identifying all potential epitopes in protein sequences</List.Item>
          </List>
        </div>
      </Stack>
    </StyledPaper>
  )
}

export default AboutSection 