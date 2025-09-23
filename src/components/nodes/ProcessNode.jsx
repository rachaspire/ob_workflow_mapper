import React from 'react';
import { Handle, Position } from 'reactflow';
import { Factory } from 'lucide-react';

const ProcessNode = ({ id, data }) => {
  // Color coding based on process type
  const getNodeStyle = () => {
    if (data.processType === "nested-process") {
      return { bg: "bg-orange-50", border: "border-orange-300", label: "Nested Process" };
    }
    return { bg: "bg-amber-50", border: "border-amber-300", label: "Main Process" };
  };

  const style = getNodeStyle();

  return (
    <div className={`rounded-2xl border ${style.border} ${style.bg} shadow-sm px-3 py-2 w-[260px] relative`}>
      <Handle id={`${id}-t`} type="target" position={Position.Top} style={{ width: 10, height: 10 }} />
      <Handle id={`${id}-l`} type="target" position={Position.Left} style={{ width: 10, height: 10 }} />

      <div className="flex items-center gap-2 mb-2">
        <div className="p-1 rounded-md bg-white/80 border shadow-sm">
          <Factory className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{data.name}</div>
          <div className="text-[11px] text-muted-foreground">{style.label}</div>
        </div>
      </div>
      
      <div className="mt-2 text-xs space-y-1">
        {data.platform && data.platform.length > 0 && (
          <div className="flex items-center justify-between">
            <span>Platform:</span>
            <span>{data.platform.join(', ')}</span>
          </div>
        )}
        {data.checks && data.checks.length > 0 && (
          <div>
            <div className="text-muted-foreground mb-1">Checks ({data.checks.length}):</div>
            <div className="space-y-1">
              {data.checks.slice(0, 2).map((check, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-current opacity-60"></div>
                  <span className="line-clamp-1">{check}</span>
                </div>
              ))}
              {data.checks.length > 2 && (
                <div className="text-muted-foreground">+{data.checks.length - 2} more</div>
              )}
            </div>
          </div>
        )}
        {data.description && (
          <div className="text-muted-foreground text-xs mt-2 line-clamp-2">
            {data.description}
          </div>
        )}
      </div>

      <Handle id={`${id}-b`} type="source" position={Position.Bottom} style={{ width: 10, height: 10 }} />
      <Handle id={`${id}-r`} type="source" position={Position.Right} style={{ width: 10, height: 10 }} />
    </div>
  );
};

export default ProcessNode;
