import express from 'express';
import { getUserByEmail } from '../services/user.service.js';
const router = express.Router();

// Route to get user by email
router.get('/user/:email', UserController.getUserByEmail);



module.exports = router;