import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { X, Tag, Plus, Edit2 } from 'lucide-react';
import { workflowAPI } from '../lib/api';

function WorkflowEditor({ workflow, onUpdate }) {
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [tempTags, setTempTags] = useState((workflow?.tags || []).join(', '));
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);


  const handleTagsSave = async () => {
    const newTags = tempTags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    try {
      setLoading(true);
      const updatedWorkflow = await workflowAPI.update(workflow.id, {
        tags: newTags,
        version: workflow.version
      });
      onUpdate(updatedWorkflow);
      setIsEditingTags(false);
    } catch (error) {
      console.error('Failed to update workflow tags:', error);
      alert('Failed to update workflow tags');
      setTempTags((workflow?.tags || []).join(', '));
    } finally {
      setLoading(false);
    }
  };

  const handleTagRemove = async (tagToRemove) => {
    const newTags = (workflow?.tags || []).filter(tag => tag !== tagToRemove);
    
    try {
      setLoading(true);
      const updatedWorkflow = await workflowAPI.update(workflow.id, {
        tags: newTags,
        version: workflow.version
      });
      onUpdate(updatedWorkflow);
    } catch (error) {
      console.error('Failed to remove tag:', error);
      alert('Failed to remove tag');
    } finally {
      setLoading(false);
    }
  };

  const handleTagAdd = async () => {
    if (!newTag.trim()) return;
    
    const currentTags = workflow?.tags || [];
    if (currentTags.includes(newTag.trim())) {
      setNewTag('');
      return;
    }

    const newTags = [...currentTags, newTag.trim()];
    
    try {
      setLoading(true);
      const updatedWorkflow = await workflowAPI.update(workflow.id, {
        tags: newTags,
        version: workflow.version
      });
      onUpdate(updatedWorkflow);
      setNewTag('');
    } catch (error) {
      console.error('Failed to add tag:', error);
      alert('Failed to add tag');
    } finally {
      setLoading(false);
    }
  };

  if (!workflow) return null;

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="space-y-4">

          {/* Tags */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Tags
            </Label>
            
            {/* Existing Tags */}
            <div className="flex flex-wrap gap-2 mb-3">
              {(workflow.tags || []).map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-4 w-4 p-0 hover:bg-red-100"
                    onClick={() => handleTagRemove(tag)}
                    disabled={loading}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
              {(!workflow.tags || workflow.tags.length === 0) && (
                <span className="text-sm text-gray-500">No tags</span>
              )}
            </div>

            {/* Bulk Edit Tags */}
            {isEditingTags ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={tempTags}
                    onChange={(e) => setTempTags(e.target.value)}
                    placeholder="Enter tags separated by commas..."
                    className="flex-1"
                    disabled={loading}
                  />
                  <Button
                    size="sm"
                    onClick={handleTagsSave}
                    disabled={loading}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsEditingTags(false);
                      setTempTags((workflow.tags || []).join(', '));
                    }}
                    disabled={loading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Separate multiple tags with commas
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Quick Add Tag */}
                <div className="flex items-center gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleTagAdd()}
                    placeholder="Add a tag..."
                    className="flex-1 text-sm"
                    disabled={loading}
                  />
                  <Button
                    size="sm"
                    onClick={handleTagAdd}
                    disabled={loading || !newTag.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Bulk Edit Button */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsEditingTags(true);
                    setTempTags((workflow.tags || []).join(', '));
                  }}
                  disabled={loading}
                  className="text-xs"
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  Edit All Tags
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default WorkflowEditor;