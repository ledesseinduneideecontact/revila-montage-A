import React from 'react';
import { TransitionType, TimelineItem } from '../types';

interface TransitionSelectorProps {
  timeline: TimelineItem[];
  onTransitionUpdate: (itemId: string, transition: TransitionType, duration: number) => void;
}

const transitions: { type: TransitionType; label: string; description: string }[] = [
  { type: 'crossfade', label: 'Crossfade', description: 'Smooth fade between clips' },
  { type: 'fade', label: 'Fade', description: 'Fade to black then to next' },
  { type: 'slide-left', label: 'Slide Left', description: 'Slide from right to left' },
  { type: 'slide-right', label: 'Slide Right', description: 'Slide from left to right' },
  { type: 'wipe', label: 'Wipe', description: 'Wipe effect transition' },
  { type: 'cut', label: 'Cut', description: 'Direct cut, no transition' },
];

const TransitionSelector: React.FC<TransitionSelectorProps> = ({ timeline, onTransitionUpdate }) => {
  if (timeline.length <= 1) {
    return (
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Transitions</h2>
        <p className="text-gray-500">Add at least 2 items to the timeline to configure transitions</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Transitions</h2>
      <div className="space-y-4">
        {timeline.slice(0, -1).map((item, index) => (
          <div key={item.id} className="bg-white rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-sm font-semibold">
                Transition {index + 1} (After clip {index + 1})
              </h3>
              <span className="text-xs text-gray-500">
                {item.endTime.toFixed(1)}s → {timeline[index + 1].startTime.toFixed(1)}s
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              {transitions.map(trans => (
                <button
                  key={trans.type}
                  onClick={() => onTransitionUpdate(item.id, trans.type, item.transitionDuration || 1)}
                  className={`text-left p-2 rounded border transition-colors ${
                    item.transition === trans.type
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-medium text-sm">{trans.label}</div>
                  <div className="text-xs text-gray-500">{trans.description}</div>
                </button>
              ))}
            </div>

            {item.transition !== 'cut' && (
              <div className="flex items-center gap-3">
                <label className="text-sm">Duration:</label>
                <input
                  type="number"
                  min="0.5"
                  max="3"
                  step="0.5"
                  value={item.transitionDuration || 1}
                  onChange={(e) => onTransitionUpdate(item.id, item.transition || 'fade', Number(e.target.value))}
                  className="w-20 px-2 py-1 text-sm border rounded"
                />
                <span className="text-sm text-gray-500">seconds</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransitionSelector;