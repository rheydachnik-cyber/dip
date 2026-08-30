const express = require('express');
const authMiddleware = require('../middleware/auth');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const timeEntriesFile = path.join(__dirname, '../data/timeEntries.json');
const projectsFile = path.join(__dirname, '../data/projects.json');
const readTimeEntries = () => JSON.parse(fs.readFileSync(timeEntriesFile));
const writeTimeEntries = (entries) => fs.writeFileSync(timeEntriesFile, JSON.stringify(entries, null, 2));
const readProjects = () => JSON.parse(fs.readFileSync(projectsFile));
const writeProjects = (projects) => fs.writeFileSync(projectsFile, JSON.stringify(projects, null, 2));
router.use(authMiddleware);
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, projectId } = req.query;
    let entries = readTimeEntries();
    entries = entries.filter(e => {
      const project = readProjects().find(p => p.id === e.projectId);
      return project && project.userId === req.userId;
    });
    if (projectId && projectId !== 'all') {
      entries = entries.filter(e => e.projectId === projectId);
    }
    if (startDate) {
      entries = entries.filter(e => new Date(e.startTime) >= new Date(startDate));
    }
    if (endDate) {
      entries = entries.filter(e => new Date(e.endTime) <= new Date(endDate));
    }
    const projects = readProjects();
    const entriesWithProjects = entries.map(entry => ({
      ...entry,
      projectId: projects.find(p => p.id === entry.projectId)
    }));
    
    res.json(entriesWithProjects.sort((a, b) => new Date(b.startTime) - new Date(a.startTime)));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});
router.post('/', async (req, res) => {
  try {
    const entries = readTimeEntries();
    const newEntry = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString()
    };
    entries.push(newEntry);
    writeTimeEntries(entries);
    const projects = readProjects();
    const projectIndex = projects.findIndex(p => p.id === req.body.projectId);
    if (projectIndex !== -1) {
      projects[projectIndex].lastActivity = new Date().toISOString();
      writeProjects(projects);
    }
    const project = projects.find(p => p.id === req.body.projectId);
    res.status(201).json({ ...newEntry, projectId: project });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});
router.put('/:id', async (req, res) => {
  try {
    let entries = readTimeEntries();
    const entryIndex = entries.findIndex(e => e.id === req.params.id);
    
    if (entryIndex === -1) return res.status(404).json({ message: 'Entry not found' });
    entries[entryIndex] = { ...entries[entryIndex], ...req.body };
    writeTimeEntries(entries);
    res.json(entries[entryIndex]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});
router.delete('/:id', async (req, res) => {
  try {
    let entries = readTimeEntries();
    entries = entries.filter(e => e.id !== req.params.id);
    writeTimeEntries(entries);
    res.json({ message: 'Entry deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});
module.exports = router;