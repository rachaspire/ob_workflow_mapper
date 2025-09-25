import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Plus, Trash2, ChevronDown, ChevronRight, FileJson } from 'lucide-react';

const JsonSchemaEditor = ({ schema = {}, onChange }) => {
  const [expandedPaths, setExpandedPaths] = useState(new Set(['root']));
  const [editingSchema, setEditingSchema] = useState(schema);

  useEffect(() => {
    setEditingSchema(schema);
  }, [schema]);

  const togglePath = (path) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedPaths(newExpanded);
  };

  const updateSchema = (newSchema) => {
    setEditingSchema(newSchema);
    onChange(newSchema);
  };

  const addProperty = (parentPath, parentObj) => {
    let newKey = `property_${Date.now()}`;
    let counter = 1;
    
    // Ensure unique property name
    while (parentObj.hasOwnProperty(newKey)) {
      newKey = `property_${Date.now()}_${counter}`;
      counter++;
    }
    
    const newObj = { ...parentObj, [newKey]: 'string' };
    
    if (parentPath === 'root') {
      updateSchema(newObj);
    } else {
      const newSchema = { ...editingSchema };
      setNestedProperty(newSchema, parentPath, newObj);
      updateSchema(newSchema);
    }
  };

  const removeProperty = (parentPath, parentObj, keyToRemove) => {
    const { [keyToRemove]: removed, ...newObj } = parentObj;
    
    if (parentPath === 'root') {
      updateSchema(newObj);
    } else {
      const newSchema = { ...editingSchema };
      setNestedProperty(newSchema, parentPath, newObj);
      updateSchema(newSchema);
    }
  };

  const updatePropertyKey = (parentPath, parentObj, oldKey, newKey) => {
    if (oldKey === newKey) return;
    
    // Validation: check for empty or duplicate keys
    if (!newKey.trim()) {
      alert('Property name cannot be empty');
      return;
    }
    
    if (newKey !== oldKey && parentObj.hasOwnProperty(newKey)) {
      alert(`Property "${newKey}" already exists. Please choose a different name.`);
      return;
    }
    
    const { [oldKey]: value, ...rest } = parentObj;
    const newObj = { ...rest, [newKey]: value };
    
    if (parentPath === 'root') {
      updateSchema(newObj);
    } else {
      const newSchema = { ...editingSchema };
      setNestedProperty(newSchema, parentPath, newObj);
      updateSchema(newSchema);
    }
  };

  const updatePropertyType = (parentPath, parentObj, key, newType) => {
    let newValue;
    switch (newType) {
      case 'string':
        newValue = 'string';
        break;
      case 'number':
        newValue = 'number';
        break;
      case 'boolean':
        newValue = 'boolean';
        break;
      case 'object':
        newValue = {};
        break;
      case 'array':
        newValue = ['string']; // Default array of strings
        break;
      default:
        newValue = 'string';
    }
    
    const newObj = { ...parentObj, [key]: newValue };
    
    if (parentPath === 'root') {
      updateSchema(newObj);
    } else {
      const newSchema = { ...editingSchema };
      setNestedProperty(newSchema, parentPath, newObj);
      updateSchema(newSchema);
    }
  };

  const setNestedProperty = (obj, path, value) => {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (key === 'root') continue;
      if (!(key in current)) current[key] = {};
      current = current[key];
    }
    
    const lastKey = keys[keys.length - 1];
    if (lastKey !== 'root') {
      current[lastKey] = value;
    }
  };

  const getPropertyType = (value) => {
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object' && value !== null) return 'object';
    return 'string';
  };

  const renderProperty = (key, value, path, parentObj, level = 0) => {
    const fullPath = path === 'root' ? key : `${path}.${key}`;
    const isExpanded = expandedPaths.has(fullPath);
    const propertyType = getPropertyType(value);
    const indent = level * 20;

    return (
      <div key={fullPath} className="border border-gray-200 rounded-lg p-3 mb-2" style={{ marginLeft: `${indent}px` }}>
        <div className="flex items-center gap-2 mb-2">
          {(propertyType === 'object' || propertyType === 'array') && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => togglePath(fullPath)}
              className="h-6 w-6 p-0"
            >
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          )}
          
          <div className="flex-1 flex items-center gap-2">
            <Input
              placeholder="Property name"
              value={key}
              onChange={(e) => updatePropertyKey(path, parentObj, key, e.target.value)}
              className="h-8 text-sm font-mono"
              style={{ maxWidth: '150px' }}
            />
            
            <select
              value={propertyType}
              onChange={(e) => updatePropertyType(path, parentObj, key, e.target.value)}
              className="h-8 px-2 text-sm border border-input rounded"
            >
              <option value="string">Text</option>
              <option value="number">Number</option>
              <option value="boolean">True/False</option>
              <option value="object">Object</option>
              <option value="array">Array</option>
            </select>
            
            <div className="text-xs text-gray-500 px-2 py-1 bg-gray-50 rounded">
              {propertyType === 'object' ? '{...}' : 
               propertyType === 'array' ? '[...]' : 
               propertyType}
            </div>
          </div>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => removeProperty(path, parentObj, key)}
            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {/* Nested properties for objects */}
        {propertyType === 'object' && isExpanded && (
          <div className="ml-4 mt-2 border-l-2 border-blue-200 pl-3">
            {Object.entries(value).map(([nestedKey, nestedValue]) =>
              renderProperty(nestedKey, nestedValue, fullPath, value, level + 1)
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => addProperty(fullPath, value)}
              className="mt-2 h-8 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Property
            </Button>
          </div>
        )}

        {/* Array item editor for arrays */}
        {propertyType === 'array' && isExpanded && (
          <div className="ml-4 mt-2 border-l-2 border-green-200 pl-3">
            <div className="text-xs text-gray-600 mb-2">Array items are of type:</div>
            <select
              value={getPropertyType(value[0])}
              onChange={(e) => {
                let newItemType;
                switch (e.target.value) {
                  case 'string': newItemType = 'string'; break;
                  case 'number': newItemType = 'number'; break;
                  case 'boolean': newItemType = 'boolean'; break;
                  case 'object': newItemType = {}; break;
                  default: newItemType = 'string';
                }
                
                const newArray = [newItemType];
                const newObj = { ...parentObj, [key]: newArray };
                
                if (path === 'root') {
                  updateSchema(newObj);
                } else {
                  const newSchema = { ...editingSchema };
                  setNestedProperty(newSchema, path, newObj);
                  updateSchema(newSchema);
                }
              }}
              className="h-8 px-2 text-sm border border-input rounded"
            >
              <option value="string">Text</option>
              <option value="number">Number</option>
              <option value="boolean">True/False</option>
              <option value="object">Object</option>
            </select>
            
            {getPropertyType(value[0]) === 'object' && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                <div className="text-xs font-medium text-green-700 mb-2">Array Item Structure:</div>
                {Object.entries(value[0]).map(([itemKey, itemValue]) =>
                  <div key={itemKey} className="border border-green-200 rounded-lg p-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Property name"
                        value={itemKey}
                        onChange={(e) => {
                          const newItemKey = e.target.value;
                          if (newItemKey === itemKey) return;
                          
                          // Validation for array item properties
                          if (!newItemKey.trim()) {
                            alert('Property name cannot be empty');
                            return;
                          }
                          
                          if (newItemKey !== itemKey && value[0].hasOwnProperty(newItemKey)) {
                            alert(`Property "${newItemKey}" already exists in array item structure.`);
                            return;
                          }
                          
                          const { [itemKey]: itemVal, ...rest } = value[0];
                          const newItemObj = { ...rest, [newItemKey]: itemVal };
                          const newArray = [newItemObj];
                          const newObj = { ...parentObj, [key]: newArray };
                          
                          if (path === 'root') {
                            updateSchema(newObj);
                          } else {
                            const newSchema = { ...editingSchema };
                            setNestedProperty(newSchema, path, newObj);
                            updateSchema(newSchema);
                          }
                        }}
                        className="h-6 text-xs font-mono flex-1"
                      />
                      
                      <select
                        value={getPropertyType(itemValue)}
                        onChange={(e) => {
                          let newType;
                          switch (e.target.value) {
                            case 'string': newType = 'string'; break;
                            case 'number': newType = 'number'; break;
                            case 'boolean': newType = 'boolean'; break;
                            case 'object': newType = {}; break;
                            default: newType = 'string';
                          }
                          
                          const newItemObj = { ...value[0], [itemKey]: newType };
                          const newArray = [newItemObj];
                          const newObj = { ...parentObj, [key]: newArray };
                          
                          if (path === 'root') {
                            updateSchema(newObj);
                          } else {
                            const newSchema = { ...editingSchema };
                            setNestedProperty(newSchema, path, newObj);
                            updateSchema(newSchema);
                          }
                        }}
                        className="h-6 px-1 text-xs border border-input rounded"
                      >
                        <option value="string">Text</option>
                        <option value="number">Number</option>
                        <option value="boolean">True/False</option>
                        <option value="object">Object</option>
                      </select>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const { [itemKey]: removed, ...rest } = value[0];
                          const newArray = [rest];
                          const newObj = { ...parentObj, [key]: newArray };
                          
                          if (path === 'root') {
                            updateSchema(newObj);
                          } else {
                            const newSchema = { ...editingSchema };
                            setNestedProperty(newSchema, path, newObj);
                            updateSchema(newSchema);
                          }
                        }}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    let newKey = `item_property_${Date.now()}`;
                    let counter = 1;
                    
                    // Ensure unique property name within array item
                    while (value[0].hasOwnProperty(newKey)) {
                      newKey = `item_property_${Date.now()}_${counter}`;
                      counter++;
                    }
                    
                    const newItemObj = { ...value[0], [newKey]: 'string' };
                    const newArray = [newItemObj];
                    const newObj = { ...parentObj, [key]: newArray };
                    
                    if (path === 'root') {
                      updateSchema(newObj);
                    } else {
                      const newSchema = { ...editingSchema };
                      setNestedProperty(newSchema, path, newObj);
                      updateSchema(newSchema);
                    }
                  }}
                  className="h-6 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Property
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <FileJson className="h-4 w-4 text-blue-600" />
        <Label className="font-medium">JSON Data Structure</Label>
      </div>
      
      {Object.keys(editingSchema).length === 0 ? (
        <div className="text-center py-6 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
          <FileJson className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <div className="text-gray-600 text-sm mb-3">No data structure defined yet</div>
          <Button
            size="sm"
            onClick={() => addProperty('root', editingSchema)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add First Property
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {Object.entries(editingSchema).map(([key, value]) =>
            renderProperty(key, value, 'root', editingSchema, 0)
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => addProperty('root', editingSchema)}
            className="w-full"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Property
          </Button>
        </div>
      )}
      
      {Object.keys(editingSchema).length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-xs font-medium text-blue-800 mb-1">Preview:</div>
          <pre className="text-xs text-blue-700 font-mono overflow-x-auto">
            {JSON.stringify(editingSchema, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default JsonSchemaEditor;