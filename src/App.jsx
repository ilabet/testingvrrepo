import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import ScrollToTop from './components/ScrollToTop';
import SLSessionGate from '@/components/SLSessionGate';
import SLLogin from '@/pages/SLLogin';
import OrientationCheck from '@/pages/OrientationCheck';
import Viewer from '@/pages/Viewer';

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Navigate to="/sl-login" replace />} />
          <Route path="/sl-login" element={<SLLogin />} />
          <Route element={<SLSessionGate />}>
            <Route path="/orientation-check" element={<OrientationCheck />} />
            <Route path="/mobile" element={<Viewer />} />
          </Route>
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Router>
      <Toaster />
    </QueryClientProvider>
  )
}

export default App
