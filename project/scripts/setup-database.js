import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  console.log('🚀 Setting up Mortuary Management Database...');
  
  try {
    // Test connection
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error && error.code === '42P01') {
      console.log('📋 Database is empty. Please run the migration manually:');
      console.log('\n🔧 Manual Setup Instructions:');
      console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard');
      console.log('2. Select your project: itmocilzcojagjbkrvyx');
      console.log('3. Navigate to SQL Editor');
      console.log('4. Copy the entire contents of: supabase/migrations/20250628014413_square_wave.sql');
      console.log('5. Paste it into the SQL editor and click "Run"');
      console.log('6. Wait for execution to complete');
      console.log('7. Verify tables are created in the Table Editor');
      
      console.log('\n📝 The migration includes:');
      console.log('   ✓ All required tables (users, bodies, storage_units, etc.)');
      console.log('   ✓ Sample data for testing');
      console.log('   ✓ Indexes for performance');
      console.log('   ✓ Views for complex queries');
      console.log('   ✓ Functions and triggers');
      
      return;
    }
    
    if (error) {
      console.error('❌ Database connection error:', error.message);
      return;
    }
    
    console.log('✅ Database connection successful!');
    
    // Check if tables exist and have data
    const tables = ['users', 'bodies', 'storage_units', 'autopsies', 'tasks', 'body_releases', 'notifications'];
    
    for (const table of tables) {
      try {
        const { count, error: countError } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (countError) {
          console.log(`❌ Table '${table}' not found or error: ${countError.message}`);
        } else {
          console.log(`✅ Table '${table}': ${count} records`);
        }
      } catch (err) {
        console.log(`❌ Error checking table '${table}': ${err.message}`);
      }
    }
    
    console.log('\n🎉 Database setup verification complete!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  }
}

setupDatabase();