import { Card } from 'react-bootstrap'

const AboutSection = () => {
  return (
    <Card className="shadow-sm mt-4">
      <Card.Header className="bg-light">
        <h5>About TransHLA Epitope Prediction</h5>
      </Card.Header>
      <Card.Body>
        <p>This tool uses <a href="https://github.com/SkywalkerLuke/TransHLA" target="_blank" rel="noreferrer">TransHLA</a>, a hybrid transformer model for HLA-presented epitope detection.</p>
        <p>TransHLA is the first tool capable of directly identifying peptides as epitopes without the need for inputting HLA alleles.</p>
        <p><strong>Features:</strong></p>
        <ul>
          <li>TransHLA_I: For peptides presented by HLA class I molecules (typically 8-14 amino acids)</li>
          <li>TransHLA_II: For peptides presented by HLA class II molecules (typically 13-21 amino acids)</li>
          <li>Utilizes transformer encoder module and deep CNN for prediction</li>
          <li>Trained using pretrained sequence embeddings from ESM2 and contact map structural features</li>
          <li>Sliding window analysis for identifying all potential epitopes in protein sequences</li>
        </ul>
      </Card.Body>
    </Card>
  )
}

export default AboutSection 