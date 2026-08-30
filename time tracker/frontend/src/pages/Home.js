// src/pages/Home.js
import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  fetchProjects, 
  addTimeEntry, 
  fetchTimeEntries,
  setProjects,
  setTimeEntries,
  showEncouragement,
  subscribeToProjects,
  subscribeToTimeEntries
} from '../store';
import Loader from '../components/Loader';
import { db, doc, updateDoc } from '../firebase';
const Home = () => {
  const dispatch = useDispatch();
  const { items: projects, isLoading: projectsLoading } = useSelector(state => state.projects);
  const { items: entries } = useSelector(state => state.timeEntries);
  const { user, isInitialized } = useSelector(state => state.auth);
  const { theme } = useSelector(state => state.ui); // 🔥 Получаем тему
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedProjectObj, setSelectedProjectObj] = useState(null);
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [todayEntries, setTodayEntries] = useState([]);
  const [todayTotal, setTodayTotal] = useState(0);
  const dropdownRef = useRef(null);
  const timerIntervalRef = useRef(null);
  useEffect(() => {
    const loadData = async () => {
      if (user && isInitialized) {
        try {
          const savedProjects = localStorage.getItem('projects');
          if (savedProjects) {
            try {
              const parsed = JSON.parse(savedProjects);
              if (parsed && parsed.length > 0) {
                dispatch(setProjects(parsed));
              }
            } catch (e) {
              console.error('Error parsing saved projects:', e);
            }
          }
          
          await Promise.all([
            dispatch(fetchProjects()).unwrap(),
            dispatch(fetchTimeEntries()).unwrap()
          ]);
          setLoading(false);
        } catch (error) {
          console.error('Error loading data:', error);
          setLoading(false);
        }
      }
    };
    loadData();
  }, [dispatch, user, isInitialized]);
  useEffect(() => {
    if (!user || !isInitialized) return;
    const unsubscribeProjects = subscribeToProjects(user.id, (projects) => {
      dispatch(setProjects(projects));
      localStorage.setItem('projects', JSON.stringify(projects));
      setLoading(false);
    });
    const unsubscribeEntries = subscribeToTimeEntries(user.id, null, (entries) => {
      dispatch(setTimeEntries(entries));
      localStorage.setItem('timeEntries', JSON.stringify(entries));
    });
    return () => {
      unsubscribeProjects();
      unsubscribeEntries();
    };
  }, [user, isInitialized, dispatch]);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEntries = entries.filter(entry => {
      const entryDate = new Date(entry.startTime);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === today.getTime();
    });
    setTodayEntries(todayEntries);
    const total = todayEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
    setTodayTotal(total);
  }, [entries]);
  const filteredProjects = projects.filter(project => {
    if (!searchQuery || searchQuery.trim() === '') {
      return true;
    }
    const query = searchQuery.toLowerCase().trim();
    const projectName = (project.name || '').toLowerCase();
    const projectDescription = (project.description || '').toLowerCase();
    return projectName.includes(query) || projectDescription.includes(query);
  });
  const handleSelectProject = (project) => {
    setSelectedProject(project.id);
    setSelectedProjectObj(project);
    setIsDropdownOpen(false);
    setSearchQuery('');
  };
  const toggleTimer = async () => {
    if (!selectedProject) {
      dispatch(showEncouragement('Выберите проект!'));
      return;
    }
    if (isRunning) {
      setIsRunning(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      const endTime = new Date().toISOString();
      const duration = Math.round(time / 60);
      if (duration > 0) {
        try {
          await dispatch(addTimeEntry({
            projectId: selectedProject,
            startTime: startTime,
            endTime: endTime,
            duration: duration,
            note: ''
          })).unwrap();
          const projectRef = doc(db, 'projects', selectedProject);
          await updateDoc(projectRef, {
            lastActivity: new Date().toISOString()
          });
          const messages = [
            'Отлично! Ты справился! 🎉',
            'Время зачтено! Продолжай в том же духе! 💪',
            'Отличная работа! Ты молодец! ⭐',
            'Ещё один шаг к цели! 🚀'
          ];
          dispatch(showEncouragement(messages[Math.floor(Math.random() * messages.length)]));
        } catch (error) {
          console.error('Ошибка сохранения времени:', error);
          dispatch(showEncouragement('Ошибка сохранения! Попробуйте снова'));
        }
      }
      setTime(0);
      setStartTime(null);
    } else {
      setIsRunning(true);
      setStartTime(new Date().toISOString());
      
      timerIntervalRef.current = setInterval(() => {
        setTime(prev => prev + 1);
      }, 1000);
    }
  };
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };
  const getProjectColor = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.color : '#64748b';
  };
  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : 'Удаленный проект';
  };
  const getEntriesByProject = () => {
    const grouped = {};
    todayEntries.forEach(entry => {
      if (!grouped[entry.projectId]) {
        grouped[entry.projectId] = {
          projectId: entry.projectId,
          total: 0,
          entries: []
        };
      }
      grouped[entry.projectId].total += entry.duration || 0;
      grouped[entry.projectId].entries.push(entry);
    });
    return Object.values(grouped).sort((a, b) => b.total - a.total);
  };
  const isDark = theme === 'dark';
  const colors = {
    text: isDark ? '#e8eaed' : '#1e293b',
    textSecondary: isDark ? '#9aa0a6' : '#64748b',
    background: isDark ? '#303134' : '#ffffff',
    backgroundHover: isDark ? '#3c4043' : '#f1f5f9',
    border: isDark ? '#3c4043' : '#e2e8f0',
    inputBackground: isDark ? '#202124' : '#ffffff',
    inputText: isDark ? '#e8eaed' : '#1e293b',
    cardBackground: isDark ? '#303134' : '#ffffff',
    placeholder: isDark ? '#9aa0a6' : '#94a3b8',
    dropdownBackground: isDark ? '#303134' : '#ffffff',
    dropdownText: isDark ? '#e8eaed' : '#1e293b',
    dropdownBorder: isDark ? '#3c4043' : '#e2e8f0',
    selectedBackground: isDark ? '#1a73e833' : '#f1f5f9',
  };

  if (loading || projectsLoading) {
    return <Loader />;
  }

  return (
    <div className="container">
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        {/* Приветствие */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '600', color: colors.text }}>
            Привет, {user?.username || 'Пользователь'}! 👋
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
            Сегодня ты отработал <strong style={{ color: colors.text }}>{formatTime(todayTotal * 60)}</strong>
          </p>
        </div>

        {/* Основной блок таймера */}
        <div className="card" style={{ 
          textAlign: 'center', 
          padding: '32px 24px', 
          position: 'relative',
          background: colors.cardBackground,
          borderColor: colors.border
        }}>
          <div style={{ 
            fontSize: '56px', 
            fontWeight: '700', 
            marginBottom: '16px', 
            fontVariantNumeric: 'tabular-nums',
            color: colors.text
          }}>
            {formatTime(time)}
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <div 
              style={{ 
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '20px',
                background: selectedProjectObj ? selectedProjectObj.color : (isDark ? '#3c4043' : '#e2e8f0'),
                color: selectedProjectObj ? '#fff' : colors.textSecondary,
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {selectedProjectObj ? selectedProjectObj.name : 'Не выбран проект'}
            </div>
          </div>

          <button
            className={`btn ${isRunning ? 'btn-danger' : 'btn-primary'}`}
            onClick={toggleTimer}
            disabled={!selectedProject && !isRunning}
            style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%',
              fontSize: '28px',
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isRunning ? '⏹' : '▶'}
          </button>

          {/* Выбор проекта */}
          <div 
            ref={dropdownRef} 
            style={{ 
              position: 'relative', 
              zIndex: 1000,
              marginTop: '8px'
            }}
          >
            <div 
              onClick={() => {
                if (!isRunning) {
                  setIsDropdownOpen(!isDropdownOpen);
                  if (!isDropdownOpen) {
                    setSearchQuery('');
                  }
                }
              }}
              style={{
                padding: '10px 16px',
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                cursor: isRunning ? 'default' : 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: colors.inputBackground,
                opacity: isRunning ? 0.6 : 1
              }}
            >
              <span style={{ color: selectedProjectObj ? colors.text : colors.textSecondary }}>
                {selectedProjectObj ? selectedProjectObj.name : 'Выберите проект...'}
              </span>
              <span style={{ color: colors.textSecondary }}>▼</span>
            </div>

            {/* Дропдаун поверх всех элементов */}
            {isDropdownOpen && !isRunning && (
              <>
                <div 
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 999,
                    background: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)'
                  }}
                  onClick={() => setIsDropdownOpen(false)}
                />
                
                <div style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '90%',
                  maxWidth: '440px',
                  maxHeight: '70vh',
                  background: colors.dropdownBackground,
                  borderRadius: '12px',
                  boxShadow: isDark 
                    ? '0 20px 60px rgba(0,0,0,0.5)' 
                    : '0 20px 60px rgba(0,0,0,0.3)',
                  zIndex: 1000,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  border: `1px solid ${colors.border}`
                }}>
                  <div style={{
                    padding: '16px 20px',
                    borderBottom: `1px solid ${colors.border}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '18px', fontWeight: '600', color: colors.text }}>Выберите проект</span>
                    <button
                      onClick={() => setIsDropdownOpen(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '24px',
                        cursor: 'pointer',
                        color: colors.textSecondary,
                        padding: '0 8px'
                      }}
                    >
                      ×
                    </button>
                  </div>
                  
                  <div style={{ padding: '12px 20px', borderBottom: `1px solid ${colors.border}` }}>
                    <input
                      type="text"
                      placeholder="Поиск проекта..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                        outline: 'none',
                        fontSize: '15px',
                        boxSizing: 'border-box',
                        color: colors.inputText,
                        background: colors.inputBackground
                      }}
                      autoFocus
                    />
                  </div>
                  
                  <div style={{
                    padding: '8px 0',
                    overflowY: 'auto',
                    flex: 1
                  }}>
                    {projects.length === 0 ? (
                      <div style={{ padding: '30px 20px', color: colors.textSecondary, textAlign: 'center' }}>
                        Нет проектов. Создайте первый!
                      </div>
                    ) : filteredProjects.length === 0 ? (
                      <div style={{ padding: '30px 20px', color: colors.textSecondary, textAlign: 'center' }}>
                        Проекты не найдены
                      </div>
                    ) : (
                      filteredProjects.map(project => (
                        <div
                          key={project.id}
                          onClick={() => handleSelectProject(project)}
                          style={{
                            padding: '12px 20px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            transition: 'background 0.15s',
                            color: colors.dropdownText
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = colors.selectedBackground}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <span style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            background: project.color || '#4361ee',
                            flexShrink: 0
                          }} />
                          <span style={{ flex: 1, fontSize: '15px', color: colors.dropdownText }}>{project.name}</span>
                          {selectedProject === project.id && (
                            <span style={{ color: '#4361ee', fontWeight: 'bold', fontSize: '18px' }}>✓</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Статистика за сегодня */}
        {todayEntries.length > 0 && (
          <div className="card" style={{ 
            marginTop: '16px',
            background: colors.cardBackground,
            borderColor: colors.border
          }}>
            <h3 style={{ 
              marginBottom: '16px', 
              fontSize: '16px', 
              fontWeight: '600', 
              color: colors.text 
            }}>
              Сегодняшние записи
            </h3>
            
            {getEntriesByProject().map(group => (
              <div key={group.projectId} style={{ marginBottom: '12px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: getProjectColor(group.projectId)
                    }} />
                    <span style={{ fontWeight: '500', color: colors.text }}>
                      {getProjectName(group.projectId)}
                    </span>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>
                    {formatTime(group.total * 60)}
                  </span>
                </div>
                <div style={{ 
                  height: '4px',
                  background: isDark ? '#3c4043' : '#e2e8f0',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${(group.total / todayTotal) * 100}%`,
                    background: getProjectColor(group.projectId),
                    transition: 'width 0.3s'
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {}
        {projects.length > 0 && (
          <div className="card" style={{ 
            marginTop: '16px',
            background: colors.cardBackground,
            borderColor: colors.border
          }}>
            <h3 style={{ 
              marginBottom: '12px', 
              fontSize: '16px', 
              fontWeight: '600', 
              color: colors.text 
            }}>
              Быстрый старт
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {projects.slice(0, 4).map(project => {
                const isSelected = selectedProject === project.id;
                return (
                  <button
                    key={project.id}
                    onClick={() => {
                      setSelectedProject(project.id);
                      setSelectedProjectObj(project);
                    }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: isSelected 
                        ? `2px solid ${project.color || '#4361ee'}` 
                        : `1px solid ${colors.border}`,
                      background: isSelected 
                        ? project.color || '#4361ee' 
                        : isDark ? '#3c4043' : '#f8fafc',
                      color: isSelected 
                        ? '#ffffff' 
                        : colors.text,
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: isSelected ? '600' : '500',
                      transition: 'all 0.2s',
                      boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = isDark ? '#4a4d52' : '#f1f5f9';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = isDark ? '#3c4043' : '#f8fafc';
                      }
                    }}
                  >
                    {project.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default Home;