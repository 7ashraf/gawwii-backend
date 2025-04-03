// services/auth.service.js
import { createClient } from '@supabase/supabase-js';
import { createUserWallet } from './walllet.service.js';

const supabaseUrl = 'https://jtbwuldnjsavjukyxzto.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export const createUser = async (email, password) => {
  console.log(email, password);
  const { data, error } = await supabase.auth.signUp({ email, password });
  console.log(data);
  console.log(error);
  if (error) throw new Error(error.message);

  await createUserWallet(data.user?.id);
  return data.user?.id || '';
};

export const verifyToken = async (token) => {
  const { data, error } = await supabase.auth.getUser(token);
  if (error) throw new Error(error.message);
  return data.user?.id || '';
};

export const signInUser = async (email, password) => {
  console.log(email, password);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  console.log(data);
  return { user: data.user, token: data.session.access_token };
};

export const signOutUser = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
  return true;
};

