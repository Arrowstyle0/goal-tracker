const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/goal-tracker', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB successfully');
}).catch((error) => {
    console.error('MongoDB connection error:', error);
});

// Goal Schema
const goalSchema = new mongoose.Schema({
    username: String,
    title: String,
    amount: Number,
    date: Date,
    category: {
        type: String,
        default: 'Personal',
        enum: ['Personal', 'Career', 'Health', 'Financial']
    },
    status: {
        type: String,
        default: 'Not Started',
        enum: ['Not Started', 'In Progress', 'Completed']
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    }
});

const Goal = mongoose.model('Goal', goalSchema);

// Routes
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/app.html');
});

app.post('/api/goals', async (req, res) => {
    try {
        const { username, title, amount, date } = req.body;
        const goal = new Goal({ username, title, amount, date });
        await goal.save();
        res.status(201).send(goal);
    } catch (error) {
        res.status(400).send(error);
    }
});

app.get('/api/goals', async (req, res) => {
    try {
        const goals = await Goal.find().sort({ created: -1 });
        res.send(goals);
    } catch (error) {
        res.status(500).send(error);
    }
});

// Improved /api/view-goals route
app.get('/api/view-goals', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>Goal Tracker Data</title>
                <style>
                    body {
                        font-family: 'Inter', sans-serif;
                        background: #1a1a2e;
                        color: #fff;
                        padding: 20px;
                    }
                    .goal {
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 12px;
                        padding: 20px;
                        margin: 15px 0;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    }
                    h1 {
                        color: #4facfe;
                        text-align: center;
                    }
                    .container {
                        max-width: 800px;
                        margin: 0 auto;
                    }
                    .time-remaining {
                        color: #4facfe;
                        font-weight: 500;
                    }
                </style>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
            </head>
            <body>
                <div class="container">
                    <h1>Stored Goals</h1>
                    <div id="goals"></div>
                </div>
                <script>
                    function timeRemaining(date) {
                        const now = new Date();
                        const target = new Date(date);
                        const diff = target - now;
                        
                        if (diff <= 0) return "Goal date has passed!";
                        
                        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                        return \`\${days} days, \${hours} hours remaining\`;
                    }

                    fetch('/api/goals')
                        .then(res => res.json())
                        .then(goals => {
                            document.getElementById('goals').innerHTML = goals.map(goal => \`
                                <div class="goal">
                                    <h3>\${goal.title}</h3>
                                    <p>By: \${goal.username}</p>
                                    <p>Amount: $\${goal.amount.toLocaleString()}</p>
                                    <p>Target Date: \${new Date(goal.date).toLocaleString()}</p>
                                    <p class="time-remaining">\${timeRemaining(goal.date)}</p>
                                </div>
                            \`).join('');
                        });
                </script>
            </body>
        </html>
    `);
});

// Get dashboard summary
app.get('/api/dashboard/summary', async (req, res) => {
    try {
        const goals = await Goal.find();
        const summary = {
            total: goals.length,
            completed: goals.filter(g => g.status === 'Completed').length,
            inProgress: goals.filter(g => g.status === 'In Progress').length,
            avgProgress: goals.length > 0 ? 
                Math.round(goals.reduce((sum, g) => sum + (g.progress || 0), 0) / goals.length) : 0
        };
        res.json(summary);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch dashboard summary' });
    }
});

