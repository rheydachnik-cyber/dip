const express = require('express');
const authMiddleware = require('../middleware/auth');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const usersFile = path.join(__dirname, '../data/users.json');
const projectsFile = path.join(__dirname, '../data/projects.json');
const timeEntriesFile = path.join(__dirname, '../data/timeEntries.json');
const readUsers = () => JSON.parse(fs.readFileSync(usersFile));
const writeUsers = (users) => fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
const readProjects = () => JSON.parse(fs.readFileSync(projectsFile));
const writeProjects = (projects) => fs.writeFileSync(projectsFile, JSON.stringify(projects, null, 2));
const readTimeEntries = () => JSON.parse(fs.readFileSync(timeEntriesFile));
const writeTimeEntries = (entries) => fs.writeFileSync(timeEntriesFile, JSON.stringify(entries, null, 2));
router.use(authMiddleware);
router.get('/me', async (req, res) => {
  try {
    const users = readUsers();
    const user = users.find(u => u.id === req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});
router.put('/me', async (req, res) => {
  try {
    const { username, theme } = req.body;
    const users = readUsers();
    const userIndex = users.findIndex(u => u.id === req.userId);
    
    if (userIndex === -1) return res.status(404).json({ message: 'User not found' });
    
    users[userIndex] = { ...users[userIndex], username, theme };
    writeUsers(users);
    
    const { password, ...userWithoutPassword } = users[userIndex];
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});
router.delete('/me', async (req, res) => {
  try {
    let users = readUsers();
    let projects = readProjects();
    let timeEntries = readTimeEntries();
    const userProjects = projects.filter(p => p.userId === req.userId);
    const projectIds = userProjects.map(p => p.id);
    projects = projects.filter(p => p.userId !== req.userId);
    timeEntries = timeEntries.filter(e => !projectIds.includes(e.projectId) && e.userId !== req.userId);
    users = users.filter(u => u.id !== req.userId);
    writeUsers(users);
    writeProjects(projects);
    writeTimeEntries(timeEntries);
    res.json({ message: 'Account deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});
module.exports = router;