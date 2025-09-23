import React from 'react';
import { Handle, Position } from 'reactflow';
import { Database, Settings2, ShieldCheck } from 'lucide-react';

// Node styling
const colors = {
  layerRaw: { bg: "bg-sky-50", border: "border-sky-300" },
  layerIntermediate: { bg: "bg-violet-50", border: "border-violet-300" },
  layerOutput: { bg: "bg-emerald-50", border: "border-emerald-300" },
};

function nodeStyle(data) {
  if (data.type === "Raw") return { ...colors.layerRaw, icon: <Database className="w-4 h-4" />, label: "Raw Data" };
  if (data.type === "Intermediate") return { ...colors.layerIntermediate, icon: <Settings2 className="w-4 h-4" />, label: "Intermediate Data" };
  return { ...colors.layerOutput, icon: <ShieldCheck className="w-4 h-4" />, label: "Output Data" };
}

const DataNode = ({ id, data }) => {
  const style = nodeStyle(data);

  return (
    <div className={`rounded-2xl border ${style.border} ${style.bg} shadow-sm px-3 py-2 w-[260px] relative`}>
      {/* Target handle (incoming connections from left) */}
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ 
          width: 12, 
          height: 12, 
          background: '#6b7280',
          border: '2px solid white'
        }} 
      />

      <div className="flex items-center gap-2 mb-2">
        <div className="p-1 rounded-md bg-white/80 border shadow-sm">{style.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{data.name}</div>
          <div className="text-[11px] text-muted-foreground">{style.label}</div>
        </div>
      </div>
      
      <div className="mt-2 text-xs space-y-1">
        <div className="flex items-center justify-between">
          <span>Data Type:</span>
          <span className="font-mono">{data.dataType}</span>
        </div>
        {data.source && (
          <div className="flex items-center justify-between">
            <span>Source:</span>
            <span className="font-medium text-xs truncate">{data.source}</span>
          </div>
        )}
        {data.description && (
          <div className="text-muted-foreground text-xs mt-2 line-clamp-2">
            {data.description}
          </div>
        )}
      </div>

      {/* Source handle (outgoing connections to right) */}
      <Handle 
        type="source" 
        position={Position.Right} 
        style={{ 
          width: 12, 
          height: 12, 
          background: '#6b7280',
          border: '2px solid white'
        }} 
      />
    </div>
  );
};

export default DataNode;
