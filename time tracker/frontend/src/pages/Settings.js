import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateUser, deleteAccount, setTheme } from '../store';
import Loader from '../components/Loader';
import { useNavigate } from 'react-router-dom';
const Settings = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isLoading } = useSelector(state => state.auth);
  const { theme } = useSelector(state => state.ui);
  const [username, setUsername] = useState('');
  useEffect(() => {
    if (user) {
      setUsername(user.username);
    }
  }, [user]);
  const handleUpdateTheme = async (newTheme) => {
    dispatch(setTheme(newTheme));
    await dispatch(updateUser({ username, theme: newTheme }));
  };
  const handleUpdateUsername = async () => {
    if (username.trim()) {
      await dispatch(updateUser({ username, theme }));
    }
  };
  const handleDeleteAccount = async () => {
    if (window.confirm('Вы уверены? Все данные будут удалены безвозвратно!')) {
      await dispatch(deleteAccount());
      navigate('/login');
    }
  };
  if (isLoading) return <Loader />;
  return (
    <div className="container">
      <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '24px' }}>Настройки</h1>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Имя пользователя</label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <button className="btn btn-primary" onClick={handleUpdateUsername}>
              Сохранить
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Тема оформления</label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className={`btn ${theme === 'light' ? 'btn-primary' : ''}`}
              onClick={() => handleUpdateTheme('light')}
            >
              Светлая
            </button>
            <button 
              className={`btn ${theme === 'dark' ? 'btn-primary' : ''}`}
              onClick={() => handleUpdateTheme('dark')}
            >
              Тёмная
            </button>
          </div>
        </div>

        <hr style={{ margin: '24px 0', borderColor: '#e2e8f0' }} />

        <div>
          <h3 style={{ marginBottom: '8px', color: '#ef476f', fontSize: '18px', fontWeight: '600' }}>Опасная зона</h3>
          <p style={{ marginBottom: '16px', fontSize: '14px', color: '#64748b' }}>
            Удаление аккаунта приведет к безвозвратной потере всех данных.
          </p>
          <button className="btn btn-danger" onClick={handleDeleteAccount}>
            Удалить аккаунт
          </button>
        </div>
      </div>
    </div>
  );
};
export default Settings;