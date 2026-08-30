const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const router = express.Router();
const usersFile = path.join(__dirname, '../data/users.json');
const readUsers = () => {
  const data = fs.readFileSync(usersFile);
  return JSON.parse(data);
};
const writeUsers = (users) => {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
};
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const users = readUsers();
    const existingUser = users.find(u => u.email === email || u.username === username);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now().toString(),
      username,
      email,
      password: hashedPassword,
      theme: 'light',
      avatar: '',
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    writeUsers(users);
    const token = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET || 'secretkey');
    res.status(201).json({ 
      token, 
      user: { 
        id: newUser.id, 
        username: newUser.username, 
        email: newUser.email, 
        theme: newUser.theme 
      } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const users = readUsers();
    const user = users.find(u => u.email === email);
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secretkey');
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        theme: user.theme 
      } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});
module.exports = router;
