import { ChainId, ThirdwebSDK } from "@thirdweb-dev/sdk";
import { ethers } from "ethers";
import { getWalletForUser } from "./walllet.service.js";
import { createThirdwebClient } from "thirdweb";
import { privateKeyAccount } from "thirdweb/wallets";
import { smartWallet, getWalletBalance } from "thirdweb/wallets";
import { Sepolia } from "@thirdweb-dev/chains";
import { config } from "dotenv";
import { Goerli } from "@thirdweb-dev/chains";
import { LocalWalletNode } from "@thirdweb-dev/wallets/evm/wallets/local-wallet-node";
// import { SmartWallet, SmartWalletConfig } from "@thirdweb-dev/wallets";
import TicketFactory from "../TicketFactory.json" assert { type: "json" };
import Marketplace from "../Marketplace.json" assert { type: "json" };


const RPC_URL = process.env.RPC_URL;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
const ADMIN_PUBLIC_KEY = process.env.ADMIN_PUBLIC_KEY;
const MARKETPLACE_CONTRACT_ADDRESS = process.env.MARKETPLACE_CONTRACT_ADDRESS;

const {abi} = TicketFactory;


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

    async getContractWithSignerAdminEthers(address, _abi) {
      const wallet = new ethers.Wallet(this.adminWallet, this.provider);
      const contract = new ethers.Contract(address, _abi, wallet);
      return contract;
    }
    async getContractWithSignerEthers(userPrivateKey) {
      const wallet = new ethers.Wallet(userPrivateKey, this.provider);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);
      return contract;
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
  
    async executeTransaction(contractType, userId, method, args, value=0) {
      try {
        // Get user's wallet
        const userWallet = await getWalletForUser(userId);
        const { abi, address } = this.getContractConfig(contractType);
        console.log("executeTransaction", contractType, userId, method, args, value, address);


        const contract = await this.getContractWithSignerAdminEthers(address, abi);

        const fragments = contract.interface.fragments.filter(
          f => f.type === 'function' && f.name === method
        );
    
        if (fragments.length === 0) {
          throw new Error(`Function ${method} not found`);
        }
    
        let selectedFragment;
        for (const fragment of fragments) {
          try {
            contract.interface.encodeFunctionData(fragment, args);
            selectedFragment = fragment;
            break;
          } catch (error) {
            continue;
          }
        }
    
        if (!selectedFragment) {
          throw new Error(`No ${method} overload matches provided arguments`);
        }

        const paramTypes = selectedFragment.inputs.map(input => input.type);
          paramTypes.forEach((type, index) => {
          console.log(`Param ${index}: ${type}`);
        });


        console.log(`Selected function signature: ${selectedFragment.format()}`);
        console.log(`Final Arguments:`, args);

        // Validate and get gas estimates
        // const { gasLimit, gasPrice } = await this.validateTransaction(
        //   contract,
        //   method,
        //   argsWithUser,
        //   userWallet
        // );
      // Execute the transaction

      // const tx = await contract.addExternalFlight(method, argsWithUser, {
      //   gasLimit: "gasLimit",
      //   gasPrice: "gasPrice"
      // });

      const tx = await contract[selectedFragment.format()](...args);

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

        // New method to maintain backward compatibility
    async executeTicketTransaction(userId, method, args, value = 0) {
      return this.executeTransaction('ticket', userId, method, args, value);
    }

    // Marketplace-specific execution
    async executeMarketplaceTransaction(userId, method, args, value = 0) {
      return this.executeTransaction('marketplace', userId, method, args, value);
    }

    // Helper method for contract configuration
    getContractConfig(contractType) {
        const contracts = {
            ticket: {
                abi: TicketFactory.abi,
                address: CONTRACT_ADDRESS
            },
            marketplace: {
                abi: Marketplace.abi,
                address: process.env.MARKETPLACE_CONTRACT_ADDRESS
            }
        };
        return contracts[contractType] || contracts.ticket;
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
    return this.executeTicketTransaction(
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

    const wallet = await getWalletForUser(userId);
    const toAddress = wallet.address;


    //need to approve the admin on the tokens

    return this.executeTicketTransaction(
      userId,
      'purchaseExternalTicket',
      [flightNumber, departure, destination, departureTime, arrivalTime, formatedTotalTickets, hashedUserInfo, toAddress]
    );


    

  }

  async modifyTicket(
    userId,
    ticketId,
    flightNumber,
    departure,
    destination,
    departureTime,
    arrivalTime,
    totalTickets,
    value = 0
  ) {
    try {
      // Convert dates to UNIX timestamps
      // const departureTimestamp = Math.floor(new Date(departureTime).getTime() / 1000);
      // const arrivalTimestamp = Math.floor(new Date(arrivalTime).getTime() / 1000);
  
      // Convert to BigNumber for blockchain operations
      console.log("here");
      const formattedTicketId = ethers.BigNumber.from(ticketId);
      console.log("here");

      // const formattedDepartureTime = ethers.BigNumber.from(departureTimestamp);
      // const formattedArrivalTime = ethers.BigNumber.from(arrivalTimestamp);
      console.log(totalTickets);
      const formattedTotalTickets = ethers.BigNumber.from(totalTickets);

  
      // Prepare arguments array matching contract method signature
      const args = [
        formattedTicketId,
        flightNumber,
        departure,
        destination,
        departureTime,
        arrivalTime,
        formattedTotalTickets
      ];
      console.log(args);
      console.log("modifyTicket", userId, ticketId, flightNumber, departure, destination, departureTime, arrivalTime, totalTickets, value);
  
      // Execute transaction with value handling
      return this.executeTicketTransaction(
        userId,
        'modifyTicket',
        args,
        {
          // value: ethers.utils.parseEther(value.toString())
          
        }
      );
    } catch (error) {
      console.error("Ticket modification error:", error);
      throw new Error(this.parseError(error));
    }
  }
  async transferTicket(userId, ticketId, toAddress, newUserInfo) {
    try {
      // Hash the new user info
      const hashedUserInfo = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(newUserInfo)
      );

      const wallet = await getWalletForUser(userId);
      const fromAddress = wallet.address;
  
      // Format the ticket ID as BigNumber
      const formattedTicketId = ethers.BigNumber.from(ticketId);
  
      return this.executeTicketTransaction(
        userId,
        'transferTicket',
        [fromAddress, formattedTicketId, toAddress, hashedUserInfo]
      );
    } catch (error) {
      console.error("Error transferring ticket:", error);
      throw new Error(this.parseError(error));
    }
  }

  async getTicketDetails(userId, ticketId) {
    try {
      console.log("getTicketDetails", userId, ticketId);
      const userWallet = await getWalletForUser(userId);
      const contract = await this.getContractWithSignerAdminEthers();

      const formattedTicketId = ethers.BigNumber.from(ticketId);
      console.log(formattedTicketId);

      // const owner = await contract.erc721.ownerOf(formattedTicketId);
      
      const metadata = await contract["ticketMetadata"](formattedTicketId);
      const flightID = metadata[2];
      const flight = await contract["flights"](flightID);

      return {
        id: ticketId,
        flightNumber: flight.flightNumber,
        departure: flight.departure,
        destination: flight.destination,
        departureTime: new Date(flight.departureTime * 1000),
        arrivalTime: new Date(flight.arrivalTime * 1000),
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
      const contract = await this.getContractWithSignerEthers(wallet.private_key);

      // const ownedTokens = await contract.erc721.getOwned(wallet.address);
      const balance = await contract.balanceOf(wallet.address);

      const tokenIds = [];
      for (let i = 0; i < balance; i++) {
        const tokenId = await contract.tokenOfOwnerByIndex(wallet.address, i);
        tokenIds.push(tokenId);
      }

      const tickets = [];
      for (const token of tokenIds) {
        const id = ethers.BigNumber.from(token);
        console.log(id);
        const metadata = await contract["ticketMetadata"](id);
        const flightID = metadata[2];
        const flight = await contract["flights"](flightID);


        
        tickets.push({
          ticketId: id.toNumber(),
          flightNumber: flight.flightNumber,
          departure: flight.departure,
          destination: flight.destination,
          departureTime: new Date(flight.departureTime * 1000),
          arrivalTime: new Date(flight.arrivalTime * 1000),
          seatNumber: metadata.seatNumber,
          status: metadata.isUsed ? 'used' : 'active',
          price: ethers.utils.formatEther(metadata.price)
        });
      }
      
      return tickets;

    } catch (error) {
      // console.error("Error getting user tickets:", error);
      throw new Error(this.parseError(error));
    }
  }

  
  

      // New marketplace methods use executeMarketplaceTransaction
  async listTicket(userId, ticketId, price) {
    await this.approveMarketplace(userId, ticketId);
    console.log("approved");
    const formattedPrice = ethers.utils.parseUnits(price.toString(), "ether");
    return this.executeMarketplaceTransaction(
      userId,
      'listTicketForResale',
      [ethers.BigNumber.from(ticketId), formattedPrice]
    );
  }

  async approveMarketplace(userId, ticketId) {
      return this.executeTicketTransaction(
          userId,
          'myInsecureApprove',
          [process.env.MARKETPLACE_CONTRACT_ADDRESS, ethers.BigNumber.from(ticketId)]
      );
  }

    async buyTicket(userId, ticketId, price) {
      return this.executeMarketplaceTransaction(
          'marketplace',
          userId,
          'buyTicket',
          [ethers.BigNumber.from(ticketId)],
          price
      );
  }

  async delistTicket(userId, ticketId) {
      return this.executeMarketplaceTransaction(
          'marketplace',
          userId,
          'delistTicket',
          [ethers.BigNumber.from(ticketId)]
      );
  }

  async getMarketListings() {
    try {
      const marketplaceContract = await this.getMarketplaceContract();
      const ticketFactoryContract = await this.getTicketFactoryContract();
  
      // Get all TicketListed events from blockchain
      const listedEvents = await marketplaceContract.queryFilter(
        marketplaceContract.filters.TicketListed()
      );
  
      const activeListings = [];
  
      // Check each listing's current state
      for (const event of listedEvents) {
        const tokenId = event.args.tokenId;
        
        // Get current listing state
        const listing = await marketplaceContract.getListing(tokenId);
        
        // Verify listing is still active
        if (listing.price.gt(0)) {
          // Get ticket metadata
          const metadata = await ticketFactoryContract.ticketMetadata(tokenId);
          const flightId = metadata[2];
          const flight = await ticketFactoryContract.flights(flightId);
  
          activeListings.push({
            listingId: tokenId.toNumber(),
            seller: listing.seller,
            price: ethers.utils.formatEther(listing.price),
            flightDetails: {
              number: flight.flightNumber,
              departure: flight.departure,
              destination: flight.destination
              // departureTime: new Date(flight.departureTime?.toNumber()  * 1000) || null,
              // arrivalTime: new Date(flight.arrivalTime?.toNumber() * 1000) || null
            },
            seatNumber: metadata.seatNumber,
            originalOwner: metadata.owner
          });
        }
      }
  
      return activeListings;
    } catch (error) {
      console.error("Error fetching market listings:", error);
      throw new Error(this.parseError(error));
    }
  }
  

  // Add these helper methods to your ContractService
async getMarketplaceContract() {
  const { abi, address } = this.getContractConfig('marketplace');
  return new ethers.Contract(address, abi, this.provider);
}

async getTicketFactoryContract() {
  const { abi, address } = this.getContractConfig('ticket');
  return new ethers.Contract(address, abi, this.provider);
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
  