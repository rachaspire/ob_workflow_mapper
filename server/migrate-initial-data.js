import { workflowAPI } from '../src/lib/api.js';

// Initial nodes and edges from Flow.jsx (the mock data)
const initialNodes = [
  // Raw Input Data Nodes
  {
    id: 'business-description-input',
    type: 'dataNode',
    position: { x: 50, y: 50 },
    data: {
      name: 'Business Description Input',
      description: 'Raw business description from user form',
      type: 'Raw',
      dataType: 'Text',
      source: null,
      schema: {
        BusinessDescription3: 'string',
        ProductExample3: 'string',
        customers: 'string',
        WebsiteUrl3: 'string'
      }
    },
  },
  {
    id: 'website-input',
    type: 'dataNode',
    position: { x: 50, y: 200 },
    data: {
      name: 'Website URL Input',
      description: 'Business webpage URL for analysis',
      type: 'Raw',
      dataType: 'Text',
      source: null,
      schema: {
        WebsiteUrl3: 'string'
      }
    },
  },
  {
    id: 'pob-upload',
    type: 'dataNode',
    position: { x: 50, y: 350 },
    data: {
      name: 'Proof of Business Upload',
      description: 'Uploaded POB documents (bank statements, screenshots, etc.)',
      type: 'Raw',
      dataType: 'JSON',
      source: null,
      schema: {
        document_type: 'string',
        file_url: 'string',
        upload_timestamp: 'string',
        file_size: 'number'
      }
    },
  },
  {
    id: 'id-documents',
    type: 'dataNode',
    position: { x: 50, y: 500 },
    data: {
      name: 'ID Documents',
      description: 'Uploaded ID documents for directors and UBOs',
      type: 'Raw',
      dataType: 'JSON',
      source: null,
      schema: {
        document_type: 'string',
        person_name: 'string',
        person_role: 'string',
        id_number: 'string',
        expiry_date: 'string',
        file_url: 'string'
      }
    },
  },
  {
    id: 'loa-document',
    type: 'dataNode',
    position: { x: 50, y: 650 },
    data: {
      name: 'Letter of Authorization',
      description: 'LOA document with director details',
      type: 'Raw',
      dataType: 'JSON',
      source: null,
      schema: {
        director_name: 'string',
        director_email: 'string',
        loa_file_url: 'string',
        signed_date: 'string'
      }
    },
  },

  // Main Process Nodes
  {
    id: 'website-analysis',
    type: 'processNode',
    position: { x: 400, y: 200 },
    data: {
      name: 'Website Analysis',
      description: 'TrueBiz website analysis for industry classification and POB validation',
      processType: 'main-process',
      platform: ['TrueBiz'],
      checks: [
        'Analyze website content for business activities',
        'Extract industry information',
        'Validate business name consistency',
        'Check website responsiveness and SSL'
      ],
      inputs: ['website-input'],
    },
  },
  {
    id: 'industry-selection',
    type: 'processNode',
    position: { x: 400, y: 50 },
    data: {
      name: 'Industry Selection',
      description: 'AI-powered industry recommendation to reduce drop-off',
      processType: 'main-process',
      platform: ['n8n', 'OpenAI'],
      checks: [
        'Analyze business description for industry signals',
        'Cross-reference with product examples',
        'Generate top 3 industry recommendations',
        'Validate against website analysis results'
      ],
      inputs: ['business-description-input', 'truebiz-results'],
    },
  },
  {
    id: 'business-vagueness-check',
    type: 'processNode',
    position: { x: 400, y: 120 },
    data: {
      name: 'Business Description Vagueness Check',
      description: 'Check business description precision to reduce RFIs',
      processType: 'main-process',
      platform: ['OpenAI'],
      checks: [
        'Calculate description precision score',
        'Compare business description vs product examples',
        'Detect vague or generic descriptions',
        'Generate nudge if precision < 30%'
      ],
      inputs: ['business-description-input'],
    },
  },
  {
    id: 'pob-check',
    type: 'processNode',
    position: { x: 400, y: 350 },
    data: {
      name: 'POB Check',
      description: 'Comprehensive proof of business document validation',
      processType: 'main-process',
      platform: ['n8n'],
      checks: [
        'Classify document type (Bank Statement vs Others)',
        'Verify company name matches application',
        'Check document is not invoice or BRC',
        'Validate transaction count and dates',
        'Contextual business model validation'
      ],
      inputs: ['pob-upload', 'business-description-input', 'truebiz-results'],
    },
  },
  {
    id: 'id-check',
    type: 'processNode',
    position: { x: 400, y: 500 },
    data: {
      name: 'ID Check',
      description: 'Identity document validation and verification',
      processType: 'main-process',
      platform: ['Dash'],
      checks: [
        'Validate ID document is not expired',
        'Check image quality and lighting',
        'Verify name matches application data',
        'Validate DOB consistency',
        'Ensure document is original image (not scan)'
      ],
      inputs: ['id-documents'],
    },
  },
  {
    id: 'loa-correctness-check',
    type: 'processNode',
    position: { x: 400, y: 650 },
    data: {
      name: 'LOA Correctness Check',
      description: 'Letter of Authorization validation',
      processType: 'main-process',
      platform: ['n8n'],
      checks: [
        'Verify director name matches records',
        'Validate director email format',
        'Check LOA document completeness',
        'Confirm proper signatures and dates'
      ],
      inputs: ['loa-document'],
    },
  },

  // Nested Process Nodes (Reusable)
  {
    id: 'basic-doc-check',
    type: 'processNode',
    position: { x: 750, y: 400 },
    data: {
      name: 'Basic Doc Check',
      description: 'Universal document validation checks',
      processType: 'nested-process',
      platform: ['Dash'],
      checks: [
        'Check if document is empty',
        'Verify document is not cropped',
        'Validate file format and size',
        'Ensure document readability'
      ],
      inputs: ['pob-upload', 'id-documents', 'loa-document'],
    },
  },
  {
    id: 'basic-id-check',
    type: 'processNode',
    position: { x: 750, y: 550 },
    data: {
      name: 'Basic ID Check',
      description: 'Standard ID document validation (nested process)',
      processType: 'nested-process',
      platform: ['Dash'],
      checks: [
        'Verify ID is not expired',
        'Check document authenticity',
        'Validate ID format and structure',
        'Ensure clear image quality'
      ],
      inputs: ['id-documents'],
    },
  },

  // Output Data Nodes
  {
    id: 'truebiz-results',
    type: 'dataNode',
    position: { x: 750, y: 200 },
    data: {
      name: 'TrueBiz Results',
      description: 'Website analysis results from TrueBiz',
      type: 'Intermediate',
      dataType: 'JSON',
      source: 'website-analysis',
      schema: {
        TruebizResults: {
          industry_classification: 'string',
          website_status: 'string',
          business_activity_match: 'boolean',
          ssl_valid: 'boolean',
          recommendation: 'string'
        }
      }
    },
  },
  {
    id: 'recommended-industry',
    type: 'dataNode',
    position: { x: 750, y: 50 },
    data: {
      name: 'Recommended Industry',
      description: 'AI-recommended industry classifications',
      type: 'Output',
      dataType: 'JSON',
      source: 'industry-selection',
      schema: {
        RecommendedIndustry: {
          primary_industry: 'string',
          secondary_industries: ['string'],
          confidence_score: 'number',
          reasoning: 'string'
        }
      }
    },
  },
  {
    id: 'vagueness-nudge',
    type: 'dataNode',
    position: { x: 750, y: 120 },
    data: {
      name: 'Vagueness Nudge',
      description: 'Nudge response for vague business descriptions',
      type: 'Output',
      dataType: 'JSON',
      source: 'business-vagueness-check',
      schema: {
        nudge_required: 'boolean',
        precision_score: 'number',
        suggested_improvements: ['string']
      }
    },
  },
  {
    id: 'pob-validation-result',
    type: 'dataNode',
    position: { x: 750, y: 350 },
    data: {
      name: 'POB Validation Result',
      description: 'Proof of business validation outcome',
      type: 'Output',
      dataType: 'JSON',
      source: 'pob-check',
      schema: {
        document_classification: 'string',
        validation_passed: 'boolean',
        issues_found: ['string'],
        nudge_message: 'string'
      }
    },
  },
  {
    id: 'id-validation-result',
    type: 'dataNode',
    position: { x: 750, y: 500 },
    data: {
      name: 'ID Validation Result',
      description: 'Identity document validation outcome',
      type: 'Output',
      dataType: 'JSON',
      source: 'id-check',
      schema: {
        validation_passed: 'boolean',
        issues_found: ['string'],
        document_quality_score: 'number'
      }
    },
  },
  {
    id: 'loa-validation-result',
    type: 'dataNode',
    position: { x: 750, y: 650 },
    data: {
      name: 'LOA Validation Result',
      description: 'Letter of Authorization validation outcome',
      type: 'Output',
      dataType: 'JSON',
      source: 'loa-correctness-check',
      schema: {
        validation_passed: 'boolean',
        director_verified: 'boolean',
        issues_found: ['string']
      }
    },
  },
];

