const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('./generated/prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const SECRET_KEY = process.env.SECRET_KEY;

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.send('HRMS API is running');
});

/* ------------------ Employee Management ------------------ */

// Create Employee
app.post('/employees', async (req, res) => {
  try {
    const { name, department, role, email, phone, joiningDate } = req.body;
    const employee = await prisma.employee.create({
      data: { name, department, role, email, phone, joiningDate: new Date(joiningDate) }
    });
    res.json(employee);
  } catch (error) {
    console.error("Error creating employee:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all Employees
app.get('/employees', async (req, res) => {
  try {
    const employees = await prisma.employee.findMany();
    res.json(employees);
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Update Employee
app.put('/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, department, role, email, phone, joiningDate } = req.body;
    const employee = await prisma.employee.update({
      where: { id: parseInt(id) },
      data: { name, department, role, email, phone, joiningDate: new Date(joiningDate) }
    });
    res.json(employee);
  } catch (error) {
    console.error("Error updating employee:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete Employee
app.delete('/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.employee.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error("Error deleting employee:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ------------------ Leave Management ------------------ */

// Apply for Leave
app.post('/leaves', async (req, res) => {
  try {
    const { employeeId, startDate, endDate, leaveType, reason } = req.body;
    const leave = await prisma.leave.create({
      data: { employeeId, startDate: new Date(startDate), endDate: new Date(endDate), leaveType, reason, status: "Pending" }
    });
    res.json(leave);
  } catch (error) {
    console.error("Error applying for leave:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all Leaves
app.get('/leaves', async (req, res) => {
  try {
    const leaves = await prisma.leave.findMany({ include: { employee: true } });
    res.json(leaves);
  } catch (error) {
    console.error("Error fetching leaves:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update Leave Status
app.put('/leaves/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const leave = await prisma.leave.update({
      where: { id: parseInt(id) },
      data: { status },
    });
    res.json(leave);
  } catch (error) {
    console.error("Error updating leave status:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ------------------ Authentication ------------------ */

// User Registration
app.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role }
    });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(400).json({ success: false, message: 'User already exists' });
  }
});

// User Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) return res.status(400).json({ error: 'Invalid Credentials' });

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) return res.status(400).json({ error: 'Invalid Credentials' });

  const token = jwt.sign({ userId: user.id, role: user.role }, SECRET_KEY, { expiresIn: '1h' });

  // ✅ More consistent response structure
  res.json({
    success: true,
    data: {
      token: token,
      role: user.role
    }
  });
});

/* ------------------ Server Start ------------------ */

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
