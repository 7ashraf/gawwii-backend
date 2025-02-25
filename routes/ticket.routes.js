import express from 'express';
import ContractService from '../services/contract.service.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/purchase', authenticateToken, async (req, res) => {
  try {
    const { flightId, seatNumber, userInfo } = req.body;

    // Input validation
    if (!flightId || !seatNumber || !userInfo) {
      return res.status(400).json({ 
        error: 'Missing required parameters. Need flightId, seatNumber, and userInfo' 
      });
    }

    // // Check if seat is available before attempting purchase
    // const isAvailable = await ContractService.isSeatAvailable(flightId, seatNumber);
    // if (!isAvailable) {
    //   return res.status(400).json({ 
    //     error: 'Selected seat is not available' 
    //   });
    // }

    // Purchase the ticket
    const result = await ContractService.purchaseTicket(
      req.userId,
      flightId,
      seatNumber,
      userInfo
    );

    res.json({
      success: true,
      message: 'Ticket purchased successfully',
      data: {
        flightId,
        seatNumber,
        transactionHash: result.transaction.hash,
        walletAddress: result.walletAddress
      }
    });

  } catch (error) {
    console.error('Ticket purchase error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to purchase ticket' 
    });
  }
});

// Purchase external ticket
router.post('/purchase-external', authenticateToken, async (req, res) => {
  try {
    const { flightNumber, departure, destination, departureTime, arrivalTime, totalTicket, userInfo, to } = req.body;

    if (!flightNumber || !departure || !destination || !departureTime || !arrivalTime || !totalTicket  || !userInfo) {
      return res.status(400).json({ error: 'Missing required parameters.' });
    }
    console.log("purchase-external", req.userId, flightNumber, departure, destination, departureTime, arrivalTime, totalTicket, userInfo);

    const result = await ContractService.purchaseExternalTicket(
      req.userId,
      flightNumber,
      departure,
      destination,
      departureTime,
      arrivalTime,
      totalTicket,
      userInfo
    );

    console.log("purchase-external", result);

    res.json({
      success: true,
      message: 'External ticket purchased successfully',
      data: {
        transactionHash: result.transaction.hash,
        walletAddress: result.walletAddress
      }
    });


  } catch (error) {
    console.error('External ticket purchase error:', error);
    res.status(500).json({ error: error.message || 'Failed to purchase external ticket' });
  }
});
// Modify ticket
router.put('/modify', authenticateToken, async (req, res) => {
  try {
    const { oldTicketId, newFlightId, flightNumber, departure, destination, departureTime, arrivalTime, totalTickets, value } = req.body;

    if (!oldTicketId || !newFlightId || !flightNumber || !departure || !destination || !departureTime || !arrivalTime || !totalTickets) {
      return res.status(400).json({ error: 'Missing required parameters.' });
    }

    const result = await ContractService.modifyTicket(
      req.userId,
      oldTicketId,
      newFlightId,
      flightNumber,
      departure,
      destination,
      departureTime,
      arrivalTime,
      totalTickets,
      value || 0
    );

    res.json({
      success: true,
      message: 'Ticket modified successfully',
      data: {
        transactionHash: result.transaction.hash,
        walletAddress: result.walletAddress
      }
    });

  } catch (error) {
    console.error('Ticket modification error:', error);
    res.status(500).json({ error: error.message || 'Failed to modify ticket' });
  }
});
// Transfer ticket
router.post('/transfer', authenticateToken, async (req, res) => {
  try {
    const { ticketId, toAddress, newUserInfo } = req.body;

    if (!ticketId || !toAddress || !newUserInfo) {
      return res.status(400).json({ error: 'Missing required parameters.' });
    }

    const result = await ContractService.transferTicket(
      req.userId,
      ticketId,
      toAddress,
      newUserInfo
    );

    res.json({
      success: true,
      message: 'Ticket transferred successfully',
      data: {
        transactionHash: result.transaction.hash,
        walletAddress: result.walletAddress
      }
    });

  } catch (error) {
    console.error('Ticket transfer error:', error);
    res.status(500).json({ error: error.message || 'Failed to transfer ticket' });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const tickets = await ContractService.getUserTickets(req.userId);
    res.json({
      success: true,
      data: tickets
    });
  } catch (error) {
    console.error('Get user tickets error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch user tickets' 
    });
  }
});

router.get('/:ticketId', authenticateToken, async (req, res) => {
  try {
    const ticket = await ContractService.getTicketDetails(
      req.userId,
      req.params.ticketId
    );
    
    res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    console.error('Get ticket details error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch ticket details' 
    });
  }
});


export { router as ticketRoutes };
