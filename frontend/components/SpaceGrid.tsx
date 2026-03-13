"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Space {
  id: string;
  name: string;
  emoji: string;
  color: string;
  createdAt: string;
  _count: { materials: number };
}

interface SpaceGridProps {
  spaces: Space[];
  onReorder: (orderedIds: string[]) => void;
  onCreateClick: () => void;
}

function SortableSpaceCard({ space }: { space: Space }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: space.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} data-testid={`space-card-${space.id}`}>
      <Link href={`/spaces/${space.id}`}>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-lg transition-all duration-200 cursor-pointer group">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform"
            style={{ backgroundColor: space.color + "20" }}
          >
            {space.emoji}
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg mb-1 truncate" data-testid={`space-name-${space.id}`}>
            {space.name}
          </h3>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            자료 {space._count.materials}개
          </p>
          <div
            className="mt-4 h-1 rounded-full"
            style={{ backgroundColor: space.color + "40" }}
          />
        </div>
      </Link>
    </div>
  );
}

export default function SpaceGrid({ spaces, onReorder, onCreateClick }: SpaceGridProps) {
  const [items, setItems] = useState(spaces);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  // Sync if parent changes spaces
  if (spaces.length !== items.length || spaces.some((s, i) => s.id !== items[i]?.id)) {
    setItems(spaces);
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((s) => s.id === active.id);
    const newIndex = items.findIndex((s) => s.id === over.id);

    const newItems = [...items];
    const [moved] = newItems.splice(oldIndex, 1);
    newItems.splice(newIndex, 0, moved);
    setItems(newItems);

    onReorder(newItems.map((s) => s.id));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((s) => s.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" data-testid="space-grid">
          {items.map((space) => (
            <SortableSpaceCard key={space.id} space={space} />
          ))}
          <button
            onClick={onCreateClick}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors flex flex-col items-center justify-center gap-3 text-gray-400 dark:text-gray-500 hover:text-indigo-500 min-h-[180px]"
          >
            <div className="text-4xl">+</div>
            <span className="text-sm font-medium">새 스터디 공간</span>
          </button>
        </div>
      </SortableContext>
    </DndContext>
  );
}
