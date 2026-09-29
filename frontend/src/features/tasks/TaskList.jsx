/**
 * TaskList: renders a list of task cards with drag-and-drop reordering.
 * Uses @dnd-kit for drag-and-drop (works on touch/mobile too).
 */
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import TaskCard from './TaskCard'

export default function TaskList({ tasks, categories, onToggle, onEdit, onDelete, onReorder }) {
  // Set up sensors for drag-and-drop (pointer + touch + keyboard)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Small movement before drag starts (prevents accidental drags on tap)
      },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Handle drag end: reorder the list
  function handleDragEnd(event) {
    const { active, over } = event
    if (active.id !== over.id) {
      const oldIndex = tasks.findIndex(t => t.id === active.id)
      const newIndex = tasks.findIndex(t => t.id === over.id)
      const newOrder = arrayMove(tasks, oldIndex, newIndex)

      // Send new positions to the API
      const items = newOrder.map((t, i) => ({ id: t.id, position: i + 1 }))
      onReorder(items)
    }
  }

  // Helper: find category object for a task
  function getCategory(task) {
    return categories.find(c => c.id === task.category_id)
  }

  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        No tasks yet — tap + to add your first one!
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="task-list">
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              category={getCategory(task)}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
