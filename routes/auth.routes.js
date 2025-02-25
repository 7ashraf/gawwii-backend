// routes/auth.routes.js
import express from 'express';
import { signInUser, createUser } from '../services/auth.service.js';  // Note the .js extension

const router = express.Router();

router.post('/signup', async (req, res) => {
  try {
    console.log(req.body);
    const { email, password } = req.body;
    const userId = await createUser(email, password);
    res.status(200).json({ userId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    const data = await signInUser(email, password);
    res.status(200).json( data );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export { router as authRoutes };