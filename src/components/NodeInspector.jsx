import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import JsonSchemaEditor from './JsonSchemaEditor';

// Schema Selector Component for nested object selection
const SchemaSelector = ({ schema, nodeId, selectedFields, onFieldToggle }) => {
  const renderSchemaItem = (item, path = '', level = 0) => {
    if (typeof item === 'string') {
      // Leaf node (primitive type)
      return (
        <div key={path} className={`flex items-center gap-1 text-xs ${level > 0 ? 'ml-4' : ''}`}>
          <input
            type="checkbox"
            checked={selectedFields[path] || false}
            onChange={(e) => onFieldToggle(path, e.target.checked)}
            className="w-3 h-3"
          />
          <span className="text-gray-600">{path.split('.').pop()}</span>
          <span className="text-gray-400">({item})</span>
        </div>
      );
    }

    if (Array.isArray(item)) {
      // Array type
      const arrayPath = path;
      const isSelected = selectedFields[arrayPath];
      const hasSelectedChildren = Object.keys(selectedFields).some(key => 
        key.startsWith(arrayPath + '.') && selectedFields[key]
      );

      return (
        <div key={path} className={level > 0 ? 'ml-4' : ''}>
          <div className="flex items-center gap-1 text-xs font-medium">
            <input
              type="checkbox"
              checked={isSelected || false}
              onChange={(e) => {
                onFieldToggle(arrayPath, e.target.checked);
                // If selecting parent, clear child selections
                if (e.target.checked) {
                  Object.keys(selectedFields).forEach(key => {
                    if (key.startsWith(arrayPath + '.')) {
                      onFieldToggle(key, false);
                    }
                  });
                }
              }}
              className="w-3 h-3"
            />
            <span className="text-blue-600">{arrayPath.split('.').pop() || 'root'}</span>
            <span className="text-gray-400">[array]</span>
          </div>
          
          {/* Show array item structure if not fully selected */}
          {!isSelected && item.length > 0 && (
            <div className="ml-4 mt-1 border-l border-gray-200 pl-2">
              {renderSchemaItem(item[0], `${arrayPath}[0]`, level + 1)}
            </div>
          )}
        </div>
      );
    }

    if (typeof item === 'object' && item !== null) {
      // Object type
      const objectPath = path;
      const isSelected = selectedFields[objectPath];
      const hasSelectedChildren = Object.keys(selectedFields).some(key => 
        key.startsWith(objectPath + '.') && selectedFields[key]
      );

      return (
        <div key={path} className={level > 0 ? 'ml-4' : ''}>
          <div className="flex items-center gap-1 text-xs font-medium">
            <input
              type="checkbox"
              checked={isSelected || false}
              onChange={(e) => {
                onFieldToggle(objectPath, e.target.checked);
                // If selecting parent, clear child selections
                if (e.target.checked) {
                  Object.keys(selectedFields).forEach(key => {
                    if (key.startsWith(objectPath + '.')) {
                      onFieldToggle(key, false);
                    }
                  });
                }
              }}
              className="w-3 h-3"
            />
            <span className="text-green-600">{objectPath.split('.').pop() || 'root'}</span>
            <span className="text-gray-400">{'{object}'}</span>
          </div>
          
          {/* Show object properties if not fully selected */}
          {!isSelected && (
            <div className="ml-4 mt-1 border-l border-gray-200 pl-2">
              {Object.entries(item).map(([key, value]) => 
                renderSchemaItem(value, objectPath ? `${objectPath}.${key}` : key, level + 1)
              )}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-1 max-h-40 overflow-y-auto">
      {Object.entries(schema).length === 0 ? (
        <div className="text-xs text-gray-500 italic p-2 bg-gray-50 rounded">
          No data structure defined yet. Edit the data node to define its JSON structure.
        </div>
      ) : (
        Object.entries(schema).map(([key, value]) => 
          renderSchemaItem(value, key, 0)
        )
      )}
    </div>
  );
};

const NodeInspector = ({ node, onUpdate, nodes, onConnect }) => {
  const [editData, setEditData] = useState(node.data);

  // Update editData when node changes
  useEffect(() => {
    setEditData(node.data);
  }, [node]);

  const handleSave = () => {
    onUpdate(editData);
  };

  // Get available data nodes for input/source selection
  const dataNodes = nodes.filter(n => n.type === 'dataNode' && n.id !== node.id);
  const processNodes = nodes.filter(n => n.type === 'processNode' && n.id !== node.id);

  // Handle input selection for process nodes
  const handleInputToggle = (nodeId) => {
    const currentInputs = editData.inputs || [];
    let newInputs;
    
    if (currentInputs.includes(nodeId)) {
      newInputs = currentInputs.filter(id => id !== nodeId);
    } else {
      newInputs = [...currentInputs, nodeId];
    }
    
    const updatedData = { ...editData, inputs: newInputs };
    setEditData(updatedData);
    onUpdate(updatedData);
    
    // Auto-connect/disconnect
    if (onConnect) {
      if (newInputs.includes(nodeId)) {
        onConnect({ source: nodeId, target: node.id });
      } else {
        // Remove connection (this would need to be handled in the parent)
        onConnect({ source: nodeId, target: node.id, remove: true });
      }
    }
  };

  // Handle source selection for data nodes
  const handleSourceChange = (sourceId) => {
    const updatedData = { ...editData, source: sourceId || null };
    setEditData(updatedData);
    onUpdate(updatedData);
    
    // Auto-connect
    if (onConnect && sourceId) {
      onConnect({ source: sourceId, target: node.id });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>ID</Label>
        <Input value={node.id} disabled className="bg-muted" />
      </div>

      <div>
        <Label>Name</Label>
        <Input
          value={editData.name}
          onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
        />
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={editData.description || ''}
          onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
        />
      </div>

      {node.type === 'dataNode' && (
        <>
          <div>
            <Label>Type</Label>
            <select
              value={editData.type}
              onChange={(e) => setEditData(prev => ({ ...prev, type: e.target.value }))}
              className="w-full border border-input rounded-md px-3 py-2 text-sm"
            >
              <option value="Raw">Raw</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Output">Output</option>
            </select>
          </div>

          <div>
            <Label>Data Type</Label>
            <select
              value={editData.dataType}
              onChange={(e) => setEditData(prev => ({ ...prev, dataType: e.target.value }))}
              className="w-full border border-input rounded-md px-3 py-2 text-sm"
            >
              <option value="JSON">JSON</option>
              <option value="List">List</option>
              <option value="Number">Number</option>
              <option value="Text">Text</option>
            </select>
          </div>

          {/* JSON Schema Editor for JSON data types */}
          {editData.dataType === 'JSON' && (
            <div>
              <JsonSchemaEditor 
                schema={editData.schema || {}}
                onChange={(newSchema) => {
                  const updatedData = { ...editData, schema: newSchema };
                  setEditData(updatedData);
                  onUpdate(updatedData);
                }}
              />
            </div>
          )}

          {editData.type !== 'Raw' && (
            <div>
              <Label>Source</Label>
              <select
                value={editData.source || ''}
                onChange={(e) => handleSourceChange(e.target.value)}
                className="w-full border border-input rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select source...</option>
                {processNodes.map(n => (
                  <option key={n.id} value={n.id}>
                    {n.data.name} (Process)
                  </option>
                ))}
                {dataNodes.map(n => (
                  <option key={n.id} value={n.id}>
                    {n.data.name} (Data)
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      )}

      {node.type === 'processNode' && (
        <>
          <div>
            <Label>Process Type</Label>
            <select
              value={editData.processType}
              onChange={(e) => setEditData(prev => ({ ...prev, processType: e.target.value }))}
              className="w-full border border-input rounded-md px-3 py-2 text-sm"
            >
              <option value="main-process">Main Process</option>
              <option value="nested-process">Nested Process</option>
            </select>
          </div>

          <div>
            <Label>Platform</Label>
            <div className="flex flex-wrap gap-2">
              {['Dash', 'n8n', 'Other'].map(platform => (
                <Button
                  key={platform}
                  type="button"
                  size="sm"
                  variant={editData.platform?.includes(platform) ? "default" : "outline"}
                  onClick={() => {
                    const currentPlatforms = editData.platform || [];
                    const newPlatforms = currentPlatforms.includes(platform)
                      ? currentPlatforms.filter(p => p !== platform)
                      : [...currentPlatforms, platform];
                    setEditData(prev => ({ ...prev, platform: newPlatforms }));
                  }}
                >
                  {platform}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label>Checks</Label>
            <div className="space-y-2">
              {editData.checks?.map((check, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={check}
                    onChange={(e) => {
                      const newChecks = [...(editData.checks || [])];
                      newChecks[idx] = e.target.value;
                      setEditData(prev => ({ ...prev, checks: newChecks }));
                    }}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const newChecks = editData.checks?.filter((_, i) => i !== idx) || [];
                      setEditData(prev => ({ ...prev, checks: newChecks }));
                    }}
                  >
                    ×
                  </Button>
                </div>
              )) || <div className="text-muted-foreground text-sm">No checks defined</div>}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const newChecks = [...(editData.checks || []), ''];
                  setEditData(prev => ({ ...prev, checks: newChecks }));
                }}
              >
                Add Check
              </Button>
            </div>
          </div>

              <div>
                <Label className="text-base font-medium">Input Data Sources</Label>
                <div className="text-sm text-muted-foreground mb-3">
                  Select which data sources this process will use as inputs
                </div>
                
                <div className="max-h-80 overflow-y-auto border border-input rounded-lg p-4 space-y-3">
                  {dataNodes.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      No data nodes available<br />
                      <span className="text-xs">Create data nodes first to use them as inputs</span>
                    </div>
                  ) : (
                    <>
                      {/* Raw Data Section */}
                      {dataNodes.filter(n => n.data.type === 'Raw').length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-300">
                              Raw Data
                            </Badge>
                            <span className="text-xs text-muted-foreground">Original input data</span>
                          </div>
                          {dataNodes.filter(n => n.data.type === 'Raw').map(n => (
                            <div key={n.id} className="border border-sky-200 bg-sky-50/50 rounded-lg p-3">
                              <label className="flex items-start gap-3 text-sm cursor-pointer mb-2">
                                <input
                                  type="checkbox"
                                  checked={editData.inputs?.includes(n.id) || false}
                                  onChange={() => handleInputToggle(n.id)}
                                  className="mt-1 w-4 h-4"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900">{n.data.name}</div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Type: {n.data.dataType}
                                    {n.data.description && (
                                      <span className="block mt-1">{n.data.description}</span>
                                    )}
                                  </div>
                                </div>
                              </label>
                              
                              {/* Enhanced Schema Selection */}
                              {(editData.inputs?.includes(n.id) && n.data.schema && Object.keys(n.data.schema).length > 0) && (
                                <div className="ml-7 mt-3 border-l-2 border-blue-300 pl-4 bg-white rounded-r p-3">
                                  <div className="text-xs font-medium text-blue-700 mb-2 flex items-center gap-1">
                                    📋 Select specific data fields to use:
                                  </div>
                                  <div className="bg-blue-50 rounded p-2">
                                    <SchemaSelector 
                                      schema={n.data.schema} 
                                      nodeId={n.id}
                                      selectedFields={editData.selectedFields?.[n.id] || {}}
                                      onFieldToggle={(path, selected) => {
                                        const newSelectedFields = { 
                                          ...editData.selectedFields,
                                          [n.id]: { 
                                            ...editData.selectedFields?.[n.id],
                                            [path]: selected 
                                          }
                                        };
                                        setEditData(prev => ({ ...prev, selectedFields: newSelectedFields }));
                                        onUpdate({ ...editData, selectedFields: newSelectedFields });
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Intermediate Data Section */}
                      {dataNodes.filter(n => n.data.type === 'Intermediate').length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-300">
                              Intermediate Data
                            </Badge>
                            <span className="text-xs text-muted-foreground">Processed data from other steps</span>
                          </div>
                          {dataNodes.filter(n => n.data.type === 'Intermediate').map(n => (
                            <div key={n.id} className="border border-violet-200 bg-violet-50/50 rounded-lg p-3">
                              <label className="flex items-start gap-3 text-sm cursor-pointer mb-2">
                                <input
                                  type="checkbox"
                                  checked={editData.inputs?.includes(n.id) || false}
                                  onChange={() => handleInputToggle(n.id)}
                                  className="mt-1 w-4 h-4"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900">{n.data.name}</div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Type: {n.data.dataType}
                                    {n.data.source && (
                                      <span className="block mt-1">Source: {n.data.source}</span>
                                    )}
                                    {n.data.description && (
                                      <span className="block mt-1">{n.data.description}</span>
                                    )}
                                  </div>
                                </div>
                              </label>
                              
                              {/* Enhanced Schema Selection */}
                              {(editData.inputs?.includes(n.id) && n.data.schema && Object.keys(n.data.schema).length > 0) && (
                                <div className="ml-7 mt-3 border-l-2 border-blue-300 pl-4 bg-white rounded-r p-3">
                                  <div className="text-xs font-medium text-blue-700 mb-2 flex items-center gap-1">
                                    📋 Select specific data fields to use:
                                  </div>
                                  <div className="bg-blue-50 rounded p-2">
                                    <SchemaSelector 
                                      schema={n.data.schema} 
                                      nodeId={n.id}
                                      selectedFields={editData.selectedFields?.[n.id] || {}}
                                      onFieldToggle={(path, selected) => {
                                        const newSelectedFields = { 
                                          ...editData.selectedFields,
                                          [n.id]: { 
                                            ...editData.selectedFields?.[n.id],
                                            [path]: selected 
                                          }
                                        };
                                        setEditData(prev => ({ ...prev, selectedFields: newSelectedFields }));
                                        onUpdate({ ...editData, selectedFields: newSelectedFields });
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Output Data Section */}
                      {dataNodes.filter(n => n.data.type === 'Output').length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
                              Output Data
                            </Badge>
                            <span className="text-xs text-muted-foreground">Final results from other processes</span>
                          </div>
                          {dataNodes.filter(n => n.data.type === 'Output').map(n => (
                            <div key={n.id} className="border border-emerald-200 bg-emerald-50/50 rounded-lg p-3">
                              <label className="flex items-start gap-3 text-sm cursor-pointer mb-2">
                                <input
                                  type="checkbox"
                                  checked={editData.inputs?.includes(n.id) || false}
                                  onChange={() => handleInputToggle(n.id)}
                                  className="mt-1 w-4 h-4"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900">{n.data.name}</div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Type: {n.data.dataType}
                                    {n.data.source && (
                                      <span className="block mt-1">Source: {n.data.source}</span>
                                    )}
                                    {n.data.description && (
                                      <span className="block mt-1">{n.data.description}</span>
                                    )}
                                  </div>
                                </div>
                              </label>
                              
                              {/* Enhanced Schema Selection */}
                              {(editData.inputs?.includes(n.id) && n.data.schema && Object.keys(n.data.schema).length > 0) && (
                                <div className="ml-7 mt-3 border-l-2 border-blue-300 pl-4 bg-white rounded-r p-3">
                                  <div className="text-xs font-medium text-blue-700 mb-2 flex items-center gap-1">
                                    📋 Select specific data fields to use:
                                  </div>
                                  <div className="bg-blue-50 rounded p-2">
                                    <SchemaSelector 
                                      schema={n.data.schema} 
                                      nodeId={n.id}
                                      selectedFields={editData.selectedFields?.[n.id] || {}}
                                      onFieldToggle={(path, selected) => {
                                        const newSelectedFields = { 
                                          ...editData.selectedFields,
                                          [n.id]: { 
                                            ...editData.selectedFields?.[n.id],
                                            [path]: selected 
                                          }
                                        };
                                        setEditData(prev => ({ ...prev, selectedFields: newSelectedFields }));
                                        onUpdate({ ...editData, selectedFields: newSelectedFields });
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
        </>
      )}

      <Button onClick={handleSave} className="w-full">
        Save Changes
      </Button>
    </div>
  );
};

export default NodeInspector;