const initialEdges = [
  // Main process flows
  { id: 'e1', source: 'website-input', target: 'website-analysis' },
  { id: 'e2', source: 'website-analysis', target: 'truebiz-results' },
  { id: 'e3', source: 'business-description-input', target: 'industry-selection' },
  { id: 'e4', source: 'truebiz-results', target: 'industry-selection' },
  { id: 'e5', source: 'industry-selection', target: 'recommended-industry' },
  { id: 'e6', source: 'business-description-input', target: 'business-vagueness-check' },
  { id: 'e7', source: 'business-vagueness-check', target: 'vagueness-nudge' },
  { id: 'e8', source: 'pob-upload', target: 'pob-check' },
  { id: 'e9', source: 'business-description-input', target: 'pob-check' },
  { id: 'e10', source: 'truebiz-results', target: 'pob-check' },
  { id: 'e11', source: 'pob-check', target: 'pob-validation-result' },
  { id: 'e12', source: 'id-documents', target: 'id-check' },
  { id: 'e13', source: 'id-check', target: 'id-validation-result' },
  { id: 'e14', source: 'loa-document', target: 'loa-correctness-check' },
  { id: 'e15', source: 'loa-correctness-check', target: 'loa-validation-result' },
  
  // Nested process connections
  { id: 'e16', source: 'pob-upload', target: 'basic-doc-check' },
  { id: 'e17', source: 'id-documents', target: 'basic-doc-check' },
  { id: 'e18', source: 'loa-document', target: 'basic-doc-check' },
  { id: 'e19', source: 'id-documents', target: 'basic-id-check' },
];

