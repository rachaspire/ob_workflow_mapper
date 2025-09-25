import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { 
  Plus, 
  Search, 
  Download, 
  Upload, 
  Copy, 
  Trash2, 
  Eye, 
  Calendar,
  FileText,
  Tag,
  AlertCircle
} from 'lucide-react';
import { workflowAPI } from '../lib/api';

function WorkflowManager({ onSelectWorkflow, onCreateNew, currentWorkflowId }) {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [importData, setImportData] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);

  // Load workflows on component mount
  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await workflowAPI.list({
        q: searchQuery || undefined,
        limit: 50
      });
      setWorkflows(response.workflows);
    } catch (err) {
      setError('Failed to load workflows');
      console.error('Error loading workflows:', err);
    } finally {
      setLoading(false);
    }
  };

  // Search workflows
  const handleSearch = async () => {
    await loadWorkflows();
  };

  // Create new workflow
  const handleCreateWorkflow = async () => {
    if (!newWorkflowName.trim()) return;
    
    try {
      const newWorkflow = await workflowAPI.create({
        name: newWorkflowName,
        description: '',
        tags: [],
        canvas: {
          nodes: [],
          edges: [],
          metadata: {
            flowName: newWorkflowName,
            version: "1.0",
            totalNodes: 0,
            totalEdges: 0
          }
        }
      });
      
      setNewWorkflowName('');
      setShowCreateForm(false);
      onSelectWorkflow(newWorkflow.id);
      loadWorkflows();
    } catch (err) {
      setError('Failed to create workflow');
      console.error('Error creating workflow:', err);
    }
  };

  // Import workflow
  const handleImportWorkflow = async () => {
    try {
      const exportData = JSON.parse(importData);
      const imported = await workflowAPI.import({
        name: exportData.metadata?.flowName || 'Imported Workflow',
        description: 'Imported from JSON export',
        tags: ['imported'],
        exportData
      });
      
      setImportData('');
      setShowImportModal(false);
      onSelectWorkflow(imported.id);
      loadWorkflows();
    } catch (err) {
      setError('Failed to import workflow. Please check the JSON format.');
      console.error('Error importing workflow:', err);
    }
  };

  // Export workflow
  const handleExportWorkflow = async (workflowId) => {
    try {
      const exportData = await workflowAPI.export(workflowId);
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workflow-${workflowId}-export.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export workflow');
      console.error('Error exporting workflow:', err);
    }
  };

  // Duplicate workflow
  const handleDuplicateWorkflow = async (workflowId) => {
    try {
      const duplicated = await workflowAPI.duplicate(workflowId);
      onSelectWorkflow(duplicated.id);
      loadWorkflows();
    } catch (err) {
      setError('Failed to duplicate workflow');
      console.error('Error duplicating workflow:', err);
    }
  };

  // Delete workflow
  const handleDeleteWorkflow = async (workflowId) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    
    try {
      await workflowAPI.delete(workflowId);
      loadWorkflows();
      if (currentWorkflowId === workflowId) {
        onCreateNew();
      }
    } catch (err) {
      setError('Failed to delete workflow');
      console.error('Error deleting workflow:', err);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-pulse">Loading workflows...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Workflow Manager</h1>
          <p className="text-gray-600">Manage your KYB/KYC process workflows</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="text-red-700">{error}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setError(null)}
              className="ml-auto"
            >
              ×
            </Button>
          </div>
        )}

        {/* Actions Bar */}
        <div className="mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search workflows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
          </div>
          
          <Button onClick={handleSearch} variant="outline">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
          
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Workflow
          </Button>
          
          <Button onClick={() => setShowImportModal(true)} variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          
          <Button onClick={onCreateNew} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Blank Canvas
          </Button>
        </div>

        {/* Create Form Modal */}
        {showCreateForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Create New Workflow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="workflow-name">Workflow Name</Label>
                  <Input
                    id="workflow-name"
                    value={newWorkflowName}
                    onChange={(e) => setNewWorkflowName(e.target.value)}
                    placeholder="Enter workflow name..."
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateWorkflow()}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateWorkflow} disabled={!newWorkflowName.trim()}>
                    Create
                  </Button>
                  <Button onClick={() => setShowCreateForm(false)} variant="outline">
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Import Modal */}
        {showImportModal && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Import Workflow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="import-data">JSON Export Data</Label>
                  <textarea
                    id="import-data"
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder="Paste your exported workflow JSON here..."
                    className="w-full h-40 p-3 border border-gray-300 rounded-md resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleImportWorkflow} disabled={!importData.trim()}>
                    Import
                  </Button>
                  <Button onClick={() => setShowImportModal(false)} variant="outline">
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Workflows Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((workflow) => (
            <Card 
              key={workflow.id}
              className={`relative transition-all hover:shadow-lg ${
                currentWorkflowId === workflow.id ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-1">{workflow.name}</CardTitle>
                  {currentWorkflowId === workflow.id && (
                    <Badge variant="secondary" className="ml-2">Current</Badge>
                  )}
                </div>
                {workflow.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{workflow.description}</p>
                )}
              </CardHeader>
              
              <CardContent className="pt-0">
                {/* Stats */}
                <div className="flex gap-4 text-sm text-gray-500 mb-3">
                  <span>{workflow.total_nodes || 0} nodes</span>
                  <span>{workflow.total_edges || 0} edges</span>
                  <span>v{workflow.version}</span>
                </div>
                
                {/* Tags */}
                {workflow.tags && workflow.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {workflow.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                    {workflow.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{workflow.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
                
                {/* Date */}
                <div className="flex items-center text-xs text-gray-500 mb-4">
                  <Calendar className="h-3 w-3 mr-1" />
                  Updated {formatDate(workflow.updated_at)}
                </div>
                
                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => onSelectWorkflow(workflow.id)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Open
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDuplicateWorkflow(workflow.id)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleExportWorkflow(workflow.id)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDeleteWorkflow(workflow.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {workflows.length === 0 && !loading && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows found</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery ? 'No workflows match your search.' : 'Get started by creating your first workflow.'}
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Workflow
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkflowManager;