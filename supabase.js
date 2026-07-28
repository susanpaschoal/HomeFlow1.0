import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ssqliqztkcywwkmbiojj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzcWxpcXp0a2N5d3drbWJpb2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNTU3NzUsImV4cCI6MjEwMDczMTc3NX0.i-LpPC50cvIaemMK4gxqv2E0eS3230cVCvL0b209fes';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});