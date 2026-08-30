import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { 
  db,
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot
} from '../firebase';
export const fetchProjects = createAsyncThunk(
  'projects/fetch',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { user } = getState().auth;
      if (!user) return [];
      const q = query(
        collection(db, 'projects'),
        where('userId', '==', user.id),
        orderBy('lastActivity', 'desc')
      );
      const snapshot = await getDocs(q);
      const projects = [];
      snapshot.forEach((doc) => {
        projects.push({ id: doc.id, ...doc.data() });
      });
      return projects;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
export const createProject = createAsyncThunk(
  'projects/create',
  async (projectData, { getState, rejectWithValue }) => {
    try {
      const { user } = getState().auth;
      const newProject = {
        name: projectData.name,
        color: projectData.color || '#4361ee',
        description: projectData.description || '',
        userId: user.id,
        completed: false,
        completedAt: null,
        deadline: projectData.deadline || null,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, 'projects'), newProject);
      return { id: docRef.id, ...newProject };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
export const updateProject = createAsyncThunk(
  'projects/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const docRef = doc(db, 'projects', id);
      await updateDoc(docRef, {
        ...data,
        lastActivity: new Date().toISOString()
      });
      return { id, ...data };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
export const deleteProject = createAsyncThunk(
  'projects/delete',
  async (id, { rejectWithValue }) => {
    try {
      await deleteDoc(doc(db, 'projects', id));
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
export const completeProject = createAsyncThunk(
  'projects/complete',
  async ({ id, completed, completedAt }, { rejectWithValue }) => {
    try {
      const docRef = doc(db, 'projects', id);
      await updateDoc(docRef, {
        completed,
        completedAt: completedAt || null
      });
      return { id, completed };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
export const subscribeToProjects = (userId, callback) => {
  const q = query(
    collection(db, 'projects'),
    where('userId', '==', userId),
    orderBy('lastActivity', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const projects = [];
    snapshot.forEach((doc) => {
      projects.push({ id: doc.id, ...doc.data() });
    });
    callback(projects);
  });
};
const projectsSlice = createSlice({
  name: 'projects',
  initialState: {
    items: [],
    isLoading: false,
    error: null
  },
  reducers: {
    setProjects: (state, action) => {
      state.items = action.payload;
    },
    clearProjects: (state) => {
      state.items = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        const index = state.items.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...action.payload };
        }
      })
      .addCase(completeProject.fulfilled, (state, action) => {
        const index = state.items.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...action.payload };
        }
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.items = state.items.filter(p => p.id !== action.payload);
      });
  }
});
export const { setProjects, clearProjects } = projectsSlice.actions;
export default projectsSlice.reducer;