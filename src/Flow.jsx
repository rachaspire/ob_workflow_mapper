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

// Initial sample nodes
const initialNodes = [
  {
    id: 'data-1',
    type: 'dataNode',
    position: { x: 50, y: 50 },
    data: {
      name: 'Business Registration',
      description: 'Raw business registration data from government registry',
      type: 'Raw',
      dataType: 'JSON',
      source: null,
    },
  },
  {
    id: 'process-1',
    type: 'processNode',
    position: { x: 400, y: 50 },
    data: {
      name: 'Verify Business Details',
      description: 'Validate business registration information',
      processType: 'main-process',
      platform: ['Dash'],
      checks: ['Check registration number validity', 'Verify business address', 'Confirm business status'],
      inputs: ['data-1'],
    },
  },
  {
    id: 'data-2',
    type: 'dataNode',
    position: { x: 750, y: 50 },
    data: {
      name: 'Verification Result',
      description: 'Business verification outcome',
      type: 'Output',
      dataType: 'JSON',
      source: 'process-1',
    },
  },
];

const initialEdges = [
  { id: 'e1-2', source: 'data-1', target: 'process-1' },
  { id: 'e2-3', source: 'process-1', target: 'data-2' },
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
