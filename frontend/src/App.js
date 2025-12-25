import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import MyDocuments from './pages/MyDocuments';
import SharedDocuments from './pages/SharedDocuments';
import AccessRequests from './pages/AccessRequests';
import ActivityLogs from './pages/ActivityLogs';
import Profile from './pages/Profile';
import Layout from './components/Layout';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <LandingPage setIsAuthenticated={setIsAuthenticated} />
              )
            }
          />
          <Route
            path="/dashboard"
            element={
              isAuthenticated ? (
                <Layout setIsAuthenticated={setIsAuthenticated}>
                  <Dashboard />
                </Layout>
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/documents"
            element={
              isAuthenticated ? (
                <Layout setIsAuthenticated={setIsAuthenticated}>
                  <MyDocuments />
                </Layout>
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/shared"
            element={
              isAuthenticated ? (
                <Layout setIsAuthenticated={setIsAuthenticated}>
                  <SharedDocuments />
                </Layout>
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/requests"
            element={
              isAuthenticated ? (
                <Layout setIsAuthenticated={setIsAuthenticated}>
                  <AccessRequests />
                </Layout>
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/activity"
            element={
              isAuthenticated ? (
                <Layout setIsAuthenticated={setIsAuthenticated}>
                  <ActivityLogs />
                </Layout>
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/profile"
            element={
              isAuthenticated ? (
                <Layout setIsAuthenticated={setIsAuthenticated}>
                  <Profile />
                </Layout>
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
