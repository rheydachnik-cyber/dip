import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { updateProject, fetchProjects } from '../store/slices/projectsSlice';
import Input from '../components/Input';
import Loader from '../components/Loader';
const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const project = useSelector(state => state.projects.items.find(p => p._id === id));
  const [formData, setFormData] = useState({ name: '', color: '', description: '' });
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    if (project) {
      setFormData({ name: project.name, color: project.color, description: project.description });
    } else {
      dispatch(fetchProjects());
    }
  }, [project, dispatch]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await dispatch(updateProject({ id, data: formData }));
    setIsLoading(false);
    navigate('/projects');
  };
  if (!project && !isLoading) return <Loader />;
  return (
    <div className="container">
      <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
        <h1>Редактировать проект</h1>
        <form onSubmit={handleSubmit}>
          <Input label="Название" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          <Input label="Цвет" type="color" value={formData.color} onChange={(e) => setFormData({...formData, color: e.target.value})} />
          <Input label="Описание" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
          <button type="submit" className="btn btn-primary" disabled={isLoading}>Сохранить</button>
          <button type="button" className="btn" onClick={() => navigate('/projects')} style={{ marginLeft: '10px' }}>Отмена</button>
        </form>
      </div>
    </div>
  );
};
export default ProjectDetail;