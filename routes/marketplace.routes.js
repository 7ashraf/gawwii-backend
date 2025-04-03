// routes/marketplace.routes.js
import express from 'express';
import ContractService from '../services/contract.service.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { responseTime } from '../middleware/responseTime.middleware.js';

const router = express.Router();

// List ticket for resale
router.post('/list', authenticateToken, async (req, res) => {
  try {
    const { ticketId, price } = req.body;

    if (!ticketId || !price) {
      return res.status(400).json({
        error: 'Missing required parameters: ticketId, price'
      });
    }

    const result = await ContractService.listTicket(
      req.userId,
      ticketId,
      price
    );

    res.json({
      success: true,
      message: 'Ticket listed successfully',
      data: {
        ticketId,
        transactionHash: result.transaction.hash,
        walletAddress: result.walletAddress
      }
    });

  } catch (error) {
    console.error('Ticket listing error:', error);
    res.status(500).json({
      error: error.message || 'Failed to list ticket'
    });
  }
});

// Buy listed ticket
router.post('/buy', authenticateToken, async (req, res) => {
  try {
    const { ticketId, newUserInfo } = req.body;

    if (!ticketId || !newUserInfo) {
      return res.status(400).json({
        error: 'Missing required parameters: ticketId, newUserInfo'
      });
    }

    const result = await ContractService.buyTicket(req.userId, ticketId, price);


    res.json({
      success: true,
      message: 'Ticket purchased successfully',
      data: result

    });

  } catch (error) {
    console.error('Ticket purchase error:', error);
    res.status(500).json({
      error: error.message || 'Failed to purchase ticket'
    });
  }
});

// Delist ticket
router.delete('/delist/:ticketId', authenticateToken, async (req, res) => {
  try {
    const { ticketId } = req.params;

    if (!ticketId) {
      return res.status(400).json({
        error: 'Missing ticketId parameter'
      });
    }

    const result = await ContractService.delistTicket(
      req.userId,
      ticketId
    );

    res.json({
      success: true,
      message: 'Ticket delisted successfully',
      data: {
        ticketId,
        transactionHash: result.transaction.hash
      }
    });

  } catch (error) {
    console.error('Ticket delisting error:', error);
    res.status(500).json({
      error: error.message || 'Failed to delist ticket'
    });
  }
});

// Get marketplace listings
router.get('/listings', responseTime, async (req, res) => {
  try {
    const listings = await ContractService.getMarketListings();
    res.json({
      success: true,
      data: listings
    });
  } catch (error) {
    console.error('Get listings error:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch listings'
    });
  }
});

// Get specific listing details
router.get('/:ticketId', authenticateToken, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const listing = await ContractService.getListingDetails(ticketId);

    res.json({
      success: true,
      data: listing
    });
  } catch (error) {
    console.error('Get listing details error:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch listing details'
    });
  }
});

export { router as marketplaceRoutes };