import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import projectsReducer from './projectSlice';
import timeEntriesReducer from './timeEntriesSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    projects: projectsReducer,
    timeEntries: timeEntriesReducer,
    ui: uiReducer,
  },
});
export * from './authSlice';
export * from './projectSlice';
export * from './timeEntriesSlice';
export * from './uiSlice';
