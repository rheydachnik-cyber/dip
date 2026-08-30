const express = require('express');
const authMiddleware = require('../middleware/auth');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const projectsFile = path.join(__dirname, '../data/projects.json');
const readProjects = () => JSON.parse(fs.readFileSync(projectsFile));
const writeProjects = (projects) => fs.writeFileSync(projectsFile, JSON.stringify(projects, null, 2));
router.use(authMiddleware);
router.get('/', async (req, res) => {
  try {
    const projects = readProjects();
    const userProjects = projects.filter(p => p.userId === req.userId).sort((a, b) => 
      new Date(b.lastActivity) - new Date(a.lastActivity)
    );
    res.json(userProjects);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});
router.get('/:id', async (req, res) => {
  try {
    const projects = readProjects();
    const project = projects.find(p => p.id === req.params.id && p.userId === req.userId);
    
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});
router.post('/', async (req, res) => {
  try {
    const projects = readProjects();
    const newProject = {
      id: Date.now().toString(),
      ...req.body,
      userId: req.userId,
      completed: false,
      completedAt: null,
      deadline: req.body.deadline || null,
      lastActivity: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    projects.push(newProject);
    writeProjects(projects);
    res.status(201).json(newProject);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});
router.put('/:id', async (req, res) => {
  try {
    const projects = readProjects();
    const projectIndex = projects.findIndex(p => p.id === req.params.id && p.userId === req.userId);
    if (projectIndex === -1) return res.status(404).json({ message: 'Project not found' });
    projects[projectIndex] = { ...projects[projectIndex], ...req.body };
    writeProjects(projects);
    res.json(projects[projectIndex]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});
router.delete('/:id', async (req, res) => {
  try {
    let projects = readProjects();
    projects = projects.filter(p => !(p.id === req.params.id && p.userId === req.userId));
    writeProjects(projects);
    res.json({ message: 'Project deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});
module.exports = router;