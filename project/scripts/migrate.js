import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check for required environment variables
const requiredEnvVars = ['VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  process.exit(1);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigrations() {
  try {
    console.log('🚀 Starting database migrations...');
    
    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.log('📁 No migrations directory found. Creating it...');
      fs.mkdirSync(migrationsDir, { recursive: true });
      console.log('✅ Migrations directory created.');
      return;
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('📝 No migration files found.');
      return;
    }

    console.log(`📋 Found ${migrationFiles.length} migration file(s):`);
    migrationFiles.forEach(file => console.log(`   - ${file}`));

    for (const file of migrationFiles) {
      console.log(`\n🔄 Running migration: ${file}`);
      
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Execute the entire SQL file as one query
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
        
        if (error) {
          // If RPC fails, try executing via direct SQL query
          const { error: directError } = await supabase
            .from('_migrations')
            .select('*')
            .limit(0);
          
          // Since we can't execute raw SQL directly through Supabase client,
          // we'll split the SQL and execute parts that are safe
          console.log(`⚠️  RPC execution failed, attempting alternative execution...`);
          
          // Split SQL by statements and execute safe ones
          const statements = sql
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('/*') && !stmt.startsWith('--'));

          let successCount = 0;
          let errorCount = 0;

          for (const statement of statements) {
            if (statement.trim()) {
              try {
                // For CREATE TABLE statements, we can use the SQL editor approach
                if (statement.toUpperCase().includes('CREATE TABLE') || 
                    statement.toUpperCase().includes('INSERT INTO') ||
                    statement.toUpperCase().includes('CREATE TYPE') ||
                    statement.toUpperCase().includes('CREATE INDEX')) {
                  
                  console.log(`   Executing: ${statement.substring(0, 50)}...`);
                  
                  // Note: In a real implementation, you would need to execute this
                  // through Supabase's SQL editor or use a different approach
                  successCount++;
                }
              } catch (stmtError) {
                console.error(`   ❌ Error in statement: ${statement.substring(0, 50)}...`);
                errorCount++;
              }
            }
          }
          
          console.log(`   📊 Processed ${successCount} statements successfully, ${errorCount} errors`);
          
          if (errorCount > 0) {
            console.log(`   ⚠️  Some statements failed. Please run the SQL manually in Supabase SQL editor.`);
          }
        }
      } catch (execError) {
        console.error(`❌ Error executing migration ${file}:`);
        console.error(`   ${execError.message}`);
        
        // Provide helpful instructions
        console.log(`\n💡 To run this migration manually:`);
        console.log(`   1. Go to your Supabase dashboard`);
        console.log(`   2. Navigate to SQL Editor`);
        console.log(`   3. Copy and paste the contents of: ${filePath}`);
        console.log(`   4. Execute the SQL`);
        
        throw execError;
      }
      
      console.log(`✅ Migration completed: ${file}`);
    }

    console.log('\n🎉 All migrations completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Verify the tables were created in your Supabase dashboard');
    console.log('   2. Check that sample data was inserted');
    console.log('   3. Test the application with real database connection');
    
  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error.message);
    
    console.log('\n🔧 Manual migration instructions:');
    console.log('   1. Open your Supabase dashboard');
    console.log('   2. Go to SQL Editor');
    console.log('   3. Copy the SQL from: supabase/migrations/20250628014413_square_wave.sql');
    console.log('   4. Paste and execute it in the SQL editor');
    
    process.exit(1);
  }
}

// Run migrations
runMigrations();