import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { ethers } from "ethers";
import { getWalletForUser } from "./walllet.service.js";


const RPC_URL = process.env.RPC_URL;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
const ADMIN_PUBLIC_KEY = process.env.ADMIN_PUBLIC_KEY;


class ContractService {
    constructor() {
      this.provider = new ethers.providers.JsonRpcProvider(RPC_URL);
      this.adminWallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, this.provider);

    }
  
    async getContractWithSigner(userPrivateKey) {
      const wallet = new ethers.Wallet(userPrivateKey, this.provider);
      const sdk = ThirdwebSDK.fromSigner(wallet);
      return await sdk.getContract(CONTRACT_ADDRESS);
    }

    async getContractWithAdminSigner() {
      const sdk = ThirdwebSDK.fromSigner(this.adminWallet);
      return await sdk.getContract(CONTRACT_ADDRESS);
  }


    async estimateGas(contract, method, args, value = 0) {
      try {

        const transaction = await contract.prepare(method, args, {
          value: value.toString()
        });        

              // Get the gas limit from the prepared transaction
        const gasLimit = await transaction.estimateGasLimit();
      
        
        
        // Encode the function data
        // const data = contractInterface.encodeFunctionData(method, args);
        

        // Estimate gas with a buffer
        // const gasEstimate = await contract.estimateGas[method](...args, { value });
        return gasLimit.mul(120).div(100);

      } catch (error) {
        console.error('Gas estimation error:', error);
        
        // Check for common errors
        if (error.message.includes('insufficient funds')) {
          throw new Error('Insufficient funds for transaction');
        }
        if (error.message.includes('execution reverted')) {
          const revertMessage = error.error?.message || 'Transaction would fail';
          throw new Error(`Contract error: ${revertMessage}`);
        }else{
          throw new Error('Failed to estimate gas.' + error.message);

        }
        
      }
    }
  
    async validateTransaction(contract, method, args, userWallet) {
      try {
        // Prepare the transaction
        const transaction = await contract.prepare(method, args);
        
        // Get the gas price
        const gasPrice = await this.provider.getGasPrice();
        
        // Get the gas limit
        const gasLimit = await this.estimateGas(contract, method, args);
        
        // Calculate total cost
        const totalCost = gasLimit.mul(gasPrice);
        
        // Check wallet balance
        const balance = await this.provider.getBalance(ADMIN_PUBLIC_KEY);
        
        if (balance.lt(totalCost)) {
          throw new Error('Insufficient funds for gas');
        }
  
        return {
          gasLimit,
          gasPrice,
          estimatedCost: ethers.utils.formatEther(totalCost)
        };
      } catch (error) {
        throw new Error(`Transaction validation failed: ${error.message}`);
      }
    }
  
    async executeTransaction(userId, method, args) {
      try {
        // Get user's wallet
        const userWallet = await getWalletForUser(userId);
        const contract = await this.getContractWithAdminSigner();
  
        const transaction = await contract.prepare(method, args);

        const argsWithUser = [...args, userWallet.address];


        // Validate and get gas estimates
        const { gasLimit, gasPrice } = await this.validateTransaction(
          contract,
          method,
          argsWithUser,
          userWallet
        );
      // Execute the transaction
      const tx = await contract.call(method, argsWithUser, {
        gasLimit: gasLimit,
        gasPrice: gasPrice
      });
        // Wait for transaction confirmation
  
        return {
          success: true,
          transaction: tx,
          // gasUsed: receipt.gasUsed.toString(),
          walletAddress: userWallet.address
        };
  
      } catch (error) {
        console.error(`Transaction failed: ${error.message}`);
        throw new Error(this.parseError(error));
      }
    }
  
    parseError(error) {
      if (error.message.includes('insufficient funds')) {
        return 'Insufficient funds for transaction';
      }
      if (error.message.includes('execution reverted')) {
        // Extract custom error message if available
        const match = error.message.match(/reason string "(.+?)"/);
        return match ? match[1] : 'Transaction would fail';
      }
      if (error.message.includes('nonce')) {
        return 'Transaction nonce error. Please try again';
      }
      return error.message;
    }

  // Example usage for purchasing ticket
  async purchaseTicket(userId, flightId, seatNumber, userInfo) {
    const formattedFlightId = ethers.BigNumber.from(flightId);
    const formattedSeatNumber = ethers.BigNumber.from(seatNumber);

    // Hash the user info if needed
    const hashedUserInfo = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(userInfo)
    );
    return this.executeTransaction(
      userId,
      'purchaseTicket',
      [formattedFlightId, formattedSeatNumber, hashedUserInfo]
    );
  }

  

  async purchaseExternalTicket(userId, flightNumber, departure, destination, departureTime, arrivalTime, totalTicket, userInfo){

    // const formattedDeparture = ethers.BigNumber.from(departure);

    // const formattedDestination = ethers.BigNumber.from(destination);
    const formatedTotalTickets = ethers.BigNumber.from(totalTicket);
    const hashedUserInfo = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(userInfo)
    );


    //need to approve the admin on the tokens

    return this.executeTransaction(
      userId,
      'purchaseExternalTicket',
      [flightNumber, departure, destination, departureTime, arrivalTime, formatedTotalTickets, hashedUserInfo]
    );


    

  }

  async modifyTicket(userId, oldTicketId, newFlightId,flightNumber, departure, destination,departureTime,arrivalTime,totalTickets, value = 0) {
    try {
      // Format the parameters as BigNumber where needed
      const formattedOldTicketId = ethers.BigNumber.from(oldTicketId);
      const formattedNewFlightId = ethers.BigNumber.from(newFlightId);
      const formattedTotalTickets = ethers.BigNumber.from(totalTickets);

  
      // Get user's wallet and contract
      const userWallet = await getWalletForUser(userId);
      const contract = await this.getContractWithSigner(userWallet.private_key);
  
      // Prepare transaction arguments
      const args = [formattedOldTicketId, formattedNewFlightId, flightNumber, departure, destination, departureTime, arrivalTime, formattedTotalTickets];
  
      // Estimate gas with the value parameter
      const gasEstimate = await this.estimateGas(contract, 'modifyTicket', args, value);
  
      // Execute the transaction with the value parameter
      return this.executeTransaction(
        userId,
        'modifyTicket',
        args,
        {
          value: ethers.utils.parseEther(value.toString()),
          gasLimit: gasEstimate
        }
      );
    } catch (error) {
      console.error("Error modifying ticket:", error);
      throw new Error(this.parseError(error));
    }
  }

  async transferTicket(userId, ticketId, toAddress, newUserInfo) {
    try {
      // Hash the new user info
      const hashedUserInfo = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(newUserInfo)
      );
  
      // Format the ticket ID as BigNumber
      const formattedTicketId = ethers.BigNumber.from(ticketId);
  
      return this.executeTransaction(
        userId,
        'transferTicket',
        [formattedTicketId, toAddress, hashedUserInfo]
      );
    } catch (error) {
      console.error("Error transferring ticket:", error);
      throw new Error(this.parseError(error));
    }
  }

  async getTicketDetails(userId, ticketId) {
    try {
      const wallet = await getWalletForUser(userId);
      const contract = await this.getContractWithSigner(wallet.private_key);

      const owner = await contract.erc721.ownerOf(ticketId);
      
      const metadata = await contract.call("ticketMetadata", [ticketId]);

      const flight = await contract.call("flights", [metadata.flightID]);

      return {
        id: ticketId,
        flightNumber: flight.flightNumber,
        departure: flight.departure,
        destination: flight.destination,
        departureTime: new Date(flight.departureTime * 1000),
        seatNumber: metadata.seatNumber,
        status: metadata.isUsed ? 'used' : 'active',
        price: ethers.utils.formatEther(metadata.price),
        hashedUserInfo: metadata.hashedUserInfo
      };


      
    } catch (error) {
      throw new Error(this.parseError(error));
    }
  }

  async getUserTickets(userId) {
    try {
      const wallet = await getWalletForUser(userId);
      const contract = await this.getContractWithSigner(wallet.private_key);

      const ownedTokens = await contract.erc721.getOwned(wallet.address);


      const tickets = [];
      for (const token of ownedTokens) {
        const id = ethers.BigNumber.from(token.metadata.id);
        const metadata = await contract.call("ticketMetadata", [id]);
        const flightID = metadata[2];
        const flight = await contract.call("flights", [flightID]);
        console.log(flight);
        
        tickets.push({
          id: token.id,
          flightNumber: flight.flightNumber,
          departure: flight.departure,
          destination: flight.destination,
          departureTime: new Date(flight.departureTime),
          arrivalTime: new Date(flight.arrivalTime),
          seatNumber: metadata.seatNumber,
          status: metadata.isUsed ? 'used' : 'active',
          price: ethers.utils.formatEther(metadata.price)
        });
      }
      
      return tickets;

    } catch (error) {
      console.error("Error getting user tickets:", error);
      throw new Error(this.parseError(error));
    }
  }
  



    
  
    // // Read Functions
    // async getBalance(address) {
    //   const contract = await this.getContractWithSigner(process.env.ADMIN_PRIVATE_KEY);
    //   try {
    //     const balance = await contract.call("balanceOf", [address]);
    //     return ethers.utils.formatEther(balance);
    //   } catch (error) {
    //     console.error("Error getting balance:", error);
    //     throw error;
    //   }
    // }
  
    // // Write Functions with user wallet
    // async mintTokens(userId, amount) {
    //   try {
    //     // Get user's wallet
    //     const userWallet = await WalletService.getUserWallet(userId);
    //     const contract = await this.getContractWithSigner(userWallet.private_key);
  
    //     const tx = await contract.call(
    //       "mint",
    //       [userWallet.address, ethers.utils.parseEther(amount.toString())]
    //     );
    //     return { transaction: tx, walletAddress: userWallet.address };
    //   } catch (error) {
    //     console.error("Error minting tokens:", error);
    //     throw error;
    //   }
    // }
  
    // async transferTokens(userId, toAddress, amount) {
    //   try {
    //     // Get user's wallet
    //     const userWallet = await WalletService.getUserWallet(userId);
    //     const contract = await this.getContractWithSigner(userWallet.private_key);
  
    //     const tx = await contract.call(
    //       "transfer",
    //       [toAddress, ethers.utils.parseEther(amount.toString())]
    //     );
    //     return { transaction: tx, fromAddress: userWallet.address };
    //   } catch (error) {
    //     console.error("Error transferring tokens:", error);
    //     throw error;
    //   }
    // }
  }
  
  export default new ContractService();
  