import React from 'react'
import AppRoutes from './routes/AppRoutes'
import GoogleTranslateWidget from './components/GoogleTranslateWidget'

const App = () => {
  return (
    <>
      <AppRoutes />
      <GoogleTranslateWidget />
    </>
  )
}

export default App