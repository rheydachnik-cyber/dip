import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Routes, Route, Navigate } from 'react-router-dom';
import { getCurrentUser, setTheme, hideEncouragement, restoreUser, setProjects } from './store';
import Home from './pages/Home';
import Projects from './pages/Projects';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import Loader from './components/Loader';
function App() {
  const dispatch = useDispatch();
  const { user, token, isLoading, isInitialized } = useSelector(state => state.auth);
  const { theme, showEncouragement, encouragementMessage } = useSelector(state => state.ui);
  useEffect(() => {
    dispatch(restoreUser());
    const savedProjects = localStorage.getItem('projects');
    if (savedProjects) {
      try {
        const parsed = JSON.parse(savedProjects);
        if (parsed.length > 0) {
          dispatch(setProjects(parsed));
        }
      } catch (e) {
        console.error('Error parsing saved projects:', e);
      }
    }
  }, [dispatch]);
  useEffect(() => {
    const initAuth = async () => {
      try {
        await dispatch(getCurrentUser()).unwrap();
      } catch (error) {
        console.error('Auth initialization error:', error);
      }
    };
    initAuth();
  }, [dispatch]);
  useEffect(() => {
    document.body.className = theme;
  }, [theme]);
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      dispatch(setTheme(savedTheme));
    }
  }, [dispatch]);
  useEffect(() => {
    if (showEncouragement) {
      const timer = setTimeout(() => {
        dispatch(hideEncouragement());
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showEncouragement, dispatch]);
  if (isLoading && !localStorage.getItem('user')) {
    return <Loader />;
  }
  if (localStorage.getItem('user') && !isInitialized) {
    return <Loader />;
  }
  return (
    <>
      {token && user && <Navbar />}
      {showEncouragement && (
        <div className="encouragement-toast show">
          {encouragementMessage}
        </div>
      )}
      <Routes>
        <Route path="/login" element={!token ? <Login /> : <Navigate to="/" />} />
        <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/projects" element={<PrivateRoute><Projects /></PrivateRoute>} />
        <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
      </Routes>
    </>
  );
}
export default App;
