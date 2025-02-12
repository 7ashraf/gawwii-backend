// middleware/auth.middleware.js
import { verifyToken } from '../services/auth.service.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const userId = await verifyToken(token);
    if (!userId) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    req.userId = userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};