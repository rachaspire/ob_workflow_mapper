import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';

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
            <div className="max-h-40 overflow-y-auto border border-input rounded p-2 space-y-2">
              {dataNodes.length === 0 ? (
                <div className="text-muted-foreground text-sm">No data nodes available</div>
              ) : (
                dataNodes.map(n => (
                  <label key={n.id} className="flex items-center gap-2 text-sm cursor-pointer">
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
