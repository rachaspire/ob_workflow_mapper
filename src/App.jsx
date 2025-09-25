import React, { useState, useEffect } from 'react';
import Flow from './Flow';
import WorkflowManager from './components/WorkflowManager';
import { workflowAPI } from './lib/api';

function App() {
  const [currentView, setCurrentView] = useState('manager'); // 'manager' or 'editor'
  const [currentWorkflowId, setCurrentWorkflowId] = useState(null);
  const [currentWorkflow, setCurrentWorkflow] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load workflow when ID changes
  useEffect(() => {
    if (currentWorkflowId) {
      loadWorkflow(currentWorkflowId);
    }
  }, [currentWorkflowId]);

  const loadWorkflow = async (workflowId) => {
    try {
      setLoading(true);
      setError(null);
      const workflow = await workflowAPI.get(workflowId);
      setCurrentWorkflow(workflow);
      setCurrentView('editor');
    } catch (err) {
      setError('Failed to load workflow');
      console.error('Error loading workflow:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWorkflow = (workflowId) => {
    setCurrentWorkflowId(workflowId);
  };

  const handleCreateNew = () => {
    setCurrentWorkflowId(null);
    setCurrentWorkflow(null);
    setCurrentView('editor');
  };

  const handleBackToManager = () => {
    setCurrentView('manager');
    setCurrentWorkflowId(null);
    setCurrentWorkflow(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workflow...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 mb-4">Error: {error}</div>
          <button 
            onClick={handleBackToManager}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Manager
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {currentView === 'manager' ? (
        <WorkflowManager
          onSelectWorkflow={handleSelectWorkflow}
          onCreateNew={handleCreateNew}
          currentWorkflowId={currentWorkflowId}
        />
      ) : (
        <Flow
          workflow={currentWorkflow}
          workflowId={currentWorkflowId}
          onBackToManager={handleBackToManager}
        />
      )}
    </div>
  );
}

export default App;
