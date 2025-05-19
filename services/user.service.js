import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jtbwuldnjsavjukyxzto.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);


//get user by email
export const getUserByEmail = async (email) => {
  const { data, error } = await supabase.rpc(
    "get_user_id_by_email",
    {
      email: email
    }
  );

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error('User not found');
  }

  return data[0].id;
};

