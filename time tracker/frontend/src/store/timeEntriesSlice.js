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
export const fetchTimeEntries = createAsyncThunk(
  'timeEntries/fetch',
  async (filters = {}, { getState, rejectWithValue }) => {
    try {
      const { user } = getState().auth;
      if (!user) return [];
      let q = query(
        collection(db, 'timeEntries'),
        where('userId', '==', user.id),
        orderBy('startTime', 'desc')
      );
      if (filters.projectId && filters.projectId !== 'all') {
        q = query(q, where('projectId', '==', filters.projectId));
      }
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        startDate.setHours(0, 0, 0, 0);
        q = query(q, where('startTime', '>=', startDate.toISOString()));
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        q = query(q, where('startTime', '<=', endDate.toISOString()));
      }
      const snapshot = await getDocs(q);
      const entries = [];
      snapshot.forEach((doc) => {
        entries.push({ id: doc.id, ...doc.data() });
      });
      return entries;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
export const addTimeEntry = createAsyncThunk(
  'timeEntries/add',
  async (entryData, { getState, rejectWithValue }) => {
    try {
      const { user } = getState().auth;
      const newEntry = {
        projectId: entryData.projectId,
        userId: user.id,
        startTime: entryData.startTime,
        endTime: entryData.endTime,
        duration: entryData.duration || 0,
        note: entryData.note || '',
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, 'timeEntries'), newEntry);
      if (entryData.projectId) {
        const projectRef = doc(db, 'projects', entryData.projectId);
        await updateDoc(projectRef, {
          lastActivity: new Date().toISOString()
        });
      }
      return { id: docRef.id, ...newEntry };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
export const updateTimeEntry = createAsyncThunk(
  'timeEntries/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const docRef = doc(db, 'timeEntries', id);
      await updateDoc(docRef, data);
      return { id, ...data };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
export const deleteTimeEntry = createAsyncThunk(
  'timeEntries/delete',
  async (id, { rejectWithValue }) => {
    try {
      await deleteDoc(doc(db, 'timeEntries', id));
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
export const subscribeToTimeEntries = (userId, projectId, callback) => {
  let q = query(
    collection(db, 'timeEntries'),
    where('userId', '==', userId),
    orderBy('startTime', 'desc')
  );
  if (projectId && projectId !== 'all') {
    q = query(q, where('projectId', '==', projectId));
  }
  return onSnapshot(q, (snapshot) => {
    const entries = [];
    snapshot.forEach((doc) => {
      entries.push({ id: doc.id, ...doc.data() });
    });
    callback(entries);
  });
};
const timeEntriesSlice = createSlice({
  name: 'timeEntries',
  initialState: {
    items: [],
    isLoading: false,
    error: null
  },
  reducers: {
    setTimeEntries: (state, action) => {
      state.items = action.payload;
    },
    clearTimeEntries: (state) => {
      state.items = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTimeEntries.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTimeEntries.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchTimeEntries.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(addTimeEntry.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateTimeEntry.fulfilled, (state, action) => {
        const index = state.items.findIndex(e => e.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...action.payload };
        }
      })
      .addCase(deleteTimeEntry.fulfilled, (state, action) => {
        state.items = state.items.filter(e => e.id !== action.payload);
      });
  }
});
export const { setTimeEntries, clearTimeEntries } = timeEntriesSlice.actions;
export default timeEntriesSlice.reducer;