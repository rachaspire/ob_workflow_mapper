import React, { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Plus } from 'lucide-react';

const CreateNodeForm = ({ nodeType, onSubmit, onCancel, existingNodes }) => {
  const [formData, setFormData] = useState({
    nodeType,
    name: '',
    description: '',
    type: nodeType === 'data' ? 'Raw' : 'main-process',
    dataType: 'JSON',
    source: null,
    platform: [],
    checks: [],
    inputs: [],
    processType: 'main-process',
  });

  const [newCheck, setNewCheck] = useState('');

  const dataNodes = useMemo(() => 
    existingNodes.filter(node => node.type === 'dataNode'),
    [existingNodes]
  );

  const processNodes = useMemo(() => 
    existingNodes.filter(node => node.type === 'processNode'),
    [existingNodes]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSubmit(formData);
  };

  const addCheck = () => {
    if (newCheck.trim()) {
      setFormData(prev => ({
        ...prev,
        checks: [...prev.checks, newCheck.trim()]
      }));
      setNewCheck('');
    }
  };

  const removeCheck = (index) => {
    setFormData(prev => ({
      ...prev,
      checks: prev.checks.filter((_, i) => i !== index)
    }));
  };

  const togglePlatform = (platform) => {
    setFormData(prev => ({
      ...prev,
      platform: prev.platform.includes(platform)
        ? prev.platform.filter(p => p !== platform)
        : [...prev.platform, platform]
    }));
  };

  const toggleInput = (nodeId) => {
    setFormData(prev => ({
      ...prev,
      inputs: prev.inputs.includes(nodeId)
        ? prev.inputs.filter(id => id !== nodeId)
        : [...prev.inputs, nodeId]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          Create {nodeType === 'data' ? 'Data' : 'Process'} Node
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter node name"
              required
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter description"
            />
          </div>

          {nodeType === 'data' ? (
            <>
              <div>
                <Label>Type</Label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full border border-input rounded-md px-3 py-2"
                >
                  <option value="Raw">Raw</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Output">Output</option>
                </select>
              </div>

              <div>
                <Label>Data Type</Label>
                <select
                  value={formData.dataType}
                  onChange={(e) => setFormData(prev => ({ ...prev, dataType: e.target.value }))}
                  className="w-full border border-input rounded-md px-3 py-2"
                >
                  <option value="JSON">JSON</option>
                  <option value="List">List</option>
                  <option value="Number">Number</option>
                  <option value="Text">Text</option>
                </select>
              </div>

              {formData.type !== 'Raw' && (
                <div>
                  <Label>Source</Label>
                  <select
                    value={formData.source || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value || null }))}
                    className="w-full border border-input rounded-md px-3 py-2"
                  >
                    <option value="">Select source...</option>
                    {processNodes.map(node => (
                      <option key={node.id} value={node.id}>
                        {node.data.name} (Process)
                      </option>
                    ))}
                    {dataNodes.map(node => (
                      <option key={node.id} value={node.id}>
                        {node.data.name} (Data)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <Label>Process Type</Label>
                <select
                  value={formData.processType}
                  onChange={(e) => setFormData(prev => ({ ...prev, processType: e.target.value }))}
                  className="w-full border border-input rounded-md px-3 py-2"
                >
                  <option value="main-process">Main Process</option>
                  <option value="nested-process">Nested Process</option>
                </select>
              </div>

              <div>
                <Label>Platform</Label>
                <div className="flex gap-2">
                  {['Dash', 'n8n', 'Other'].map(platform => (
                    <Button
                      key={platform}
                      type="button"
                      size="sm"
                      variant={formData.platform.includes(platform) ? "default" : "outline"}
                      onClick={() => togglePlatform(platform)}
                    >
                      {platform}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Checks</Label>
                <div className="space-y-2">
                  {formData.checks.map((check, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="flex-1 text-sm bg-muted px-2 py-1 rounded">{check}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => removeCheck(index)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={newCheck}
                      onChange={(e) => setNewCheck(e.target.value)}
                      placeholder="Add a check..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCheck())}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={addCheck}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <Label>Inputs (Data Nodes Only)</Label>
                <div className="max-h-32 overflow-y-auto border border-input rounded p-2">
                  {dataNodes.length === 0 ? (
                    <div className="text-muted-foreground text-sm">No data nodes available</div>
                  ) : (
                    dataNodes.map(node => (
                      <label key={node.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.inputs.includes(node.id)}
                          onChange={() => toggleInput(node.id)}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{node.data.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {node.data.type} • {node.data.dataType}
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">
              Create Node
            </Button>
            <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateNodeForm;
