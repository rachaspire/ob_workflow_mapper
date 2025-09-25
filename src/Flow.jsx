import React, { useCallback, useState, useEffect, useRef } from 'react';
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
import { Input } from './components/ui/input';
import { Badge } from './components/ui/badge';
import { Plus, Settings2, LayoutGrid, Download, ArrowLeft, Save, AlertCircle, Edit2, Check, X, Tag, GripVertical } from 'lucide-react';
import { workflowAPI, AutoSaver } from './lib/api';
import { useResizablePanel } from './hooks/useResizablePanel';

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

function Flow({ workflow, workflowId, onBackToManager }) {
  const [currentWorkflow, setCurrentWorkflow] = useState(workflow);

  // Resizable panel hook for node inspector
  const { width: inspectorWidth, isDragging, resizeHandleProps } = useResizablePanel(320, 280, 50);

  // Sync currentWorkflow with workflow prop changes
  useEffect(() => {
    setCurrentWorkflow(workflow);
  }, [workflow]);
  // Initialize nodes and edges from workflow or use defaults
  const getInitialData = () => {
    if (workflow?.canvas) {
      return {
        nodes: workflow.canvas.nodes || [],
        edges: workflow.canvas.edges || []
      };
    }
    return { nodes: initialNodes, edges: initialEdges };
  };

  const initialData = getInitialData();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialData.nodes);
  const [edges, setEdges, onEdgesChangeDefault] = useEdgesState(initialData.edges);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createNodeType, setCreateNodeType] = useState('data');
  const [highlightedNodes, setHighlightedNodes] = useState(new Set());
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
  const [lastSaved, setLastSaved] = useState(null);
  const autoSaverRef = useRef(null);
  const currentVersionRef = useRef(workflow?.version || 1);
  
  // Workflow editing state
  const [isEditingWorkflow, setIsEditingWorkflow] = useState(false);
  const [tempName, setTempName] = useState('');
  const [tempTags, setTempTags] = useState('');
  const [workflowUpdateLoading, setWorkflowUpdateLoading] = useState(false);

  // Auto-save setup and cleanup
  useEffect(() => {
    if (workflowId) {
      autoSaverRef.current = new AutoSaver(workflowId, (error, updatedWorkflow) => {
        if (error) {
          setSaveStatus('error');
          console.error('Auto-save error:', error);
        } else {
          if (updatedWorkflow?.version) {
            currentVersionRef.current = updatedWorkflow.version; // Update version after successful autosave
          }
          setSaveStatus('saved');
          setLastSaved(new Date());
        }
      });
      autoSaverRef.current.start();
    }

    return () => {
      if (autoSaverRef.current) {
        autoSaverRef.current.stop();
      }
    };
  }, [workflowId]);

  // Auto-save when nodes or edges change
  useEffect(() => {
    if (workflowId && autoSaverRef.current) {
      setSaveStatus('saving');
      const canvas = {
        nodes,
        edges,
        metadata: {
          flowName: currentWorkflow?.name || 'Untitled Workflow',
          version: "1.0",
          totalNodes: nodes.length,
          totalEdges: edges.length,
          lastModified: new Date().toISOString()
        }
      };
      
      autoSaverRef.current.schedule(canvas, currentVersionRef.current);
    }
  }, [nodes, edges, workflowId, currentWorkflow?.name]);

  // Manual save function
  const handleManualSave = async () => {
    if (!workflowId) return;
    
    try {
      setSaveStatus('saving');
      const canvas = {
        nodes,
        edges,
        metadata: {
          flowName: currentWorkflow?.name || 'Untitled Workflow',
          version: "1.0",
          totalNodes: nodes.length,
          totalEdges: edges.length,
          lastModified: new Date().toISOString()
        }
      };
      
      const updatedWorkflow = await workflowAPI.update(workflowId, { canvas, version: currentVersionRef.current });
      currentVersionRef.current = updatedWorkflow.version; // Update version after successful save
      setSaveStatus('saved');
      setLastSaved(new Date());
    } catch (error) {
      setSaveStatus('error');
      console.error('Manual save error:', error);
    }
  };

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

  // Function to find all connected nodes (upstream and downstream)
  const findConnectedNodes = useCallback((nodeId) => {
    const connected = new Set([nodeId]);
    const visited = new Set();
    
    const traverse = (currentId, direction = 'both') => {
      if (visited.has(currentId)) return;
      visited.add(currentId);
      connected.add(currentId);
      
      edges.forEach(edge => {
        if (direction !== 'downstream' && edge.target === currentId && !visited.has(edge.source)) {
          traverse(edge.source, 'upstream');
        }
        if (direction !== 'upstream' && edge.source === currentId && !visited.has(edge.target)) {
          traverse(edge.target, 'downstream');
        }
      });
    };
    
    traverse(nodeId);
    return connected;
  }, [edges]);

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    
    // Find and highlight connected nodes
    const connectedNodes = findConnectedNodes(node.id);
    setHighlightedNodes(connectedNodes);
  }, [findConnectedNodes]);

  // Clear highlighting when clicking on empty space
  const onPaneClick = useCallback(() => {
    setHighlightedNodes(new Set());
    setSelectedNode(null);
  }, []);

  // Helper function to generate unique IDs
  const generateId = (type) => {
    const timestamp = Date.now();
    return `${type}-${timestamp}`;
  };

  // Auto-layout function to arrange nodes in layers
  const formatNodes = useCallback(() => {
    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    const layers = [];
    
    // Identify output nodes (green nodes) that should be in the rightmost layer
    const outputNodes = nodes.filter(node => 
      node.type === 'dataNode' && node.data.type === 'Output'
    );
    
    // Layer 0: Raw input nodes (no source)
    const rawNodes = nodes.filter(node => 
      node.type === 'dataNode' && node.data.type === 'Raw'
    );
    
    // Layer 1: Nested processes (reusable components)
    const nestedProcesses = nodes.filter(node => 
      node.type === 'processNode' && node.data.processType === 'nested-process'
    );
    
    // Build dependency graph for remaining nodes (excluding output nodes for now)
    const visited = new Set();
    const layerMap = new Map();
    
    // Mark raw nodes as layer 0
    rawNodes.forEach(node => {
      layerMap.set(node.id, 0);
      visited.add(node.id);
    });
    
    // Mark nested processes as layer 1
    nestedProcesses.forEach(node => {
      layerMap.set(node.id, 1);
      visited.add(node.id);
    });
    
    // Function to calculate layer based on dependencies
    const calculateLayer = (nodeId, currentPath = new Set()) => {
      if (layerMap.has(nodeId)) {
        return layerMap.get(nodeId);
      }
      
      if (currentPath.has(nodeId)) {
        // Circular dependency, assign a default layer
        return 2;
      }
      
      const node = nodeMap.get(nodeId);
      if (!node) return 0;
      
      // Skip output nodes in initial calculation - they'll be placed in the final layer
      if (node.type === 'dataNode' && node.data.type === 'Output') {
        return 0; // Temporary value, will be overridden later
      }
      
      currentPath.add(nodeId);
      
      let maxInputLayer = -1;
      
      // Check inputs from node data
      if (node.data.inputs && node.data.inputs.length > 0) {
        node.data.inputs.forEach(inputId => {
          const inputLayer = calculateLayer(inputId, currentPath);
          maxInputLayer = Math.max(maxInputLayer, inputLayer);
        });
      }
      
      // Check source
      if (node.data.source) {
        const sourceLayer = calculateLayer(node.data.source, currentPath);
        maxInputLayer = Math.max(maxInputLayer, sourceLayer);
      }
      
      // Check edges for additional dependencies
      edges.forEach(edge => {
        if (edge.target === nodeId) {
          const sourceLayer = calculateLayer(edge.source, currentPath);
          maxInputLayer = Math.max(maxInputLayer, sourceLayer);
        }
      });
      
      currentPath.delete(nodeId);
      
      const nodeLayer = maxInputLayer + 1;
      layerMap.set(nodeId, nodeLayer);
      return nodeLayer;
    };
    
    // Calculate layers for all non-output nodes first
    nodes.forEach(node => {
      if (!layerMap.has(node.id) && !(node.type === 'dataNode' && node.data.type === 'Output')) {
        calculateLayer(node.id);
      }
    });
    
    // Find the maximum layer among non-output nodes
    let maxLayer = 0;
    layerMap.forEach((layer, nodeId) => {
      const node = nodeMap.get(nodeId);
      if (!(node.type === 'dataNode' && node.data.type === 'Output')) {
        maxLayer = Math.max(maxLayer, layer);
      }
    });
    
    // Place all output nodes in the rightmost layer (maxLayer + 1)
    const outputLayer = maxLayer + 1;
    outputNodes.forEach(node => {
      layerMap.set(node.id, outputLayer);
    });
    
    // Group nodes by layer
    const layeredNodes = new Map();
    layerMap.forEach((layer, nodeId) => {
      if (!layeredNodes.has(layer)) {
        layeredNodes.set(layer, []);
      }
      layeredNodes.get(layer).push(nodeMap.get(nodeId));
    });
    
    // Position nodes in layers
    const layerWidth = 350;
    const nodeHeight = 120;
    const nodeSpacing = 20;
    
    const newNodes = [];
    
    layeredNodes.forEach((layerNodes, layerIndex) => {
      const x = 50 + (layerIndex * layerWidth);
      
      // Sort nodes within layer by type (data nodes first, then processes)
      layerNodes.sort((a, b) => {
        if (a.type === 'dataNode' && b.type === 'processNode') return -1;
        if (a.type === 'processNode' && b.type === 'dataNode') return 1;
        return a.data.name.localeCompare(b.data.name);
      });
      
      layerNodes.forEach((node, index) => {
        const y = 50 + (index * (nodeHeight + nodeSpacing));
        newNodes.push({
          ...node,
          position: { x, y }
        });
      });
    });
    
    setNodes(newNodes);
    
    // Clear highlighting when formatting
    setHighlightedNodes(new Set());
    setSelectedNode(null);
  }, [nodes, edges, setNodes]);

  // Auto-format nodes on component mount
  useEffect(() => {
    // Only format if nodes are in their initial positions (not already formatted)
    const hasDefaultPositions = nodes.some(node => 
      node.position.x === 50 && [50, 200, 350, 500, 650].includes(node.position.y)
    );
    
    if (hasDefaultPositions) {
      formatNodes();
    }
  }, []); // Empty dependency array means this runs once on mount

  // Export structured JSON function
  const exportFlowJSON = useCallback(() => {
    // Analyze flow structure
    const dataNodes = nodes.filter(n => n.type === 'dataNode');
    const processNodes = nodes.filter(n => n.type === 'processNode');
    
    const rawInputs = dataNodes.filter(n => n.data.type === 'Raw');
    const intermediateData = dataNodes.filter(n => n.data.type === 'Intermediate');
    const outputs = dataNodes.filter(n => n.data.type === 'Output');
    
    const mainProcesses = processNodes.filter(n => n.data.processType === 'main-process');
    const nestedProcesses = processNodes.filter(n => n.data.processType === 'nested-process');
    
    // Build dependency map
    const dependencyMap = {};
    edges.forEach(edge => {
      if (!dependencyMap[edge.target]) {
        dependencyMap[edge.target] = [];
      }
      dependencyMap[edge.target].push(edge.source);
    });
    
    // Create structured export
    const exportData = {
      metadata: {
        flowName: "KYB/KYC Process Flow",
        exportDate: new Date().toISOString(),
        version: "1.0",
        totalNodes: nodes.length,
        totalEdges: edges.length,
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
            dependencies: dependencyMap[node.id] || [],
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
            dependencies: dependencyMap[node.id] || [],
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
      
      connections: edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceNode: nodes.find(n => n.id === edge.source)?.data.name,
        targetNode: nodes.find(n => n.id === edge.target)?.data.name
      })),
      
      processFlow: {
        entryPoints: rawInputs.map(n => n.id),
        exitPoints: outputs.map(n => n.id),
        criticalPath: [], // Could be calculated based on longest dependency chain
        parallelProcesses: [] // Could identify processes that can run in parallel
      }
    };
    
    // Download JSON file
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `kyb-flow-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

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

  // Workflow editing functions
  const handleEditWorkflow = () => {
    setTempName(currentWorkflow?.name || '');
    setTempTags((currentWorkflow?.tags || []).join(', '));
    setIsEditingWorkflow(true);
  };

  const handleSaveWorkflow = async () => {
    if (!currentWorkflow) {
      setIsEditingWorkflow(false);
      return;
    }

    try {
      setWorkflowUpdateLoading(true);
      
      // Stop auto-save during manual update to prevent version conflicts
      if (autoSaverRef.current) {
        autoSaverRef.current.stop();
      }
      
      // Retry logic for version conflicts
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        try {
          // Fetch the latest workflow data to get current version
          const latestWorkflow = await workflowAPI.get(currentWorkflow.id);
          
          const updates = {};
          
          // Check for name changes (allow clearing the name)
          if (tempName.trim() !== latestWorkflow.name) {
            updates.name = tempName.trim() || 'Untitled Workflow';
          }
          
          // Check for tag changes
          const newTags = tempTags
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
          
          const currentTagsStr = (latestWorkflow.tags || []).join(', ');
          const newTagsStr = newTags.join(', ');
          if (newTagsStr !== currentTagsStr) {
            updates.tags = newTags;
          }

          console.log('Workflow update payload:', {
            workflowId: latestWorkflow.id,
            currentVersion: latestWorkflow.version,
            updates,
            hasChanges: Object.keys(updates).length > 0,
            retryCount
          });

          if (Object.keys(updates).length > 0) {
            updates.version = latestWorkflow.version; // Use latest version
            const updatedWorkflow = await workflowAPI.update(latestWorkflow.id, updates);
            setCurrentWorkflow(updatedWorkflow);
            currentVersionRef.current = updatedWorkflow.version;
            console.log('Workflow updated successfully:', updatedWorkflow.name);
          } else {
            console.log('No changes detected, syncing to latest version');
            // Even with no changes, sync to latest version to prevent future conflicts
            setCurrentWorkflow(latestWorkflow);
            currentVersionRef.current = latestWorkflow.version;
          }
          
          // Success - break out of retry loop
          break;
          
        } catch (updateError) {
          // Check for version conflict by message or HTTP status code
          const isVersionConflict = updateError.message === 'Version conflict' || 
                                  updateError.status === 409 ||
                                  updateError.response?.status === 409;
                                  
          if (isVersionConflict && retryCount < maxRetries) {
            retryCount++;
            console.log(`Version conflict, retrying (${retryCount}/${maxRetries})...`);
            // Wait a brief moment before retrying
            await new Promise(resolve => setTimeout(resolve, 100));
            continue;
          } else {
            // Re-throw if not a version conflict or max retries exceeded
            throw updateError;
          }
        }
      }
      
      // Success - exit edit mode
      setIsEditingWorkflow(false);
    } catch (error) {
      console.error('Failed to update workflow - full error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack
      });
      
      // Keep edit mode open so user can retry
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      alert(`Failed to update workflow after retries: ${errorMessage}\n\nPlease try again or check for conflicts with other sessions.`);
      
      // Don't exit edit mode on failure - let user retry
      // setIsEditingWorkflow(false);
    } finally {
      // Always restart auto-save, no matter what happened
      if (autoSaverRef.current) {
        autoSaverRef.current.start();
      }
      setWorkflowUpdateLoading(false);
    }
  };

  const handleCancelWorkflowEdit = () => {
    setTempName(currentWorkflow?.name || '');
    setTempTags((currentWorkflow?.tags || []).join(', '));
    setIsEditingWorkflow(false);
  };

  return (
    <div className="w-screen h-screen flex flex-col">
      {/* Top Bar */}
      <div className="flex-shrink-0 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="px-4 py-3 flex items-center gap-2">
            {/* Back Button */}
            {onBackToManager && (
              <Button
                size="sm"
                variant="outline"
                onClick={onBackToManager}
                className="mr-2"
              >
                <ArrowLeft className="w-4 h-4 mr-1"/>Back
              </Button>
            )}
            
            {/* Title and Save Status */}
            <div className="flex items-center gap-3">
              {!isEditingWorkflow ? (
                <div className="flex items-center gap-2">
                  <div className="text-lg font-semibold">
                    {currentWorkflow?.name || 'KYB/KYC Flow Builder'}
                  </div>
                  {currentWorkflow && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleEditWorkflow}
                      className="h-6 w-6 p-1 text-gray-500 hover:text-gray-700"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  )}
                  {currentWorkflow?.tags && currentWorkflow.tags.length > 0 && (
                    <div className="flex items-center gap-1">
                      {currentWorkflow.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {currentWorkflow.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{currentWorkflow.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    placeholder="Workflow name"
                    className="text-lg font-semibold h-8 border-gray-300"
                    style={{ width: `${Math.max(tempName.length * 8 + 40, 200)}px` }}
                  />
                  <Input
                    value={tempTags}
                    onChange={(e) => setTempTags(e.target.value)}
                    placeholder="Tags (comma separated)"
                    className="h-8 text-sm border-gray-300"
                    style={{ width: `${Math.max(tempTags.length * 6 + 60, 150)}px` }}
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveWorkflow}
                    disabled={workflowUpdateLoading}
                    className="h-6 w-6 p-1"
                  >
                    {workflowUpdateLoading ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelWorkflowEdit}
                    disabled={workflowUpdateLoading}
                    className="h-6 w-6 p-1"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              
              {workflowId && (
                <div className="flex items-center gap-2 text-sm">
                  {saveStatus === 'saving' && (
                    <div className="flex items-center text-blue-600">
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-current mr-1"></div>
                      Saving...
                    </div>
                  )}
                  {saveStatus === 'saved' && (
                    <div className="flex items-center text-green-600">
                      <Save className="h-3 w-3 mr-1" />
                      {lastSaved ? `Saved at ${lastSaved.toLocaleTimeString()}` : 'Saved'}
                    </div>
                  )}
                  {saveStatus === 'error' && (
                    <div className="flex items-center text-red-600">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Save failed
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex-1" />
            
            {/* Manual Save Button */}
            {workflowId && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleManualSave}
                disabled={saveStatus === 'saving'}
                className="mr-2"
              >
                <Save className="w-4 h-4 mr-1"/>
                {saveStatus === 'saving' ? 'Saving...' : 'Save'}
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={formatNodes}
              className="mr-2"
            >
              <LayoutGrid className="w-4 h-4 mr-1"/>Format
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={exportFlowJSON}
              className="mr-2"
            >
              <Download className="w-4 h-4 mr-1"/>Export JSON
            </Button>

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
        <div className="flex-1 border-r" style={{ marginRight: inspectorWidth }}>
          <ReactFlow
            nodes={nodes.map(node => ({
              ...node,
              style: {
                ...node.style,
                opacity: highlightedNodes.size === 0 || highlightedNodes.has(node.id) ? 1 : 0.3,
                transition: 'opacity 0.2s ease-in-out'
              }
            }))}
            edges={edges.map(edge => ({
              ...edge,
              style: {
                ...edge.style,
                opacity: highlightedNodes.size === 0 || 
                         (highlightedNodes.has(edge.source) && highlightedNodes.has(edge.target)) ? 1 : 0.2,
                transition: 'opacity 0.2s ease-in-out'
              }
            }))}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            className="w-full h-full"
          >
            <MiniMap pannable zoomable />
            <Controls showInteractive={false} />
            <Background />
          </ReactFlow>
        </div>

        {/* Resizable Node Inspector Panel */}
        <div 
          className="flex-shrink-0 bg-gray-50 fixed right-0 top-0 bottom-0 flex"
          style={{ width: inspectorWidth }}
        >
          {/* Resize Handle */}
          <div
            className={`w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize flex items-center justify-center group transition-colors ${
              isDragging ? 'bg-blue-500' : ''
            }`}
            {...resizeHandleProps}
          >
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="w-3 h-3 text-white" />
            </div>
          </div>
          
          {/* Inspector Content */}
          <div className="flex-1 h-full overflow-y-auto">
            {/* Node Inspector */}
            <Card className="rounded-none border-0 h-full">
              <CardHeader className="border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="w-4 h-4" /> Node Inspector
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
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
