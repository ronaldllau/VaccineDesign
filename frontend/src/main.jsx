import React from 'react'
import ReactDOM from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import App from './App.jsx'
import './index.css'

// Corporate-inspired minimal theme
const theme = {
  primaryColor: 'green',
  colors: {
    // Primary green palette with more saturation
    green: [
      '#EFF5F1', // 0 - lightest
      '#DCE8E0', // 1
      '#C6D8CC', // 2
      '#A7C2B0', // 3
      '#8AAD96', // 4
      '#5E9F7F', // 5 - primary accent (more saturated)
      '#4A8264', // 6
      '#3A6A51', // 7
      '#2B523E', // 8
      '#1F3325'  // 9 - darkest
    ],
    // More vibrant orange palette
    orange: [
      '#FBF5F0', // 0
      '#F6E9DB', // 1
      '#F0D8C0', // 2
      '#EBC5A3', // 3
      '#E7B689', // 4
      '#E38956', // 5 - secondary accent (more vibrant)
      '#C1704E', // 6
      '#9F5B3D', // 7
      '#794425', // 8
      '#52300F'  // 9
    ],
    // Neutral blue-gray palette
    gray: [
      '#F5F6F7', // 0
      '#E9EBEE', // 1
      '#D5D9E0', // 2
      '#B9C2CC', // 3 - used for subtle elements
      '#9BA6B3', // 4
      '#7F8A99', // 5
      '#677484', // 6
      '#525B69', // 7
      '#3A424E', // 8
      '#1F252F'  // 9
    ]
  },
  // Set primary shade to a medium value for muted appearance
  primaryShade: 5,
  // Use clean sans-serif fonts inspired by corporate aesthetics
  fontFamily: 'Helvetica, Inter, system-ui, sans-serif',
  // Reduce border radius for more utilitarian look
  defaultRadius: 'sm',
  // Headings should feel corporate and clean
  headings: {
    fontFamily: 'Helvetica, Inter, system-ui, sans-serif',
    fontWeight: '500',
    sizes: {
      h1: { fontSize: '1.75rem', lineHeight: 1.3 },
      h2: { fontSize: '1.5rem', lineHeight: 1.35 },
      h3: { fontSize: '1.25rem', lineHeight: 1.4 },
      h4: { fontSize: '1.1rem', lineHeight: 1.45 },
      h5: { fontSize: '1rem', lineHeight: 1.5 },
      h6: { fontSize: '0.875rem', lineHeight: 1.5 },
    }
  },
  // Other global styles
  other: {
    backgroundColor: '#F5F5F5',
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MantineProvider theme={theme} withGlobalStyles withNormalizeCSS>
      <App />
    </MantineProvider>
  </React.StrictMode>,
)
