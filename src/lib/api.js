// API service functions for workflow management

const API_BASE = '/api';

// Helper function for API requests
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  
  return response.json();
}

// Workflow API functions
export const workflowAPI = {
  // Get list of workflows
  async list(params = {}) {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, v));
        } else {
          searchParams.append(key, value);
        }
      }
    });
    
    const endpoint = `/workflows${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    return apiRequest(endpoint);
  },

  // Get specific workflow
  async get(id) {
    return apiRequest(`/workflows/${id}`);
  },

  // Create new workflow
  async create(workflow) {
    return apiRequest('/workflows', {
      method: 'POST',
      body: JSON.stringify(workflow),
    });
  },

  // Update workflow
  async update(id, workflow) {
    return apiRequest(`/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(workflow),
    });
  },

  // Delete workflow (soft delete)
  async delete(id) {
    return apiRequest(`/workflows/${id}`, {
      method: 'DELETE',
    });
  },

  // Duplicate workflow
  async duplicate(id) {
    return apiRequest(`/workflows/${id}/duplicate`, {
      method: 'POST',
    });
  },

  // Import workflow from JSON
  async import(data) {
    return apiRequest('/workflows/import', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Export workflow
  async export(id) {
    return apiRequest(`/workflows/${id}/export`);
  },
};

// Auto-save functionality
export class AutoSaver {
  constructor(workflowId, onSave) {
    this.workflowId = workflowId;
    this.onSave = onSave;
    this.timeoutId = null;
    this.isActive = false;
  }

  // Schedule auto-save with debouncing
  schedule(canvas, version) {
    if (!this.isActive) return;
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    this.timeoutId = setTimeout(async () => {
      try {
        const updatedWorkflow = await workflowAPI.update(this.workflowId, { canvas, version });
        this.onSave?.(null, updatedWorkflow); // Success callback with updated workflow
      } catch (error) {
        this.onSave?.(error); // Error callback
      }
    }, 2000); // 2 second debounce
  }

  // Start auto-saving
  start() {
    this.isActive = true;
  }

  // Stop auto-saving
  stop() {
    this.isActive = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

export default workflowAPI;