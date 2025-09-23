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

// Initial sample nodes based on KYB schema
const initialNodes = [
  {
    id: 'kyb-raw-data',
    type: 'dataNode',
    position: { x: 50, y: 50 },
    data: {
      name: 'KYB Raw Data',
      description: 'Complete KYB dataset with business, directors, shareholders, etc.',
      type: 'Raw',
      dataType: 'JSON',
      source: null,
      schema: {
        business: {
          business: { id: 'number', name: 'string', registration_number: 'string', country_id: 'number' },
          properties: [{ name: 'string', key: 'string', value: 'string' }],
          addresses: { id: 'number', address: 'string', country_id: 'number' },
          officers: { id: 'number', name: 'string', nationality: 'string', apps: 'array' },
          shareholders: { id: 'number', name: 'string', ownership_percentage: 'number' }
        },
        directors: [{ id: 'number', full_name: 'string', nationality_id: 'number', addresses: 'array', kyc_check: 'object' }],
        jotform_submissions: [{ id: 'number', data: 'object' }],
        truebiz: { data: 'object', recommendation: 'object' },
        kyb: { id: 'number', state_code: 'string', risk_level: 'number' },
        lexisnexis: [{ id: 'number', decision_code: 'string', rule_outcomes: 'array' }]
      }
    },
  },
  {
    id: 'extract-ubos',
    type: 'processNode',
    position: { x: 400, y: 50 },
    data: {
      name: 'Extract UBOs',
      description: 'Identify Ultimate Beneficial Owners from directors and shareholders data',
      processType: 'main-process',
      platform: ['Dash'],
      checks: [
        'Extract directors with >25% ownership',
        'Extract shareholders with >25% ownership', 
        'Merge and deduplicate UBO list',
        'Validate UBO completeness'
      ],
      inputs: ['kyb-raw-data'],
    },
  },
  {
    id: 'ubo-list',
    type: 'dataNode',
    position: { x: 750, y: 50 },
    data: {
      name: 'UBO List',
      description: 'Extracted Ultimate Beneficial Owners with personal details',
      type: 'Intermediate',
      dataType: 'List',
      source: 'extract-ubos',
      schema: {
        ubos: [{
          id: 'string',
          full_name: 'string',
          nationality_id: 'number',
          date_of_birth: 'string',
          ownership_percentage: 'number',
          role: 'string',
          addresses: 'array',
          id_document_type: 'string',
          id_document_number: 'string'
        }]
      }
    },
  },
  {
    id: 'onfido-verification',
    type: 'processNode',
    position: { x: 1100, y: 50 },
    data: {
      name: 'Onfido KYC Verification',
      description: 'Perform identity verification checks on all UBOs using Onfido',
      processType: 'main-process',
      platform: ['n8n', 'Other'],
      checks: [
        'Document verification for each UBO',
        'Biometric face matching',
        'Address verification',
        'Sanctions screening',
        'Generate verification report'
      ],
      inputs: ['ubo-list'],
    },
  },
  {
    id: 'verification-results',
    type: 'dataNode',
    position: { x: 1450, y: 50 },
    data: {
      name: 'Verification Results',
      description: 'Onfido verification outcomes for all UBOs',
      type: 'Output',
      dataType: 'JSON',
      source: 'onfido-verification',
      schema: {
        verification_summary: {
          total_ubos: 'number',
          verified_count: 'number',
          failed_count: 'number',
          overall_status: 'string'
        },
        individual_results: [{
          ubo_id: 'string',
          document_check: 'string',
          biometric_check: 'string', 
          address_check: 'string',
          sanctions_check: 'string',
          overall_result: 'string'
        }]
      }
    },
  },
  // Additional example nodes
  {
    id: 'business-data',
    type: 'dataNode',
    position: { x: 50, y: 300 },
    data: {
      name: 'Business Core Data',
      description: 'Core business information extracted from KYB dataset',
      type: 'Intermediate',
      dataType: 'JSON',
      source: 'extract-ubos', // Could be from a separate extraction process
      schema: {
        business_info: {
          name: 'string',
          registration_number: 'string',
          incorporation_date: 'string',
          country_id: 'number',
          business_type: 'string',
          industry_type: 'string'
        },
        risk_assessment: {
          risk_level: 'number',
          aml_score: 'number',
          country_risk: 'string',
          industry_risk: 'string'
        }
      }
    },
  },
  {
    id: 'compliance-screening',
    type: 'processNode',
    position: { x: 400, y: 300 },
    data: {
      name: 'Compliance Screening',
      description: 'Screen business and UBOs against sanctions and watchlists',
      processType: 'main-process',
      platform: ['Dash'],
      checks: [
        'Sanctions list screening',
        'PEP (Politically Exposed Person) check',
        'Adverse media screening',
        'Country risk assessment',
        'Generate compliance report'
      ],
      inputs: ['business-data', 'ubo-list'],
    },
  },
  {
    id: 'compliance-report',
    type: 'dataNode',
    position: { x: 750, y: 300 },
    data: {
      name: 'Compliance Report',
      description: 'Comprehensive compliance screening results',
      type: 'Output',
      dataType: 'JSON',
      source: 'compliance-screening',
      schema: {
        screening_results: {
          sanctions_matches: 'number',
          pep_matches: 'number',
          adverse_media_hits: 'number',
          overall_risk_score: 'number',
          recommendation: 'string'
        }
      }
    },
  },
];

const initialEdges = [
  { id: 'e1-2', source: 'kyb-raw-data', target: 'extract-ubos' },
  { id: 'e2-3', source: 'extract-ubos', target: 'ubo-list' },
  { id: 'e3-4', source: 'ubo-list', target: 'onfido-verification' },
  { id: 'e4-5', source: 'onfido-verification', target: 'verification-results' },
  { id: 'e6-7', source: 'business-data', target: 'compliance-screening' },
  { id: 'e7-8', source: 'ubo-list', target: 'compliance-screening' },
  { id: 'e8-9', source: 'compliance-screening', target: 'compliance-report' },
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
