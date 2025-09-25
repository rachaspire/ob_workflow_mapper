import express from 'express';
import pool from '../database.js';

const router = express.Router();

// Helper function to generate slug from name
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 50);
}

// Helper function to ensure unique slug
async function ensureUniqueSlug(name, id = null) {
  let baseSlug = generateSlug(name);
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const query = id 
      ? 'SELECT id FROM workflows WHERE slug = $1 AND id != $2'
      : 'SELECT id FROM workflows WHERE slug = $1';
    const params = id ? [slug, id] : [slug];
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return slug;
    }
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

// GET /api/workflows - List workflows with search and filtering
router.get('/', async (req, res) => {
  try {
    const { q, tags, archived = 'false', limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT id, name, slug, description, tags, archived, 
             created_at, updated_at, version,
             jsonb_extract_path_text(canvas, 'metadata', 'totalNodes') as total_nodes,
             jsonb_extract_path_text(canvas, 'metadata', 'totalEdges') as total_edges
      FROM workflows 
      WHERE archived = $1
    `;
    const params = [archived === 'true'];
    let paramIndex = 2;
    
    if (q) {
      query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${q}%`);
      paramIndex++;
    }
    
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query += ` AND tags && $${paramIndex}`;
      params.push(tagArray);
      paramIndex++;
    }
    
    query += ` ORDER BY updated_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, params);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM workflows 
      WHERE archived = $1
      ${q ? 'AND (name ILIKE $2 OR description ILIKE $2)' : ''}
      ${tags ? `AND tags && $${q ? 3 : 2}` : ''}
    `;
    let countParams = [archived === 'true'];
    if (q) countParams.push(`%${q}%`);
    if (tags) countParams.push(Array.isArray(tags) ? tags : [tags]);
    
    const countResult = await pool.query(countQuery, countParams);
    
    res.json({
      workflows: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

// POST /api/workflows - Create new workflow
router.post('/', async (req, res) => {
  try {
    const { name, description, tags = [], canvas } = req.body;
    
    if (!name || !canvas) {
      return res.status(400).json({ error: 'Name and canvas are required' });
    }
    
    const slug = await ensureUniqueSlug(name);
    
    const result = await pool.query(`
      INSERT INTO workflows (name, slug, description, tags, canvas)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, slug, description, tags, canvas]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

// GET /api/workflows/:id - Get specific workflow
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT * FROM workflows WHERE id = $1 AND archived = false
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
});

// PUT /api/workflows/:id - Update workflow
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, tags, canvas, version } = req.body;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Check current version for optimistic concurrency
      const currentResult = await client.query(
        'SELECT version FROM workflows WHERE id = $1 AND archived = false',
        [id]
      );
      
      if (currentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Workflow not found' });
      }
      
      if (version && currentResult.rows[0].version !== version) {
        return res.status(409).json({ 
          error: 'Version conflict', 
          currentVersion: currentResult.rows[0].version 
        });
      }
      
      // Save current version to history
      if (canvas) {
        await client.query(`
          INSERT INTO workflow_versions (workflow_id, version, canvas)
          SELECT id, version, canvas FROM workflows WHERE id = $1
        `, [id]);
      }
      
      // Update workflow
      const updateFields = [];
      const params = [];
      let paramIndex = 1;
      
      if (name !== undefined) {
        const slug = await ensureUniqueSlug(name, id);
        updateFields.push(`name = $${paramIndex}, slug = $${paramIndex + 1}`);
        params.push(name, slug);
        paramIndex += 2;
      }
      
      if (description !== undefined) {
        updateFields.push(`description = $${paramIndex}`);
        params.push(description);
        paramIndex++;
      }
      
      if (tags !== undefined) {
        updateFields.push(`tags = $${paramIndex}`);
        params.push(tags);
        paramIndex++;
      }
      
      if (canvas !== undefined) {
        updateFields.push(`canvas = $${paramIndex}, version = version + 1`);
        params.push(canvas);
        paramIndex++;
      }
      
      updateFields.push(`updated_at = NOW()`);
      params.push(id);
      
      const result = await client.query(`
        UPDATE workflows 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND archived = false
        RETURNING *
      `, params);
      
      await client.query('COMMIT');
      res.json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

// DELETE /api/workflows/:id - Soft delete workflow
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      UPDATE workflows 
      SET archived = true, updated_at = NOW()
      WHERE id = $1 AND archived = false
      RETURNING id, name
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    res.json({ message: 'Workflow archived successfully', workflow: result.rows[0] });
  } catch (error) {
    console.error('Error archiving workflow:', error);
    res.status(500).json({ error: 'Failed to archive workflow' });
  }
});

// POST /api/workflows/:id/duplicate - Duplicate workflow
router.post('/:id/duplicate', async (req, res) => {
  try {
    const { id } = req.params;
    
    const sourceResult = await pool.query(`
      SELECT name, description, tags, canvas FROM workflows 
      WHERE id = $1 AND archived = false
    `, [id]);
    
    if (sourceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Source workflow not found' });
    }
    
    const source = sourceResult.rows[0];
    const newName = `${source.name} (Copy)`;
    const slug = await ensureUniqueSlug(newName);
    
    const result = await pool.query(`
      INSERT INTO workflows (name, slug, description, tags, canvas)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [newName, slug, source.description, source.tags, source.canvas]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error duplicating workflow:', error);
    res.status(500).json({ error: 'Failed to duplicate workflow' });
  }
});

// POST /api/workflows/import - Import workflow from JSON
router.post('/import', async (req, res) => {
  try {
    const { name = 'Imported Workflow', description, tags = [], exportData } = req.body;
    
    if (!exportData || !exportData.flow) {
      return res.status(400).json({ error: 'Invalid export data format' });
    }
    
    // Convert export format to our canvas format
    const canvas = {
      nodes: [],
      edges: [],
      metadata: exportData.metadata || {
        flowName: name,
        exportDate: new Date().toISOString(),
        version: "1.0"
      }
    };
    
    // Combine all node types from export format
    if (exportData.flow.rawInputs) {
      exportData.flow.rawInputs.forEach(node => {
        canvas.nodes.push({
          id: node.id,
          type: 'dataNode',
          position: node.position,
          data: {
            name: node.name,
            description: node.description,
            type: 'Raw',
            dataType: node.dataType,
            source: null,
            schema: node.schema
          }
        });
      });
    }
    
    if (exportData.flow.processes?.main) {
      exportData.flow.processes.main.forEach(node => {
        canvas.nodes.push({
          id: node.id,
          type: 'processNode',
          position: node.position,
          data: {
            name: node.name,
            description: node.description,
            processType: 'main-process',
            platform: node.platform,
            checks: node.checks,
            inputs: node.inputs,
            selectedFields: node.selectedFields || {}
          }
        });
      });
    }
    
    if (exportData.flow.processes?.nested) {
      exportData.flow.processes.nested.forEach(node => {
        canvas.nodes.push({
          id: node.id,
          type: 'processNode',
          position: node.position,
          data: {
            name: node.name,
            description: node.description,
            processType: 'nested-process',
            platform: node.platform,
            checks: node.checks,
            inputs: node.inputs
          }
        });
      });
    }
    
    if (exportData.flow.intermediateData) {
      exportData.flow.intermediateData.forEach(node => {
        canvas.nodes.push({
          id: node.id,
          type: 'dataNode',
          position: node.position,
          data: {
            name: node.name,
            description: node.description,
            type: 'Intermediate',
            dataType: node.dataType,
            source: node.source,
            schema: node.schema
          }
        });
      });
    }
    
    if (exportData.flow.outputs) {
      exportData.flow.outputs.forEach(node => {
        canvas.nodes.push({
          id: node.id,
          type: 'dataNode',
          position: node.position,
          data: {
            name: node.name,
            description: node.description,
            type: 'Output',
            dataType: node.dataType,
            source: node.source,
            schema: node.schema
          }
        });
      });
    }
    
    // Add edges if available
    if (exportData.edges) {
      canvas.edges = exportData.edges;
    }
    
    // Update metadata with current stats
    canvas.metadata.totalNodes = canvas.nodes.length;
    canvas.metadata.totalEdges = canvas.edges.length;
    
    const slug = await ensureUniqueSlug(name);
    
    const result = await pool.query(`
      INSERT INTO workflows (name, slug, description, tags, canvas)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, slug, description, tags, canvas]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error importing workflow:', error);
    res.status(500).json({ error: 'Failed to import workflow' });
  }
});

// GET /api/workflows/:id/export - Export workflow in frontend format
router.get('/:id/export', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT * FROM workflows WHERE id = $1 AND archived = false
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    const workflow = result.rows[0];
    const { canvas } = workflow;
    
    // Convert to export format (same as frontend export)
    const dataNodes = canvas.nodes.filter(n => n.type === 'dataNode');
    const processNodes = canvas.nodes.filter(n => n.type === 'processNode');
    
    const rawInputs = dataNodes.filter(n => n.data.type === 'Raw');
    const intermediateData = dataNodes.filter(n => n.data.type === 'Intermediate');
    const outputs = dataNodes.filter(n => n.data.type === 'Output');
    
    const mainProcesses = processNodes.filter(n => n.data.processType === 'main-process');
    const nestedProcesses = processNodes.filter(n => n.data.processType === 'nested-process');
    
    const exportData = {
      metadata: {
        ...canvas.metadata,
        workflowName: workflow.name,
        workflowId: workflow.id,
        exportDate: new Date().toISOString(),
        statistics: {
          rawInputs: rawInputs.length,
          mainProcesses: mainProcesses.length,
          nestedProcesses: nestedProcesses.length,
          intermediateData: intermediateData.length,
          outputs: outputs.length
        }
      },
      flow: {
        rawInputs: rawInputs.map(node => ({
          id: node.id,
          name: node.data.name,
          description: node.data.description,
          dataType: node.data.dataType,
          schema: node.data.schema,
          position: node.position
        })),
        processes: {
          main: mainProcesses.map(node => ({
            id: node.id,
            name: node.data.name,
            description: node.data.description,
            platform: node.data.platform,
            checks: node.data.checks,
            inputs: node.data.inputs || [],
            selectedFields: node.data.selectedFields || {},
            position: node.position
          })),
          nested: nestedProcesses.map(node => ({
            id: node.id,
            name: node.data.name,
            description: node.data.description,
            platform: node.data.platform,
            checks: node.data.checks,
            inputs: node.data.inputs || [],
            reusable: true,
            position: node.position
          }))
        },
        intermediateData: intermediateData.map(node => ({
          id: node.id,
          name: node.data.name,
          description: node.data.description,
          dataType: node.data.dataType,
          source: node.data.source,
          schema: node.data.schema,
          position: node.position
        })),
        outputs: outputs.map(node => ({
          id: node.id,
          name: node.data.name,
          description: node.data.description,
          dataType: node.data.dataType,
          source: node.data.source,
          schema: node.data.schema,
          position: node.position
        }))
      },
      edges: canvas.edges
    };
    
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting workflow:', error);
    res.status(500).json({ error: 'Failed to export workflow' });
  }
});

export default router;