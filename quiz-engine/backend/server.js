const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// CORS configuration
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());

console.log('Starting Quiz Engine Backend...');

// Database connection pool
let pool;

async function initializeDatabase() {
    try {
        pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'madhulasya509',
            database: process.env.DB_NAME || 'quiz_engine',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
        
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully!');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection error:', error.message);
        console.log('⚠️  Running without database - some features may not work');
        return false;
    }
}

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// ============ TEST ENDPOINTS ============
app.get('/api/test', (req, res) => {
    res.json({ success: true, message: 'API is working!', timestamp: new Date().toISOString() });
});

// ============ AUTH ENDPOINTS ============
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { full_name, email, password } = req.body;
        console.log('📝 Signup attempt:', email);
        
        if (!pool) {
            // Mock response for testing without database
            const token = jwt.sign(
                { id: 1, email, role: 'user', full_name },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '7d' }
            );
            return res.json({ 
                token, 
                user: { id: 1, full_name, email, role: 'user' } 
            });
        }
        
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            'INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)',
            [full_name, email, hashedPassword, 'user']
        );

        const token = jwt.sign(
            { id: result.insertId, email, role: 'user', full_name },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        console.log('✅ User created:', email);
        res.json({ token, user: { id: result.insertId, full_name, email, role: 'user' } });
    } catch (error) {
        console.error('❌ Signup error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('🔐 Login attempt:', email);
        
        if (!pool) {
            // Mock response for testing without database
            const token = jwt.sign(
                { id: 1, email, role: 'user', full_name: 'Test User' },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '7d' }
            );
            return res.json({ 
                token, 
                user: { id: 1, full_name: 'Test User', email, role: 'user' } 
            });
        }
        
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        console.log('✅ User logged in:', email);
        res.json({ token, user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role } });
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ MODULES ROUTES ============
app.get('/api/modules', (req, res) => {
    console.log('Modules endpoint hit!');
    const modules = [
        { id: 1, name: 'JavaScript', description: 'Master JavaScript fundamentals', icon: '📘', color: 'from-yellow-500 to-yellow-600', question_count: 20, time_limit: 30, passing_score: 75 },
        { id: 2, name: 'Python', description: 'Learn Python programming', icon: '🐍', color: 'from-green-500 to-green-600', question_count: 20, time_limit: 30, passing_score: 75 },
        { id: 3, name: 'Java', description: 'Object-oriented programming with Java', icon: '☕', color: 'from-red-500 to-red-600', question_count: 20, time_limit: 30, passing_score: 75 },
        { id: 4, name: 'React', description: 'Build modern web apps with React.js', icon: '⚛️', color: 'from-blue-500 to-blue-600', question_count: 20, time_limit: 30, passing_score: 75 },
        { id: 5, name: 'Node.js', description: 'Server-side JavaScript with Node.js', icon: '🚀', color: 'from-green-500 to-green-600', question_count: 20, time_limit: 30, passing_score: 75 },
        { id: 6, name: 'SQL', description: 'Database management with SQL', icon: '🗄️', color: 'from-purple-500 to-purple-600', question_count: 20, time_limit: 30, passing_score: 75 },
        { id: 7, name: 'HTML/CSS', description: 'Web development fundamentals', icon: '🎨', color: 'from-orange-500 to-orange-600', question_count: 20, time_limit: 30, passing_score: 75 },
        { id: 8, name: 'TypeScript', description: 'Type-safe JavaScript development', icon: '📝', color: 'from-blue-500 to-blue-600', question_count: 20, time_limit: 30, passing_score: 75 }
    ];
    res.json(modules);
});

