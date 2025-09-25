import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database tables
export async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // Create workflows table with JSON storage for nodes and edges
    await client.query(`
      CREATE TABLE IF NOT EXISTS workflows (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        tags TEXT[] DEFAULT '{}',
        archived BOOLEAN DEFAULT false,
        canvas JSONB NOT NULL,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create workflow_versions table for version history
    await client.query(`
      CREATE TABLE IF NOT EXISTS workflow_versions (
        id SERIAL PRIMARY KEY,
        workflow_id INTEGER REFERENCES workflows(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        canvas JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(workflow_id, version)
      )
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_workflows_slug ON workflows(slug);
      CREATE INDEX IF NOT EXISTS idx_workflows_archived ON workflows(archived);
      CREATE INDEX IF NOT EXISTS idx_workflows_name ON workflows USING gin(to_tsvector('english', name));
      CREATE INDEX IF NOT EXISTS idx_workflows_tags ON workflows USING gin(tags);
      CREATE INDEX IF NOT EXISTS idx_workflow_versions_workflow_id ON workflow_versions(workflow_id);
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default pool;