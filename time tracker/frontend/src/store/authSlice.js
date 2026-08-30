import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { 
  auth,
  db,
  doc,
  getDoc,
  setDoc,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from '../firebase';
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data() || {};
      return {
        id: user.uid,
        username: userData.username || user.email?.split('@')[0] || 'User',
        email: user.email,
        theme: userData.theme || 'light',
        avatar: userData.avatar || ''
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
export const register = createAsyncThunk(
  'auth/register',
  async ({ username, email, password }, { rejectWithValue }) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await setDoc(doc(db, 'users', user.uid), {
        username,
        email,
        theme: 'light',
        avatar: '',
        createdAt: new Date().toISOString()
      });
      return {
        id: user.uid,
        username,
        email,
        theme: 'light',
        avatar: ''
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
export const logout = createAsyncThunk(
  'auth/logout',
  async () => {
    await signOut(auth);
    return {};
  }
);
export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async () => {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        unsubscribe();
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data() || {};
          const userDataToReturn = {
            id: user.uid,
            username: userData.username || user.email?.split('@')[0] || 'User',
            email: user.email,
            theme: userData.theme || 'light',
            avatar: userData.avatar || ''
          };
          localStorage.setItem('user', JSON.stringify(userDataToReturn));
          resolve(userDataToReturn);
        } else {
          localStorage.removeItem('user');
          resolve(null);
        }
      });
    });
  }
);
export const updateUser = createAsyncThunk(
  'auth/updateUser',
  async ({ username, theme }, { getState, rejectWithValue }) => {
    try {
      const { user } = getState().auth;
      if (!user) throw new Error('Пользователь не найден');
      await setDoc(doc(db, 'users', user.id), {
        username,
        theme,
        email: user.email,
        avatar: user.avatar || ''
      }, { merge: true });
      const updatedUser = { ...user, username, theme };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return { username, theme };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
export const deleteAccount = createAsyncThunk(
  'auth/deleteAccount',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { user } = getState().auth;
      if (!user) throw new Error('Пользователь не найден');
      await setDoc(doc(db, 'users', user.id), { deleted: true }, { merge: true });
      await signOut(auth);
      localStorage.removeItem('user');
      return {};
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    isLoading: false,
    isInitialized: false,
    error: null
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.token = action.payload ? 'firebase-token' : null;
      if (action.payload) {
        localStorage.setItem('user', JSON.stringify(action.payload));
      } else {
        localStorage.removeItem('user');
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    restoreUser: (state) => {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          state.user = JSON.parse(savedUser);
          state.token = 'firebase-token';
        } catch (e) {
          localStorage.removeItem('user');
        }
      }
    },
    setInitialized: (state) => {
      state.isInitialized = true;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.token = 'firebase-token';
        state.error = null;
        state.isInitialized = true;
        localStorage.setItem('user', JSON.stringify(action.payload));
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.isInitialized = true;
      })
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.token = 'firebase-token';
        state.error = null;
        state.isInitialized = true;
        localStorage.setItem('user', JSON.stringify(action.payload));
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.isInitialized = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.error = null;
        state.isInitialized = true;
        localStorage.removeItem('user');
      })
      .addCase(getCurrentUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.token = action.payload ? 'firebase-token' : null;
        state.isInitialized = true;
        if (action.payload) {
          localStorage.setItem('user', JSON.stringify(action.payload));
        } else {
          localStorage.removeItem('user');
        }
      })
      .addCase(getCurrentUser.rejected, (state) => {
        state.isLoading = false;
        state.isInitialized = true;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        if (state.user) {
          state.user.username = action.payload.username;
          state.user.theme = action.payload.theme;
          localStorage.setItem('user', JSON.stringify(state.user));
        }
      })
      .addCase(deleteAccount.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isInitialized = true;
        localStorage.removeItem('user');
      });
  }
});
export const { setUser, clearError, restoreUser, setInitialized } = authSlice.actions;
export default authSlice.reducer;