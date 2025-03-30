import { Container, Group, Text, Anchor } from '@mantine/core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCode } from '@fortawesome/free-solid-svg-icons'
import { faGithub } from '@fortawesome/free-brands-svg-icons'

const Footer = () => {
  return (
    <Container size="lg">
      <Group justify="center" style={{ height: '100%', alignItems: 'center' }}>
        <Text 
          style={{ 
            color: '#7F8A99', 
            fontSize: '0.75rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            margin: 0
          }}
        >
          <div style={{
            backgroundColor: 'rgba(94, 159, 127, 0.1)',
            padding: '6px',
            borderRadius: '50%',
            marginRight: '0.5rem',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            transition: 'background-color 0.3s ease'
          }}>
            <FontAwesomeIcon 
              icon={faCode}
              style={{ 
                color: '#5E9F7F',
                fontSize: '0.7rem'
              }} 
            />
          </div>
          <span>TransHLA Epitope Predictor &copy; {new Date().getFullYear()} | 
          Built with <Anchor 
            href="https://github.com/SkywalkerLuke/TransHLA" 
            target="_blank" 
            style={{ 
              color: '#5E9F7F',
              textDecoration: 'none',
              borderBottom: '1px solid #DCE8E0',
              paddingBottom: '2px',
              position: 'relative',
              transition: 'color 0.2s ease, border-color 0.2s ease'
            }}
            sx={{
              '&:hover': {
                color: '#4A8264',
                borderColor: '#4A8264',
              }
            }}
          >
            TransHLA
          </Anchor>
          </span>
        </Text>
      </Group>
    </Container>
  )
}

export default Footer 