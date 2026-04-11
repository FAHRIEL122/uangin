const { pool } = require('../config/database');
const { success, error, badRequest } = require('../utils/response');

// Get all todos for user
async function getTodos(req, res) {
  try {
    const userId = req.user.userId;
    const [rows] = await pool.query(
      'SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return success(res, 'Todos retrieved', rows);
  } catch (err) {
    console.error('Get todos error:', err.message);
    return error(res, 'Failed to get todos', 500);
  }
}

// Create todo
async function createTodo(req, res) {
  try {
    const userId = req.user.userId;
    const { title, due_date, priority } = req.body;

    if (!title || !title.trim()) {
      return badRequest(res, 'Title is required');
    }

    const [result] = await pool.query(
      'INSERT INTO todos (user_id, title, due_date, priority) VALUES (?, ?, ?, ?)',
      [userId, title.trim(), due_date || null, priority || 'medium']
    );

    const [todo] = await pool.query('SELECT * FROM todos WHERE id = ?', [result.insertId]);
    return success(res, 'Todo created', todo[0], 201);
  } catch (err) {
    console.error('Create todo error:', err.message);
    return error(res, 'Failed to create todo', 500);
  }
}

// Update todo
async function updateTodo(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { title, completed, due_date, priority } = req.body;

    const [existing] = await pool.query(
      'SELECT * FROM todos WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (existing.length === 0) {
      return badRequest(res, 'Todo not found');
    }

    await pool.query(
      'UPDATE todos SET title = ?, completed = ?, due_date = ?, priority = ? WHERE id = ?',
      [title || existing[0].title, completed !== undefined ? completed : existing[0].completed, due_date || existing[0].due_date, priority || existing[0].priority, id]
    );

    const [todo] = await pool.query('SELECT * FROM todos WHERE id = ?', [id]);
    return success(res, 'Todo updated', todo[0]);
  } catch (err) {
    console.error('Update todo error:', err.message);
    return error(res, 'Failed to update todo', 500);
  }
}

// Delete todo
async function deleteTodo(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const [result] = await pool.query(
      'DELETE FROM todos WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return badRequest(res, 'Todo not found');
    }

    return success(res, 'Todo deleted');
  } catch (err) {
    console.error('Delete todo error:', err.message);
    return error(res, 'Failed to delete todo', 500);
  }
}

module.exports = { getTodos, createTodo, updateTodo, deleteTodo };