// Get goals by category
app.get('/api/dashboard/categories', async (req, res) => {
    try {
        const goals = await Goal.find();
        const categories = goals.reduce((acc, goal) => {
            const category = goal.category || 'Uncategorized';
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {});
        res.json(categories);
    } catch (error) {
        res.status(500).send(error);
    }
});

// Add this route after existing routes
app.get('/dashboard/:username', async (req, res) => {
    try {
        const username = req.params.username;
        const userGoals = await Goal.find({ username });
        
        res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${username}'s Dashboard</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            <style>
                body {
                    font-family: 'Inter', sans-serif;
                    background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
                    color: #fff;
                    margin: 0;
                    padding: 20px;
                }

                .dashboard-container {
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .welcome-header {
                    text-align: center;
                    margin-bottom: 2rem;
                    padding: 2rem;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 15px;
                    backdrop-filter: blur(10px);
                }

                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }

                .stat-card {
                    background: rgba(255, 255, 255, 0.1);
                    padding: 1.5rem;
                    border-radius: 12px;
                    backdrop-filter: blur(10px);
                    text-align: center;
                }

                .stat-value {
                    font-size: 2rem;
                    font-weight: 600;
                    color: #4facfe;
                }

                .charts-container {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                    gap: 2rem;
                    margin-bottom: 2rem;
                }

                .chart-card {
                    background: rgba(255, 255, 255, 0.1);
                    padding: 1.5rem;
                    border-radius: 12px;
                    backdrop-filter: blur(10px);
                }

                .goals-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 1.5rem;
                }

                .goal-card {
                    background: rgba(255, 255, 255, 0.1);
                    padding: 1.5rem;
                    border-radius: 12px;
                    backdrop-filter: blur(10px);
                }

                .progress-bar {
                    width: 100%;
                    height: 8px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                    margin-top: 1rem;
                }

                .progress-fill {
                    height: 100%;
                    background: linear-gradient(45deg, #4facfe 0%, #00f2fe 100%);
                    border-radius: 4px;
                    transition: width 0.5s ease;
                }

                @media (max-width: 768px) {
                    .charts-container {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
        </head>
        <body>
            <div class="dashboard-container">
                <div class="welcome-header">
                    <h1>${username}'s Goal Dashboard</h1>
                    <p>Track your progress and achieve your goals</p>
                </div>

                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>Total Goals</h3>
                        <div class="stat-value" id="totalGoals">0</div>
                    </div>
                    <div class="stat-card">
                        <h3>Completed</h3>
                        <div class="stat-value" id="completedGoals">0</div>
                    </div>
                    <div class="stat-card">
                        <h3>In Progress</h3>
                        <div class="stat-value" id="inProgressGoals">0</div>
                    </div>
                    <div class="stat-card">
                        <h3>Success Rate</h3>
                        <div class="stat-value" id="successRate">0%</div>
                    </div>
                </div>

                <div class="charts-container">
                    <div class="chart-card">
                        <h3>Goals by Category</h3>
                        <canvas id="categoryChart"></canvas>
                    </div>
                    <div class="chart-card">
                        <h3>Progress Overview</h3>
                        <canvas id="progressChart"></canvas>
                    </div>
                </div>

                <div class="goals-grid" id="goalsGrid"></div>
            </div>

            <script>
                const username = "${username}";
                const goals = ${JSON.stringify(userGoals)};

                // Update Stats
                document.getElementById('totalGoals').textContent = goals.length;
                document.getElementById('completedGoals').textContent = 
                    goals.filter(g => g.status === 'Completed').length;
                document.getElementById('inProgressGoals').textContent = 
                    goals.filter(g => g.status === 'In Progress').length;
                document.getElementById('successRate').textContent = 
                    Math.round((goals.filter(g => g.status === 'Completed').length / goals.length) * 100) + '%';

                // Render Charts
                const categoryData = goals.reduce((acc, goal) => {
                    acc[goal.category] = (acc[goal.category] || 0) + 1;
                    return acc;
                }, {});

                new Chart(document.getElementById('categoryChart'), {
                    type: 'doughnut',
                    data: {
                        labels: Object.keys(categoryData),
                        datasets: [{
                            data: Object.values(categoryData),
                            backgroundColor: [
                                '#4facfe', '#00f2fe', '#32CD32', '#FFA07A'
                            ]
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: { color: '#fff' }
                            }
                        }
                    }
                });

                // Render Goals Grid
                const goalsGrid = document.getElementById('goalsGrid');
                goals.forEach(goal => {
                    const progress = goal.status === 'Completed' ? 100 : 
                        goal.status === 'In Progress' ? 50 : 0;
                    
                    goalsGrid.innerHTML += \`
                        <div class="goal-card">
                            <h3>\${goal.title}</h3>
                            <p>Amount: $\${goal.amount.toLocaleString()}</p>
                            <p>Target Date: \${new Date(goal.date).toLocaleDateString()}</p>
                            <p>Status: \${goal.status}</p>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: \${progress}%"></div>
                            </div>
                        </div>
                    \`;
                });
            </script>
        </body>
        </html>
        `);
    } catch (error) {
        res.status(500).send(error);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));