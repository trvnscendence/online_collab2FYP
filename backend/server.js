import express from 'express';
import bodyParser from 'body-parser';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const app = express();
const port = process.env.PORT || 3000;

// For __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// Middleware to enable CORS and parse JSON requests
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Set up lowdb to use a JSON file as a simple database
const filePath = path.join(__dirname, 'db.json');

// Default data structure
const defaultData = {
    users: [],
    tasks: []
};

// Create db.json with default data if it doesn't exist
if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData));
}

const adapter = new JSONFile(filePath);
const db = new Low(adapter, defaultData);  // Pass defaultData as second argument

// Initialize the database
async function initDB() {
    await db.read();
    await db.write();  // Ensure the data is written to file
}

// Initialize DB before starting the server
try {
    await initDB();
} catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
}

// API Endpoint for User Registration
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    await db.read();
    const userExists = db.data.users.find(u => u.username === username);
    if (userExists) {
        return res.status(400).json({ message: 'Username already exists' });
    }
    db.data.users.push({ id: Date.now(), username, password });
    await db.write();
    res.json({ message: 'Registration successful' });
});

// API Endpoint for User Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    await db.read();
    const user = db.data.users.find(u => u.username === username && u.password === password);
    if (user) {
        res.json({ message: 'Login successful', token: 'dummy-token' });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

// API Endpoint to Get All Tasks
app.get('/api/tasks', async (req, res) => {
    await db.read();
    res.json(db.data.tasks);
});

// API Endpoint to Add a New Task
app.post('/api/tasks', async (req, res) => {
    const task = { id: Date.now(), ...req.body };
    await db.read();
    db.data.tasks.push(task);
    await db.write();
    res.json({ message: 'Task added', task });
});

// API Endpoint to Update a Task
app.put('/api/tasks/:id', async (req, res) => {
    const taskId = Number(req.params.id);
    await db.read();
    const task = db.data.tasks.find(t => t.id === taskId);
    if (task) {
        Object.assign(task, req.body);
        await db.write();
        res.json({ message: 'Task updated', task });
    } else {
        res.status(404).json({ message: 'Task not found' });
    }
});

// API Endpoint to Delete a Task
app.delete('/api/tasks/:id', async (req, res) => {
    const taskId = Number(req.params.id);
    await db.read();
    const initialLength = db.data.tasks.length;
    db.data.tasks = db.data.tasks.filter(t => t.id !== taskId);
    if (db.data.tasks.length < initialLength) {
        await db.write();
        res.json({ message: 'Task deleted' });
    } else {
        res.status(404).json({ message: 'Task not found' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`✅ Backend server running on http://localhost:${port}`);
});