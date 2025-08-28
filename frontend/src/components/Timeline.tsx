import React, { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { Clock, GripVertical } from 'lucide-react';
import { MediaFile, TimelineItem } from '../types';

interface TimelineProps {
  mediaFiles: MediaFile[];
  timeline: TimelineItem[];
  onTimelineUpdate: (timeline: TimelineItem[]) => void;
}

interface SortableItemProps {
  item: TimelineItem;
  media: MediaFile | undefined;
  onDurationChange: (id: string, duration: number) => void;
}

const SortableItem: React.FC<SortableItemProps> = ({ item, media, onDurationChange }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (!media) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-lg shadow-md p-3 cursor-move hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start gap-2">
        <div {...attributes} {...listeners} className="mt-1">
          <GripVertical className="w-5 h-5 text-gray-400" />
        </div>
        <div className="flex-1">
          {media.type === 'image' || media.thumbnail ? (
            <img
              src={media.type === 'image' ? media.url : media.thumbnail}
              alt={media.name}
              className="w-full h-20 object-cover rounded mb-2"
            />
          ) : (
            <div className="w-full h-20 bg-gray-200 rounded mb-2 flex items-center justify-center">
              <span className="text-xs text-gray-500">{media.type}</span>
            </div>
          )}
          <p className="text-xs truncate mb-2" title={media.name}>
            {media.name}
          </p>
          {media.type === 'image' && (
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 text-gray-500" />
              <input
                type="number"
                min="1"
                max="10"
                value={item.duration}
                onChange={(e) => onDurationChange(item.id, Number(e.target.value))}
                className="w-16 px-2 py-1 text-xs border rounded"
                onClick={(e) => e.stopPropagation()}
              />
              <span className="text-xs text-gray-500">sec</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Timeline: React.FC<TimelineProps> = ({ mediaFiles, timeline, onTimelineUpdate }) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = timeline.findIndex(item => item.id === active.id);
      const newIndex = timeline.findIndex(item => item.id === over.id);
      const newTimeline = arrayMove(timeline, oldIndex, newIndex);
      
      const updatedTimeline = recalculateTimings(newTimeline);
      onTimelineUpdate(updatedTimeline);
    }

    setActiveId(null);
  };

  const handleAddToTimeline = (mediaFile: MediaFile) => {
    const lastItem = timeline[timeline.length - 1];
    const startTime = lastItem ? lastItem.endTime : 0;
    const duration = mediaFile.duration || 3;

    const newItem: TimelineItem = {
      id: Math.random().toString(36).substr(2, 9),
      mediaId: mediaFile.id,
      startTime,
      endTime: startTime + duration,
      duration,
      transition: 'cut',  // Par défaut, pas de transition
      transitionDuration: 1,
    };

    onTimelineUpdate([...timeline, newItem]);
  };

  const handleDurationChange = (id: string, duration: number) => {
    const updatedTimeline = timeline.map(item =>
      item.id === id ? { ...item, duration } : item
    );
    onTimelineUpdate(recalculateTimings(updatedTimeline));
  };

  const recalculateTimings = (items: TimelineItem[]): TimelineItem[] => {
    let currentTime = 0;
    return items.map(item => {
      const updated = {
        ...item,
        startTime: currentTime,
        endTime: currentTime + item.duration,
      };
      currentTime = updated.endTime;
      return updated;
    });
  };

  const getTotalDuration = () => {
    if (timeline.length === 0) return '0:00';
    const lastItem = timeline[timeline.length - 1];
    const totalSeconds = lastItem.endTime;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const activeItem = timeline.find(item => item.id === activeId);
  const activeMedia = activeItem ? mediaFiles.find(m => m.id === activeItem.mediaId) : undefined;

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Timeline</h2>
        <div className="text-sm text-gray-600">
          Total Duration: <span className="font-semibold">{getTotalDuration()}</span>
        </div>
      </div>

      {timeline.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <p className="text-gray-500">No items in timeline</p>
          <p className="text-sm text-gray-400 mt-2">
            Add media files from the Available Media section below
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={timeline} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {timeline.map(item => {
                const media = mediaFiles.find(m => m.id === item.mediaId);
                return (
                  <div key={item.id} className="flex-shrink-0 w-40">
                    <SortableItem
                      item={item}
                      media={media}
                      onDurationChange={handleDurationChange}
                    />
                  </div>
                );
              })}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeId && activeItem && activeMedia ? (
              <div className="bg-white rounded-lg shadow-lg p-3 w-40">
                <SortableItem
                  item={activeItem}
                  media={activeMedia}
                  onDurationChange={() => {}}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {mediaFiles.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Available Media</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {mediaFiles.filter(m => m.type !== 'audio').map(media => (
              <button
                key={media.id}
                onClick={() => handleAddToTimeline(media)}
                className="flex-shrink-0 bg-white rounded-lg p-2 hover:shadow-md transition-shadow cursor-pointer"
              >
                {media.type === 'image' || media.thumbnail ? (
                  <img
                    src={media.type === 'image' ? media.url : media.thumbnail}
                    alt={media.name}
                    className="w-24 h-16 object-cover rounded"
                  />
                ) : (
                  <div className="w-24 h-16 bg-gray-200 rounded flex items-center justify-center">
                    <span className="text-xs text-gray-500">{media.type}</span>
                  </div>
                )}
                <p className="text-xs truncate mt-1" title={media.name}>
                  {media.name}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Timeline;