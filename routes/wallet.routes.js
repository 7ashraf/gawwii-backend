import express from 'express';
import { createUserWallet, getWalletForUser, adminMintTicket } from '../services/walllet.service.js';
import { verifyToken } from '../services/auth.service.js';

const router = express.Router();

// Create a wallet for the authenticated user
router.post('/create-wallet', async (req, res) => {
  try {
    const userId = await verifyToken(req.headers.authorization?.split(' ')[1] || '');
    const walletAddress = await createUserWallet(userId);
    res.status(200).json({ walletAddress });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mint a ticket (admin action)
// router.post('/mint-ticket', async (req, res) => {
//   try {
//     const { toAddress, ticketData } = req.body;
//     const txHash = await adminMintTicket(toAddress, ticketData);
//     res.status(200).json({ txHash });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

export { router as walletRoutes };