// Generate export data in the same format as the frontend
function generateExportData() {
  const dataNodes = initialNodes.filter(n => n.type === 'dataNode');
  const processNodes = initialNodes.filter(n => n.type === 'processNode');
  
  const rawInputs = dataNodes.filter(n => n.data.type === 'Raw');
  const intermediateData = dataNodes.filter(n => n.data.type === 'Intermediate');
  const outputs = dataNodes.filter(n => n.data.type === 'Output');
  
  const mainProcesses = processNodes.filter(n => n.data.processType === 'main-process');
  const nestedProcesses = processNodes.filter(n => n.data.processType === 'nested-process');
  
  return {
    metadata: {
      flowName: "Sample KYB/KYC Process Flow",
      exportDate: new Date().toISOString(),
      version: "1.0",
      totalNodes: initialNodes.length,
      totalEdges: initialEdges.length,
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
    edges: initialEdges
  };
}

// Migration function
export async function migrateInitialData() {
  try {
    console.log('Checking if initial data migration is needed...');
    
    // Check if any workflows exist
    const response = await fetch('http://localhost:3001/api/workflows?limit=1');
    if (!response.ok) {
      throw new Error('Failed to check existing workflows');
    }
    
    const { workflows } = await response.json();
    
    if (workflows.length > 0) {
      console.log('Workflows already exist. Skipping migration.');
      return null;
    }
    
    console.log('No workflows found. Creating initial workflow...');
    
    // Generate export data and import it
    const exportData = generateExportData();
    
    const importResponse = await fetch('http://localhost:3001/api/workflows/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Sample KYB/KYC Process Flow',
        description: 'A comprehensive workflow demonstrating KYB (Know Your Business) and KYC (Know Your Customer) processes with data inputs, validation steps, and outputs.',
        tags: ['kyb', 'kyc', 'sample', 'validation'],
        exportData
      })
    });
    
    if (!importResponse.ok) {
      throw new Error(`Import failed: ${importResponse.status}`);
    }
    
    const workflow = await importResponse.json();
    console.log('Successfully created initial workflow:', workflow.name, `(ID: ${workflow.id})`);
    
    return workflow;
    
  } catch (error) {
    console.error('Error during initial data migration:', error);
    throw error;
  }
}

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateInitialData()
    .then((result) => {
      if (result) {
        console.log('Migration completed successfully!');
      } else {
        console.log('Migration not needed.');
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}