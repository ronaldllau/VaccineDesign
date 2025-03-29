import { Container } from 'react-bootstrap'

const Footer = () => {
  return (
    <footer className="bg-light text-center text-muted py-3 mt-5">
      <Container>
        <p className="mb-0">
          TransHLA Epitope Predictor &copy; {new Date().getFullYear()} | 
          Built with <a href="https://github.com/SkywalkerLuke/TransHLA" target="_blank" rel="noreferrer">TransHLA</a>
        </p>
      </Container>
    </footer>
  )
}

export default Footer 