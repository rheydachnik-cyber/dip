// src/pages/Login.js
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login, register, clearError } from '../store';
const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token, error } = useSelector(state => state.auth);
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  useEffect(() => {
    if (token) {
      navigate('/');
    }
  }, [token, navigate]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLogin) {
      await dispatch(login({ email: formData.email, password: formData.password }));
    } else {
      await dispatch(register({ username: formData.username, email: formData.email, password: formData.password }));
    }
  };
  return (
    <div className="container">
      <div className="card" style={{ maxWidth: '400px', margin: '50px auto' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '24px', fontSize: '28px', fontWeight: '600' }}>
          {isLogin ? 'Вход' : 'Регистрация'}
        </h1>
        
        {error && (
          <div style={{ 
            background: '#fce8e6', 
            color: '#d93025', 
            padding: '12px', 
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Имя пользователя</label>
              <input
                type="text"
                className="input"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                required
              />
            </div>
          )}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Email</label>
            <input
              type="email"
              className="input"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Пароль</label>
            <input
              type="password"
              className="input"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
              minLength="6"
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            {isLogin ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>
        <button 
          className="btn" 
          onClick={() => {
            setIsLogin(!isLogin);
            dispatch(clearError());
          }} 
          style={{ marginTop: '12px', width: '100%' }}
        >
          {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
        </button>
      </div>
    </div>
  );
};
export default Login;