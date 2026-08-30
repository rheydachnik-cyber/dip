import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store';
const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector(state => state.auth);
  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };
  const navItems = [
    { path: '/', label: 'Главная' },
    { path: '/projects', label: 'Проекты' },
    { path: '/analytics', label: 'Аналитика' },
    { path: '/settings', label: 'Настройки' },
  ];
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <Link to="/" className="brand-link">
            <span className="brand-text">TimeTracker</span>
          </Link>
        </div>
        
        <div className="navbar-menu">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`navbar-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        
        {user && (
          <div className="navbar-user">
            <div className="user-info">
              <span className="user-avatar">
                {user.username?.[0]?.toUpperCase() || 'U'}
              </span>
              <span className="user-name">{user.username}</span>
            </div>
            <button onClick={handleLogout} className="logout-btn">
              Выйти
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};
export default Navbar;