app.get('/api/modules/:moduleId/quiz', (req, res) => {
    const moduleId = parseInt(req.params.moduleId);
    const moduleNames = ['', 'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'HTML/CSS', 'TypeScript'];
    const name = moduleNames[moduleId] || 'Programming';
    
    res.json({ 
        module: { id: moduleId, name: name, description: `${name} Quiz` },
        quiz: { id: moduleId, time_limit: 30, passing_score: 75 },
        questions: [
            { id: 1, question_text: `What is ${name}?`, option_a: `A programming language/technology`, option_b: `A markup language`, option_c: `A database`, option_d: `A framework`, points: 1 },
            { id: 2, question_text: `Is ${name} popular?`, option_a: `Yes`, option_b: `No`, option_c: `Maybe`, option_d: `Not sure`, points: 1 },
            { id: 3, question_text: `Can you build apps with ${name}?`, option_a: `Yes`, option_b: `No`, option_c: `Maybe`, option_d: `Not sure`, points: 1 }
        ]
    });
});

app.post('/api/modules/:moduleId/attempt', (req, res) => {
    const { answers } = req.body;
    let correct = 0;
    let total = Object.keys(answers).length;
    
    for (let answer of Object.values(answers)) {
        if (answer === 'A') correct++;
    }
    
    const percentage = Math.round((correct / total) * 100);
    res.json({
        score: correct,
        total_points: total,
        percentage: percentage,
        passed: percentage >= 75,
        results: []
    });
});

// ============ USER QUIZ ROUTES ============

// Get user's created quizzes
app.get('/api/user/quizzes', authenticateToken, async (req, res) => {
    try {
        console.log('Fetching quizzes for user:', req.user.id);
        
        if (!pool) {
            // Return empty array if no database
            return res.json([]);
        }
        
        const [quizzes] = await pool.query(`
            SELECT q.*, 
                   COUNT(DISTINCT qa.id) as attempts,
                   COALESCE(AVG(qa.percentage), 0) as avg_score
            FROM quizzes q
            LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id
            WHERE q.created_by = ?
            GROUP BY q.id
            ORDER BY q.created_at DESC
        `, [req.user.id]);
        
        console.log(`Found ${quizzes.length} quizzes`);
        res.json(quizzes);
    } catch (error) {
        console.error('Error fetching user quizzes:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// Create user quiz
app.post('/api/user/quizzes', authenticateToken, async (req, res) => {
    try {
        const { title, description, category, time_limit, passing_score, questions } = req.body;
        
        console.log('Creating quiz for user:', req.user.id);
        
        if (!pool) {
            return res.json({ id: Date.now(), message: 'Quiz created successfully (mock)' });
        }
        
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const [quizResult] = await connection.query(
                'INSERT INTO quizzes (title, description, category, time_limit, passing_score, created_by) VALUES (?, ?, ?, ?, ?, ?)',
                [title, description, category || 'other', time_limit, passing_score, req.user.id]
            );
            
            const quizId = quizResult.insertId;
            
            for (const q of questions) {
                await connection.query(
                    'INSERT INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, points) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [quizId, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer, q.points || 1]
                );
            }
            
            await connection.commit();
            res.json({ id: quizId, message: 'Quiz created successfully' });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error creating user quiz:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// Delete user quiz
app.delete('/api/user/quiz/:id', authenticateToken, async (req, res) => {
    try {
        const quizId = req.params.id;
        
        if (!pool) {
            return res.json({ message: 'Quiz deleted successfully (mock)' });
        }
        
        const [quiz] = await pool.query('SELECT created_by FROM quizzes WHERE id = ?', [quizId]);
        if (quiz.length === 0) {
            return res.status(404).json({ error: 'Quiz not found' });
        }
        
        if (quiz[0].created_by !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'You can only delete your own quizzes' });
        }
        
        await pool.query('DELETE FROM quizzes WHERE id = ?', [quizId]);
        res.json({ message: 'Quiz deleted successfully' });
    } catch (error) {
        console.error('Error deleting quiz:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============ USER PROFILE ROUTES ============

// Get user profile
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        if (!pool) {
            return res.json({ 
                id: req.user.id, 
                full_name: req.user.full_name, 
                email: req.user.email, 
                role: req.user.role,
                created_at: new Date().toISOString()
            });
        }
        
        const [users] = await pool.query(
            'SELECT id, full_name, email, role, created_at, bio, location, website, github, linkedin FROM users WHERE id = ?',
            [req.user.id]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(users[0]);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update user profile
app.put('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const { bio, location, website, github, linkedin } = req.body;
        
        if (!pool) {
            return res.json({ message: 'Profile updated successfully (mock)' });
        }
        
        await pool.query(
            'UPDATE users SET bio = ?, location = ?, website = ?, github = ?, linkedin = ? WHERE id = ?',
            [bio, location, website, github, linkedin, req.user.id]
        );
        
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get user stats
app.get('/api/user/stats', authenticateToken, async (req, res) => {
    try {
        if (!pool) {
            return res.json({
                quizzesTaken: 0,
                certificatesEarned: 0,
                averageScore: 0,
                totalPoints: 0,
                quizzesCreated: 0,
                streak: 0
            });
        }
        
        const [quizzesTaken] = await pool.query(
            'SELECT COUNT(*) as count FROM quiz_attempts WHERE user_id = ?',
            [req.user.id]
        );
        
        const [certificatesEarned] = await pool.query(
            'SELECT COUNT(*) as count FROM quiz_attempts WHERE user_id = ? AND passed = true',
            [req.user.id]
        );
        
        const [avgScore] = await pool.query(
            'SELECT COALESCE(AVG(percentage), 0) as avg FROM quiz_attempts WHERE user_id = ?',
            [req.user.id]
        );
        
        const [totalPoints] = await pool.query(
            'SELECT COALESCE(SUM(score), 0) as total FROM quiz_attempts WHERE user_id = ?',
            [req.user.id]
        );
        
        const [quizzesCreated] = await pool.query(
            'SELECT COUNT(*) as count FROM quizzes WHERE created_by = ?',
            [req.user.id]
        );
        
        res.json({
            quizzesTaken: quizzesTaken[0].count || 0,
            certificatesEarned: certificatesEarned[0].count || 0,
            averageScore: Math.round(avgScore[0].avg || 0),
            totalPoints: totalPoints[0].total || 0,
            quizzesCreated: quizzesCreated[0].count || 0,
            streak: 0
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get user recent activity
app.get('/api/user/activity', authenticateToken, async (req, res) => {
    try {
        if (!pool) {
            return res.json([]);
        }
        
        const [attempts] = await pool.query(`
            SELECT 
                'quiz_taken' as type,
                q.title as description,
                qa.percentage as score,
                qa.passed,
                qa.completed_at as date
            FROM quiz_attempts qa
            JOIN quizzes q ON qa.quiz_id = q.id
            WHERE qa.user_id = ?
            ORDER BY qa.completed_at DESC
            LIMIT 5
        `, [req.user.id]);
        
        res.json(attempts);
    } catch (error) {
        console.error('Error fetching activity:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============ START SERVER ============
const PORT = process.env.PORT || 5002;

initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`\n🚀 Server running on http://localhost:${PORT}`);
        console.log(`📡 Available endpoints:`);
        console.log(`   GET  http://localhost:${PORT}/api/test`);
        console.log(`   POST http://localhost:${PORT}/api/auth/signup`);
        console.log(`   POST http://localhost:${PORT}/api/auth/login`);
        console.log(`   GET  http://localhost:${PORT}/api/modules`);
        console.log(`   GET  http://localhost:${PORT}/api/user/quizzes`);
        console.log(`   POST http://localhost:${PORT}/api/user/quizzes`);
        console.log(`   GET  http://localhost:${PORT}/api/user/profile`);
        console.log(`   PUT  http://localhost:${PORT}/api/user/profile`);
        console.log(`   GET  http://localhost:${PORT}/api/user/stats`);
        console.log(`   GET  http://localhost:${PORT}/api/user/activity`);
        console.log(`\n✨ Ready to accept requests!\n`);
    });
}).catch(err => {
    console.error('Failed to start server:', err);
});