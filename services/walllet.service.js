import { ethers } from 'ethers';
import { createClient } from '@supabase/supabase-js';
import { ThirdwebSDK } from '@thirdweb-dev/sdk';

const supabaseUrl = 'https://jtbwuldnjsavjukyxzto.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Create a new wallet for a user
export const createUserWallet = async (userId) => {
  const wallet = ethers.Wallet.createRandom();
  const walletAddress = wallet.address;
  const privateKey = wallet.privateKey;

  // Store the wallet in Supabase
  const { error } = await supabase
    .from('user_wallets')
    .insert([{ user_id: userId, address: walletAddress, private_key: privateKey }]);

  if (error) throw new Error(error.message);
  return walletAddress;
};

// Get a user's wallet address
export const getWalletForUser = async (userId) => {
  const { data, error } = await supabase
    .from('user_wallets')
    .select('address, private_key')
    .eq('user_id', userId)
    .single();

    console.log(data);

  if (error) throw new Error(error.message);
  return data;
};


const adminSDK = new ThirdwebSDK("mumbai", {
  secretKey: process.env.ADMIN_WALLET_PRIVATE_KEY,
});

export const adminMintTicket = async (toAddress, ticketData) => {
  const contract = await adminSDK.getContract(process.env.CONTRACT_ADDRESS);
  const tx = await contract.erc721.mintTo(toAddress, ticketData);
  return tx.receipt.transactionHash;
};