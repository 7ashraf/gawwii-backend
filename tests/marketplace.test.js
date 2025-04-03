// tests/marketplace.test.js
import request from 'supertest';
import app from '../server.js';
import ContractService from '../services/contract.service.js';
import { jest } from '@jest/globals';


// Mock implementation
const mockContractService = {
  listTicket: jest.fn(),
  buyTicket: jest.fn(),
  delistTicket: jest.fn(),
  getMarketListings: jest.fn(),
  getListingDetails: jest.fn()
};


// Mock the ContractService and middleware
jest.mock('../services/contract.service.js', () => ({
  __esModule: true,
  default: mockContractService
}));

jest.mock('../middleware/auth.middleware.js', () => ({
  authenticateToken: (req, res, next) => {
    req.userId = 'test-user';
    next();
  }
}));

describe('Marketplace Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /marketplace/list', () => {
    it('should return 400 if missing parameters', async () => {
      const res = await request(app)
        .post('/marketplace/list')
        .send({});
      
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should list ticket successfully', async () => {
      ContractService.listTicket.mockResolvedValue({
        transaction: { hash: '0x123' },
        walletAddress: '0x456'
      });

      const res = await request(app)
        .post('/marketplace/list')
        .send({
          ticketId: 1,
          price: 100,
          userInfo: 'test-user-info'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toMatchObject({
        success: true,
        data: {
          ticketId: 1,
          transactionHash: '0x123'
        }
      });
    });

    it('should handle service errors', async () => {
      ContractService.listTicket.mockRejectedValue(new Error('Blockchain error'));

      const res = await request(app)
        .post('/marketplace/list')
        .send({
          ticketId: 1,
          price: 100,
          userInfo: 'test-user-info'
        });

      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /marketplace/buy', () => {
    it('should return 400 if missing parameters', async () => {
      const res = await request(app)
        .post('/marketplace/buy')
        .send({});
      
      expect(res.statusCode).toEqual(400);
    });

    it('should purchase ticket successfully', async () => {
      ContractService.buyTicket.mockResolvedValue({
        transaction: { hash: '0x789' },
        walletAddress: '0xabc'
      });

      const res = await request(app)
        .post('/marketplace/buy')
        .send({
          ticketId: 1,
          newUserInfo: 'new-user-info'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('DELETE /marketplace/delist/:ticketId', () => {
    it('should return 400 if missing ticketId', async () => {
      const res = await request(app)
        .delete('/marketplace/delist/');
      
      expect(res.statusCode).toEqual(404);
    });

    it('should delist ticket successfully', async () => {
      ContractService.delistTicket.mockResolvedValue({
        transaction: { hash: '0xdef' }
      });

      const res = await request(app)
        .delete('/marketplace/delist/1');

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toContain('delisted');
    });
  });

  describe('GET /marketplace/listings', () => {
    it('should fetch listings successfully', async () => {
      const mockListings = [{ ticketId: 1, price: 100 }];
      ContractService.getMarketListings.mockResolvedValue(mockListings);

      const res = await request(app)
        .get('/marketplace/listings');

      expect(res.statusCode).toEqual(200);
      expect(res.body.data).toEqual(mockListings);
    });

    it('should handle listing errors', async () => {
      ContractService.getMarketListings.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .get('/marketplace/listings');

      expect(res.statusCode).toEqual(500);
    });
  });

  describe('GET /marketplace/:ticketId', () => {
    it('should fetch listing details', async () => {
      const mockDetails = { ticketId: 1, price: 100 };
      ContractService.getListingDetails.mockResolvedValue(mockDetails);

      const res = await request(app)
        .get('/marketplace/1');

      expect(res.statusCode).toEqual(200);
      expect(res.body.data).toEqual(mockDetails);
    });

    it('should handle invalid ticket IDs', async () => {
      ContractService.getListingDetails.mockRejectedValue(new Error('Not found'));

      const res = await request(app)
        .get('/marketplace/999');

      expect(res.statusCode).toEqual(500);
    });
  });
});