import React from 'react';
import { useSelector } from 'react-redux';
import Loader from './Loader';
const LoadingWrapper = ({ children }) => {
  const { isLoading: authLoading } = useSelector(state => state.auth);
  const { isLoading: projectsLoading } = useSelector(state => state.projects);
  const { isLoading: entriesLoading } = useSelector(state => state.timeEntries);
  if (authLoading || projectsLoading || entriesLoading) {
    return <Loader />;
  }
  return children;
};
export default LoadingWrapper;