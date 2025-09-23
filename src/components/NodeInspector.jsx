import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';

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
    <div className="space-y-1 max-h-32 overflow-y-auto">
      {Object.entries(schema).map(([key, value]) => 
        renderSchemaItem(value, key, 0)
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
                <Label>Inputs (Data Nodes Only)</Label>
                <div className="max-h-60 overflow-y-auto border border-input rounded p-2 space-y-2">
                  {dataNodes.length === 0 ? (
                    <div className="text-muted-foreground text-sm">No data nodes available</div>
                  ) : (
                    dataNodes.map(n => (
                      <div key={n.id} className="border border-gray-200 rounded p-2">
                        <label className="flex items-center gap-2 text-sm cursor-pointer mb-2">
                          <input
                            type="checkbox"
                            checked={editData.inputs?.includes(n.id) || false}
                            onChange={() => handleInputToggle(n.id)}
                          />
                          <div className="flex-1">
                            <div className="font-medium">{n.data.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {n.data.type} • {n.data.dataType}
                            </div>
                          </div>
                        </label>
                        
                        {/* Schema Selection - only show if node is selected and has schema */}
                        {(editData.inputs?.includes(n.id) && n.data.schema) && (
                          <div className="ml-6 mt-2 border-l-2 border-blue-200 pl-3">
                            <div className="text-xs font-medium text-blue-600 mb-1">Select Data Fields:</div>
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
                        )}
                      </div>
                    ))
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
