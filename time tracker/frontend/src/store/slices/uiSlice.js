import { createSlice } from '@reduxjs/toolkit';
const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    theme: localStorage.getItem('theme') || 'light',
    isLoading: false,
    showEncouragement: false,
    encouragementMessage: '',
  },
  reducers: {
    setTheme: (state, action) => {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
      document.body.className = action.payload;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    showEncouragement: (state, action) => {
      state.showEncouragement = true;
      state.encouragementMessage = action.payload;
    },
    hideEncouragement: (state) => {
      state.showEncouragement = false;
      state.encouragementMessage = '';
    },
  },
});
export const { setTheme, setLoading, showEncouragement, hideEncouragement } = uiSlice.actions;
export default uiSlice.reducer;