import React, { useCallback, useState } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Plus, Settings2 } from 'lucide-react';

import DataNode from './components/nodes/DataNode';
import ProcessNode from './components/nodes/ProcessNode';
import NodeInspector from './components/NodeInspector';
import CreateNodeForm from './components/CreateNodeForm';

// Node types configuration

const nodeTypes = {
  dataNode: DataNode,
  processNode: ProcessNode,
};

// Initial nodes based on real Feathery KYB process data
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

function Flow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeDefault] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createNodeType, setCreateNodeType] = useState('data');

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  // Handle edge deletion and sync node data
  const onEdgesChange = useCallback((changes) => {
    // First, handle any removals to sync node data
    changes.forEach((change) => {
      if (change.type === 'remove') {
        const edge = edges.find(e => e.id === change.id);
        if (edge) {
          // Update the target node to remove the source from its inputs
          setNodes((nds) => nds.map((node) => {
            if (node.id === edge.target) {
              if (node.type === 'processNode') {
                // Remove from inputs array
                const newInputs = (node.data.inputs || []).filter(id => id !== edge.source);
                return { ...node, data: { ...node.data, inputs: newInputs } };
              } else if (node.type === 'dataNode') {
                // Clear source if it matches
                if (node.data.source === edge.source) {
                  return { ...node, data: { ...node.data, source: null } };
                }
              }
            }
            return node;
          }));
        }
      }
    });
    
    // Then apply the default edge changes
    onEdgesChangeDefault(changes);
  }, [edges, setNodes, onEdgesChangeDefault]);

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  // Helper function to generate unique IDs
  const generateId = (type) => {
    const timestamp = Date.now();
    return `${type}-${timestamp}`;
  };

  // Create new node
  const createNode = (nodeData) => {
    const id = generateId(nodeData.nodeType);
    const newNode = {
      id,
      type: nodeData.nodeType === 'data' ? 'dataNode' : 'processNode',
      position: { x: Math.random() * 300 + 100, y: Math.random() * 300 + 100 },
      data: {
        ...nodeData,
        inputs: nodeData.inputs || [],
        platform: nodeData.platform || [],
        checks: nodeData.checks || [],
      },
    };

    setNodes((nds) => [...nds, newNode]);
    setShowCreateForm(false);
  };

  // Handle auto-connections from inspector
  const handleAutoConnect = (connection) => {
    if (connection.remove) {
      // Remove connection
      setEdges((eds) => eds.filter(e => !(e.source === connection.source && e.target === connection.target)));
    } else {
      // Add connection if it doesn't exist
      setEdges((eds) => {
        const exists = eds.some(e => e.source === connection.source && e.target === connection.target);
        if (!exists) {
          return addEdge({ ...connection, id: generateId('edge') }, eds);
        }
        return eds;
      });
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col">
      {/* Top Bar */}
      <div className="flex-shrink-0 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="px-4 py-3 flex items-center gap-2">
          <div className="text-lg font-semibold">KYB/KYC Flow Builder</div>
          <div className="flex-1" />
          
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => {
              setCreateNodeType('data');
              setShowCreateForm(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1"/>Data Node
          </Button>
          <Button 
            size="sm"
            onClick={() => {
              setCreateNodeType('process');
              setShowCreateForm(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1"/>Process Node
          </Button>
        </div>
      </div>

      {/* Canvas + Inspector */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 border-r">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            className="w-full h-full"
          >
            <MiniMap pannable zoomable />
            <Controls showInteractive={false} />
            <Background />
          </ReactFlow>
        </div>

        <div className="w-80 flex-shrink-0">
          <Card className="h-full rounded-none border-0">
            <CardHeader className="border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="w-4 h-4" /> Inspector
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 h-full overflow-y-auto">
              {!selectedNode ? (
                <div className="text-sm text-muted-foreground">
                  Select a node to edit properties, run processes, or manage data.
                </div>
              ) : (
                <NodeInspector
                  node={selectedNode}
                  nodes={nodes}
                  onUpdate={(updatedData) => {
                    setNodes((nds) =>
                      nds.map((n) =>
                        n.id === selectedNode.id
                          ? { ...n, data: { ...n.data, ...updatedData } }
                          : n
                      )
                    );
                    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, ...updatedData } });
                  }}
                  onConnect={handleAutoConnect}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Node Form Modal */}
      {showCreateForm && (
        <CreateNodeForm
          nodeType={createNodeType}
          onSubmit={createNode}
          onCancel={() => setShowCreateForm(false)}
          existingNodes={nodes}
        />
      )}
    </div>
  );
}


export default Flow;
