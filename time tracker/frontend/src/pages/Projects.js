import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  fetchProjects, 
  createProject, 
  deleteProject, 
  updateProject, 
  completeProject,
  subscribeToProjects,
  setProjects,
  showEncouragement 
} from '../store';
import Loader from '../components/Loader';
const Projects = () => {
  const dispatch = useDispatch();
  const { items: projects, isLoading } = useSelector(state => state.projects);
  const { user } = useSelector(state => state.auth);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sortBy, setSortBy] = useState('deadline');
  const [sortOrder, setSortOrder] = useState('asc');
  const [viewMode, setViewMode] = useState('table');
  const [newProject, setNewProject] = useState({ 
    name: '', 
    color: '#4361ee', 
    description: '',
    deadline: '' 
  });
  useEffect(() => {
    if (user) {
      const savedProjects = localStorage.getItem('projects');
      if (savedProjects) {
        try {
          const parsed = JSON.parse(savedProjects);
          if (parsed.length > 0) {
            dispatch(setProjects(parsed));
          }
        } catch (e) {
          console.error('Error parsing saved projects:', e);
        }
      }
      dispatch(fetchProjects());
    }
  }, [dispatch, user]);
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToProjects(user.id, (projects) => {
      dispatch(setProjects(projects));
      localStorage.setItem('projects', JSON.stringify(projects));
    });
    return () => unsubscribe();
  }, [user, dispatch]);
  const sortedProjects = useMemo(() => {
    const sorted = [...projects];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'deadline':
          if (!a.deadline && !b.deadline) comparison = 0;
          else if (!a.deadline) comparison = 1;
          else if (!b.deadline) comparison = -1;
          else comparison = new Date(a.deadline) - new Date(b.deadline);
          break;
        case 'status':
          const getStatusOrder = (p) => {
            if (p.completed) return 5;
            if (!p.deadline) return 0;
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const deadlineDate = new Date(p.deadline); deadlineDate.setHours(0, 0, 0, 0);
            if (deadlineDate < today) return 4;
            if (deadlineDate.getTime() === today.getTime()) return 1;
            const threeDaysLater = new Date(today); threeDaysLater.setDate(today.getDate() + 3);
            if (deadlineDate <= threeDaysLater) return 2;
            return 3;
          };
          comparison = getStatusOrder(a) - getStatusOrder(b);
          break;
        case 'created':
          comparison = new Date(a.createdAt) - new Date(b.createdAt);
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [projects, sortBy, sortOrder]);
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };
  const getSortIcon = (column) => {
    if (sortBy !== column) return '↕️';
    return sortOrder === 'asc' ? '↑' : '↓';
  };
  const getProjectStats = useCallback(() => {
    if (!projects.length) return { total: 0, completed: 0, active: 0, overdue: 0, today: 0, soon: 0 };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);
    const stats = {
      total: projects.length,
      completed: projects.filter(p => p.completed).length,
      active: projects.filter(p => !p.completed).length,
      overdue: 0,
      today: 0,
      soon: 0
    };
    projects.forEach(project => {
      if (project.completed) return;
      if (!project.deadline) return;
      const deadlineDate = new Date(project.deadline);
      deadlineDate.setHours(0, 0, 0, 0);
      if (deadlineDate < today) stats.overdue++;
      else if (deadlineDate.getTime() === today.getTime()) stats.today++;
      else if (deadlineDate > today && deadlineDate <= threeDaysLater) stats.soon++;
    });
    return stats;
  }, [projects]);
  const checkDeadlines = useCallback(() => {
    if (!projects.length) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);
    
    const newNotifications = [];
    
    projects.forEach(project => {
      if (project.completed) return;
      if (!project.deadline) return;
      
      const deadlineDate = new Date(project.deadline);
      deadlineDate.setHours(0, 0, 0, 0);
      
      if (deadlineDate < today) {
        const daysOverdue = Math.floor((today - deadlineDate) / (1000 * 60 * 60 * 24));
        newNotifications.push({
          id: project.id + '-overdue',
          type: 'overdue',
          title: 'Дедлайн просрочен',
          message: `Проект "${project.name}" просрочен на ${daysOverdue} ${getDaysWord(daysOverdue)}`,
          projectId: project.id
        });
      } else if (deadlineDate.getTime() === today.getTime()) {
        newNotifications.push({
          id: project.id + '-today',
          type: 'today',
          title: 'Дедлайн сегодня',
          message: `Сегодня последний день для проекта "${project.name}"`,
          projectId: project.id
        });
      } else if (deadlineDate > today && deadlineDate <= threeDaysLater) {
        const daysLeft = Math.floor((deadlineDate - today) / (1000 * 60 * 60 * 24));
        newNotifications.push({
          id: project.id + '-upcoming',
          type: 'upcoming',
          title: 'Приближается дедлайн',
          message: `До дедлайна проекта "${project.name}" осталось ${daysLeft} ${getDaysWord(daysLeft)}`,
          projectId: project.id
        });
      }
    });
    setNotifications(newNotifications);
    if (newNotifications.length > 0) {
      showToastNotification(newNotifications[0]);
    }
  }, [projects]);
  useEffect(() => {
    if (projects.length > 0) {
      checkDeadlines();
    }
  }, [projects, checkDeadlines]);
  const getDaysWord = (days) => {
    if (days === 1) return 'день';
    if (days >= 2 && days <= 4) return 'дня';
    return 'дней';
  };
  const showToastNotification = (notification) => {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${notification.type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <div class="toast-title">${notification.title}</div>
        <div class="toast-message">${notification.message}</div>
      </div>
      <button class="toast-close">×</button>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.onclick = () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      };
    }
    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }
    }, 5000);
  };
  const getEncouragementMessage = (projectName, completedCount) => {
    const messages = [
      `Отличная работа, ${user?.username || 'Пользователь'}! Проект "${projectName}" выполнен!`,
      `Поздравляю! "${projectName}" готов! Ты молодец!`,
      `Сила воли! "${projectName}" завершен! Продолжай в том же духе!`,
      `Еще один проект в копилку! "${projectName}" выполнен отлично!`,
      `Ты настоящий герой! "${projectName}" успешно завершен!`
    ];
    const milestoneMessages = {
      1: `У тебя уже ${completedCount} завершенный проект! Так держать!`,
      5: `Поздравляю! Ты завершил(а) ${completedCount} проектов! Это отличный результат!`,
      10: `Вау! ${completedCount} проектов позади! Ты настоящий профессионал!`,
      25: `Невероятно! ${completedCount} проектов завершено! Ты легенда!`
    };
    let message = messages[Math.floor(Math.random() * messages.length)];
    if (milestoneMessages[completedCount]) {
      message += ` ${milestoneMessages[completedCount]}`;
    }
    return message;
  };
  const handleComplete = async (project) => {
    if (project.completed) return;
    const currentStats = getProjectStats();
    const newCompletedCount = currentStats.completed + 1;
    const message = getEncouragementMessage(project.name, newCompletedCount);
    dispatch(showEncouragement(message));
    await dispatch(completeProject({ 
      id: project.id, 
      completed: true,
      completedAt: new Date().toISOString()
    }));
    
    dispatch(fetchProjects());
  };
  const handleCreate = async () => {
    if (newProject.name && newProject.name.trim()) {
      await dispatch(createProject({
        ...newProject,
        name: newProject.name.trim()
      }));
      setNewProject({ name: '', color: '#4361ee', description: '', deadline: '' });
      setShowForm(false);
    }
  };
  const handleUpdate = async () => {
    if (editingProject && editingProject.name && editingProject.name.trim()) {
      await dispatch(updateProject({ 
        id: editingProject.id, 
        data: {
          ...editingProject,
          name: editingProject.name.trim()
        } 
      }));
      setEditingProject(null);
    }
  };
  const handleDelete = async (id) => {
    if (window.confirm('Удалить проект?')) {
      await dispatch(deleteProject(id));
      setNotifications(notifications.filter(n => n.projectId !== id));
    }
  };
  const isDeadlineOverdue = (deadline) => {
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return deadlineDate < today;
  };
  const isDeadlineToday = (deadline) => {
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return deadlineDate.getTime() === today.getTime();
  };
  const isDeadlineSoon = (deadline) => {
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);
    return deadlineDate > today && deadlineDate <= threeDaysLater;
  };
  const getDeadlineClass = (deadline, completed) => {
    if (completed) return '';
    if (!deadline) return '';
    if (isDeadlineOverdue(deadline)) return 'deadline-overdue';
    if (isDeadlineToday(deadline)) return 'deadline-today';
    if (isDeadlineSoon(deadline)) return 'deadline-soon';
    return '';
  };
  const getDeadlineText = (deadline, completed) => {
    if (completed) return null;
    if (!deadline) return null;
    if (isDeadlineOverdue(deadline)) return 'overdue';
    if (isDeadlineToday(deadline)) return 'today';
    if (isDeadlineSoon(deadline)) return 'soon';
    return null;
  };
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
      return '—';
    }
  };
  const stats = getProjectStats();
  if (isLoading) return <Loader />;
  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Проекты</h1>
        <div className="header-actions">
          <div className="view-toggle">
            <button 
              className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Таблица"
            >
              ☰
            </button>
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Карточки"
            >
              ▦
            </button>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            + Новый проект
          </button>
        </div>
      </div>

      {/* Статистика проектов */}
      {projects.length > 0 && (
        <div className="projects-stats">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Всего проектов</div>
            </div>
            <div className="stat-card stat-success">
              <div className="stat-value">{stats.completed}</div>
              <div className="stat-label">Завершено</div>
            </div>
            <div className="stat-card stat-warning">
              <div className="stat-value">{stats.active}</div>
              <div className="stat-label">В работе</div>
            </div>
            {stats.overdue > 0 && (
              <div className="stat-card stat-danger">
                <div className="stat-value">{stats.overdue}</div>
                <div className="stat-label">Просрочено</div>
              </div>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <div className="card form-card">
          <h3 className="card-title">Новый проект</h3>
          <div className="form-group">
            <label className="form-label">Название</label>
            <input
              type="text"
              className="input"
              value={newProject.name}
              onChange={(e) => setNewProject({...newProject, name: e.target.value})}
              placeholder="Введите название проекта"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Цвет</label>
              <input
                type="color"
                className="input color-input"
                value={newProject.color}
                onChange={(e) => setNewProject({...newProject, color: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Дедлайн</label>
              <input
                type="date"
                className="input"
                value={newProject.deadline}
                onChange={(e) => setNewProject({...newProject, deadline: e.target.value})}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Описание</label>
            <textarea
              className="input"
              rows="3"
              value={newProject.description}
              onChange={(e) => setNewProject({...newProject, description: e.target.value})}
              placeholder="Описание проекта (необязательно)"
            />
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleCreate}>Сохранить</button>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Отмена</button>
          </div>
        </div>
      )}

      {editingProject && (
        <div className="card form-card">
          <h3 className="card-title">Редактировать проект</h3>
          <div className="form-group">
            <label className="form-label">Название</label>
            <input
              type="text"
              className="input"
              value={editingProject.name}
              onChange={(e) => setEditingProject({...editingProject, name: e.target.value})}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Цвет</label>
              <input
                type="color"
                className="input color-input"
                value={editingProject.color}
                onChange={(e) => setEditingProject({...editingProject, color: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Дедлайн</label>
              <input
                type="date"
                className="input"
                value={editingProject.deadline || ''}
                onChange={(e) => setEditingProject({...editingProject, deadline: e.target.value})}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Описание</label>
            <textarea
              className="input"
              rows="3"
              value={editingProject.description}
              onChange={(e) => setEditingProject({...editingProject, description: e.target.value})}
            />
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleUpdate}>Сохранить</button>
            <button className="btn btn-secondary" onClick={() => setEditingProject(null)}>Отмена</button>
          </div>
        </div>
      )}

      {viewMode === 'table' ? (
        <div className="card projects-table-container">
          <table className="projects-table">
            <thead>
              <tr>
                <th>Цвет</th>
                <th className={`sortable-header ${sortBy === 'name' ? 'active' : ''}`} onClick={() => handleSort('name')}>
                  Название <span className="sort-icon">{getSortIcon('name')}</span>
                </th>
                <th className={`sortable-header ${sortBy === 'deadline' ? 'active' : ''}`} onClick={() => handleSort('deadline')}>
                  Дедлайн <span className="sort-icon">{getSortIcon('deadline')}</span>
                </th>
                <th className={`sortable-header ${sortBy === 'status' ? 'active' : ''}`} onClick={() => handleSort('status')}>
                  Статус <span className="sort-icon">{getSortIcon('status')}</span>
                </th>
                <th>Описание</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {sortedProjects.map(project => {
                const deadlineClass = getDeadlineClass(project.deadline, project.completed);
                const deadlineText = getDeadlineText(project.deadline, project.completed);
                const isCompleted = project.completed;
                
                return (
                  <tr key={project.id} className={deadlineClass}>
                    <td className="color-cell">
                      <div className="color-preview" style={{ backgroundColor: project.color }}></div>
                    </td>
                    <td className="project-name">
                      {project.name}
                      {isCompleted && <span className="completed-badge">Выполнен</span>}
                    </td>
                    <td className="deadline-cell">
                      {project.deadline && (
                        <span className={`deadline-badge ${deadlineClass}`}>
                          {formatDate(project.deadline)}
                        </span>
                      )}
                      {!project.deadline && <span className="deadline-none">Не указан</span>}
                    </td>
                    <td className="status-cell">
                      {isCompleted ? (
                        <span className="status-badge status-completed">Выполнен</span>
                      ) : deadlineText ? (
                        <span className={`status-badge status-${deadlineText}`}>
                          {deadlineText === 'overdue' && 'Просрочен'}
                          {deadlineText === 'today' && 'Сегодня'}
                          {deadlineText === 'soon' && 'Скоро'}
                        </span>
                      ) : (
                        <span className="status-badge status-active">В работе</span>
                      )}
                    </td>
                    <td className="project-description">{project.description || '—'}</td>
                    <td className="actions-cell">
                      {!isCompleted && (
                        <button 
                          className="btn-icon btn-complete" 
                          onClick={() => handleComplete(project)}
                          title="Отметить выполненным"
                        >
                          ✓
                        </button>
                      )}
                      <button 
                        className="btn-icon btn-edit" 
                        onClick={() => setEditingProject(project)}
                        title="Редактировать"
                      >
                        ✎
                      </button>
                      <button 
                        className="btn-icon btn-delete" 
                        onClick={() => handleDelete(project.id)}
                        title="Удалить"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {projects.length === 0 && (
            <p className="empty-state">Нет проектов. Создайте первый!</p>
          )}
        </div>
      ) : (
        <div className="projects-grid">
          {sortedProjects.map(project => {
            const isCompleted = project.completed;
            const deadlineClass = getDeadlineClass(project.deadline, project.completed);
            
            return (
              <div key={project.id} className={`project-card ${deadlineClass}`}>
                <div className="project-card-header">
                  <div className="project-card-color" style={{ backgroundColor: project.color }}></div>
                  <div className="project-card-name">{project.name}</div>
                  {isCompleted && <span className="completed-badge">✓</span>}
                </div>
                {project.deadline && (
                  <div className="project-card-deadline">
                    📅 Дедлайн: {formatDate(project.deadline)}
                  </div>
                )}
                {project.description && (
                  <div className="project-card-description">{project.description}</div>
                )}
                <div className="project-card-actions">
                  {!isCompleted && (
                    <button className="btn-icon btn-complete" onClick={() => handleComplete(project)}>✓</button>
                  )}
                  <button className="btn-icon btn-edit" onClick={() => setEditingProject(project)}>✎</button>
                  <button className="btn-icon btn-delete" onClick={() => handleDelete(project.id)}>×</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Панель уведомлений */}
      {notifications.length > 0 && (
        <div className="notification-panel">
          <div className="notification-header" onClick={() => setShowNotifications(!showNotifications)}>
            <span className="notification-icon">🔔</span>
            <span className="notification-count">{notifications.length}</span>
            <span className="notification-title">Уведомления о дедлайнах</span>
          </div>
          {showNotifications && (
            <div className="notification-list">
              {notifications.map(notif => (
                <div key={notif.id} className={`notification-item notification-${notif.type}`}>
                  <div className="notification-content">
                    <div className="notification-title">{notif.title}</div>
                    <div className="notification-message">{notif.message}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default Projects;