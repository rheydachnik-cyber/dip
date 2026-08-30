import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchTimeEntries, fetchProjects } from '../store';
import Loader from '../components/Loader';
const Analytics = () => {
  const dispatch = useDispatch();
  const { items: entries, isLoading: entriesLoading } = useSelector(state => state.timeEntries);
  const { items: projects } = useSelector(state => state.projects);
  const getCurrentMonthStart = () => {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
  };
  const getToday = () => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  };
  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const [filters, setFilters] = useState({ 
    startDate: formatDateForInput(getCurrentMonthStart()), 
    endDate: formatDateForInput(getToday()), 
    projectId: 'all' 
  });
  const [filteredEntries, setFilteredEntries] = useState([]);
  useEffect(() => {
    dispatch(fetchProjects());
    dispatch(fetchTimeEntries());
  }, [dispatch]);
  useEffect(() => {
    let filtered = [...entries];
    if (filters.projectId && filters.projectId !== 'all') {
      filtered = filtered.filter(e => {
        const entryProjectId = typeof e.projectId === 'object' ? e.projectId.id : e.projectId;
        return entryProjectId === filters.projectId;
      });
    }
    if (filters.startDate) {
      const startDateTime = new Date(filters.startDate);
      startDateTime.setHours(0, 0, 0, 0);
      filtered = filtered.filter(e => {
        const entryDate = new Date(e.startTime);
        entryDate.setHours(0, 0, 0, 0);
        return entryDate >= startDateTime;
      });
    }
    if (filters.endDate) {
      const endDateTime = new Date(filters.endDate);
      endDateTime.setHours(23, 59, 59, 999);
      filtered = filtered.filter(e => {
        const entryDate = new Date(e.startTime);
        return entryDate <= endDateTime;
      });
    }
    setFilteredEntries(filtered);
  }, [entries, filters]);
  const getProjectInfo = (entry) => {
    if (entry.projectId && typeof entry.projectId === 'object') {
      return { name: entry.projectId.name || 'Без проекта', color: entry.projectId.color || '#94a3b8' };
    }
    if (entry.projectId && typeof entry.projectId === 'string') {
      const project = projects.find(p => p.id === entry.projectId);
      return { name: project?.name || 'Без проекта', color: project?.color || '#94a3b8' };
    }
    return { name: 'Без проекта', color: '#94a3b8' };
  };
  const getTotalTime = () => {
    const totalSeconds = filteredEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours} ч ${minutes} мин`;
  };
  const getProjectStats = () => {
    const stats = {};
    filteredEntries.forEach(entry => {
      const { name: projectName, color: projectColor } = getProjectInfo(entry);
      if (!stats[projectName]) {
        stats[projectName] = { name: projectName, duration: 0, color: projectColor };
      }
      stats[projectName].duration += entry.duration || 0;
    });
    return Object.values(stats).sort((a, b) => b.duration - a.duration);
  };
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours} ч ${minutes} мин`;
  };
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  if (entriesLoading) return <Loader />;
  const projectStats = getProjectStats();
  const totalTime = filteredEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
  return (
    <div className="container">
      <h1 className="page-title">Аналитика</h1>
      
      <div className="card stats-card">
        <div className="stats-header">
          <h3 className="card-title">Статистика</h3>
          <div className="stats-filter">
            <div className="filter-group">
              <label>С</label>
              <input
                type="date"
                className="filter-input"
                value={filters.startDate}
                onChange={(e) => setFilters({...filters, startDate: e.target.value})}
              />
            </div>
            <div className="filter-group">
              <label>По</label>
              <input
                type="date"
                className="filter-input"
                value={filters.endDate}
                onChange={(e) => setFilters({...filters, endDate: e.target.value})}
              />
            </div>
            <div className="filter-group">
              <label>Проект</label>
              <select
                className="filter-select"
                value={filters.projectId}
                onChange={(e) => setFilters({...filters, projectId: e.target.value})}
              >
                <option value="all">Все проекты</option>
                {projects.filter(p => !p.completed).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div className="total-time-card">
          <div className="total-time-label">Общее время</div>
          <div className="total-time-value">{getTotalTime()}</div>
          <div className="total-time-period">
            {formatDate(filters.startDate)} — {formatDate(filters.endDate)}
          </div>
        </div>

        <div className="project-stats">
          <h4 className="stats-subtitle">Распределение по проектам</h4>
          {projectStats.length > 0 ? (
            projectStats.map(stat => (
              <div key={stat.name} className="stat-item">
                <div className="stat-header">
                  <div className="stat-info">
                    <span className="stat-color" style={{ backgroundColor: stat.color }}></span>
                    <span className="stat-name">{stat.name}</span>
                  </div>
                  <span className="stat-duration">{formatTime(stat.duration)}</span>
                </div>
                <div className="stat-bar-container">
                  <div 
                    className="stat-bar" 
                    style={{ 
                      width: `${(stat.duration / (totalTime || 1)) * 100}%`, 
                      backgroundColor: stat.color 
                    }}
                  ></div>
                </div>
              </div>
            ))
          ) : (
            <p className="empty-stats">Нет данных за выбранный период</p>
          )}
        </div>
      </div>

      <div className="card entries-table-container">
        <h3 className="card-title">Детализация по дням</h3>
        <table className="entries-table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Проект</th>
              <th>Время</th>
              <th>Длительность</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.slice(0, 20).map(entry => {
              const { name: projectName, color: projectColor } = getProjectInfo(entry);
              const startDate = new Date(entry.startTime);
              const endDate = new Date(entry.endTime);
              return (
                <tr key={entry.id}>
                  <td>{startDate.toLocaleDateString('ru-RU')}</td>
                  <td>
                    <div className="project-cell">
                      <span className="project-dot-small" style={{ backgroundColor: projectColor }}></span>
                      {projectName}
                    </div>
                  </td>
                  <td>
                    {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — 
                    {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="duration-cell">{formatTime(entry.duration)}</td>
                </tr>
              );
            })}
            {filteredEntries.length === 0 && (
              <tr>
                <td colSpan="4" className="empty-row">Нет записей</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default Analytics;
