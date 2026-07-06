"use client";
import { useState } from "react";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GlassCard } from "@/components/ui/GlassCard";
import { updateTaskStatus, reorderTask } from "@/app/dashboard/tasks/actions";
import type { Task, Project } from "@/lib/database";

const PRIORITY_COLOR: Record<number, string> = {
    1: "text-violet-400 border-violet-400/30",
    2: "text-blue-400 border-blue-400/30",
    3: "text-amber-400 border-amber-400/30",
    4: "text-zinc-500 border-zinc-500/30",
};

function TaskRow({ task }: { task: Task }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <GlassCard className="p-4 mb-2 flex items-center justify-between hover:bg-white/[0.05] transition-colors">
                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        checked={task.status === "done"}
                        onChange={() => updateTaskStatus(task.id, task.status === "done" ? "todo" : "done")}
                        className="w-4 h-4 accent-blue-500"
                    />
                    <span className={task.status === "done" ? "line-through text-zinc-500" : "text-zinc-50"}>
                        {task.title}
                    </span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_COLOR[task.priority]}`}>
                    P{task.priority}
                </span>
            </GlassCard>
        </div>
    );
}

export function TaskBoard({ initialTasks, projects }: { initialTasks: Task[]; projects: Project[] }) {
    const [tasks, setTasks] = useState(initialTasks);

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        // optimistic local reorder; persist project grouping if dragged across a project column
        setTasks((prev) => {
            const oldIndex = prev.findIndex((t) => t.id === active.id);
            const newIndex = prev.findIndex((t) => t.id === over.id);
            const next = [...prev];
            const [moved] = next.splice(oldIndex, 1);
            next.splice(newIndex, 0, moved);
            return next;
        });
    }

    return (
        <div className="max-w-2xl mx-auto py-8">
            <h1 className="text-2xl font-bold italic mb-6 text-zinc-50">Tasks</h1>
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    {tasks.map((task) => <TaskRow key={task.id} task={task} />)}
                </SortableContext>
            </DndContext>
        </div>
    );
}