"use client";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function arrayMove<T>(array: T[], from: number, to: number): T[] {
    const next = [...array];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
}
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassModal } from "@/components/ui/GlassModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { WheelDatePicker, WheelSelect } from "@/components/ui/WheelDatePicker";
import { updateTaskStatus, deleteTask, createTask, updateTask, createProject } from "@/app/dashboard/tasks/actions";
import type { Task, Project } from "@/lib/database";

const PRIORITY_COLOR: Record<number, string> = {
    1: "text-violet-400 border-violet-400/30",
    2: "text-blue-400 border-blue-400/30",
    3: "text-amber-400 border-amber-400/30",
    4: "text-zinc-500 border-zinc-500/30",
};

const PRIORITY_SEGMENT: Record<number, string> = {
    1: "bg-violet-400/15 text-violet-300",
    2: "bg-blue-400/15 text-blue-300",
    3: "bg-amber-400/15 text-amber-300",
    4: "bg-white/[0.08] text-zinc-300",
};

const ALERT = "text-rose-400";

function isOverdue(task: Task): boolean {
    if (!task.due_date) return false;
    return new Date(task.due_date) < new Date(new Date().toDateString());
}

function fmtDate(d: string | null): string {
    if (!d) return "";
    return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function TaskRow({
    task,
    onEdit,
    onDelete,
}: {
    task: Task;
    onEdit: (task: Task) => void;
    onDelete: (id: string) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <GlassCard className="p-4 mb-2 flex items-center justify-between hover:bg-white/[0.05] transition-colors group">
                <div className="flex items-center gap-3 min-w-0">
                    <input
                        type="checkbox"
                        checked={task.status === "done"}
                        onChange={() => updateTaskStatus(task.id, task.status === "done" ? "todo" : "done")}
                        className="w-4 h-4 accent-blue-500 shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                        <span className={task.status === "done" ? "line-through text-zinc-500 truncate" : "text-zinc-50 truncate"}>
                            {task.title}
                        </span>
                        {task.due_date && (
                            <span className={`text-xs ${isOverdue(task) ? ALERT : "text-zinc-500"}`}>
                                {isOverdue(task) ? "Overdue " : ""}{fmtDate(task.due_date)}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_COLOR[task.priority]}`}>
                        P{task.priority}
                    </span>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                        className="text-zinc-500 hover:text-zinc-50 transition-colors"
                        aria-label="Edit"
                        title="Edit"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                        className="text-zinc-500 hover:text-rose-400 transition-colors"
                        aria-label="Delete"
                        title="Delete"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </GlassCard>
            </motion.div>
        </div>
    );
}

interface TaskFormData {
    id?: string;
    title: string;
    description: string;
    priority: number;
    project_id: string;
    due_date: string;
}

function TaskForm({
    initial,
    projects,
    onSubmit,
}: {
    initial: TaskFormData;
    projects: Project[];
    onSubmit: (fd: FormData) => Promise<void>;
}) {
    const [data, setData] = useState<TaskFormData>(initial);
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const fd = new FormData();
        if (data.id) fd.set("id", data.id);
        fd.set("title", data.title);
        fd.set("description", data.description);
        fd.set("priority", String(data.priority));
        fd.set("project_id", data.project_id || "");
        fd.set("due_date", data.due_date || "");
        await onSubmit(fd);
        setSaving(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm text-zinc-500 mb-1">Title</label>
                <input
                    required
                    value={data.title}
                    onChange={(e) => setData({ ...data, title: e.target.value })}
                    className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] text-zinc-50 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-zinc-600"
                    placeholder="Task title"
                />
            </div>
            <div>
                <label className="block text-sm text-zinc-500 mb-1">Description</label>
                <textarea
                    rows={3}
                    value={data.description}
                    onChange={(e) => setData({ ...data, description: e.target.value })}
                    className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] text-zinc-50 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-zinc-600 resize-none"
                    placeholder="Optional description"
                />
            </div>
            <div>
                <label className="block text-sm text-zinc-500 mb-1">Priority</label>
                <div className="grid grid-cols-4 gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
                    {([1, 2, 3, 4] as const).map((p) => (
                        <button
                            type="button"
                            key={p}
                            onClick={() => setData({ ...data, priority: p })}
                            className={`rounded-lg py-1.5 text-sm transition-[color,background-color,transform] duration-150 active:scale-[0.97] ${
                                data.priority === p ? PRIORITY_SEGMENT[p] : "text-white/40 hover:text-white/80"
                            }`}
                        >
                            P{p}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex gap-3">
                <div className="flex-1">
                    <label className="block text-sm text-zinc-500 mb-1">Project</label>
                    <WheelSelect
                        options={[{ value: "", label: "None" }, ...projects.map((p) => ({ value: p.id, label: p.name }))]}
                        value={data.project_id || ""}
                        onChange={(v) => setData({ ...data, project_id: v })}
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-sm text-zinc-500 mb-1">Due Date</label>
                    <WheelDatePicker
                        value={data.due_date}
                        onChange={(v) => setData({ ...data, due_date: v })}
                    />
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
                <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                >
                    {saving ? "Saving..." : (data.id ? "Save Changes" : "Create Task")}
                </button>
            </div>
        </form>
    );
}

const PROJECT_COLORS = [
    { name: "Blue", value: "#3b82f6" },
    { name: "Violet", value: "#8b5cf6" },
    { name: "Emerald", value: "#10b981" },
    { name: "Rose", value: "#f43f5e" },
    { name: "Amber", value: "#f59e0b" },
    { name: "Cyan", value: "#06b6d4" },
];

function ProjectForm({ onSubmit }: { onSubmit: (fd: FormData) => Promise<void> }) {
    const [name, setName] = useState("");
    const [color, setColor] = useState(PROJECT_COLORS[0].value);
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const fd = new FormData();
        fd.set("name", name);
        fd.set("color", color);
        await onSubmit(fd);
        setSaving(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm text-zinc-500 mb-1">Project Name</label>
                <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] text-zinc-50 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-zinc-600"
                    placeholder="Project name"
                />
            </div>
            <div>
                <label className="block text-sm text-zinc-500 mb-1">Color</label>
                <div className="flex flex-wrap gap-2">
                    {PROJECT_COLORS.map((c) => (
                        <button
                            key={c.value}
                            type="button"
                            onClick={() => setColor(c.value)}
                            className={`w-8 h-8 rounded-full border-2 ${color === c.value ? "border-white" : "border-transparent"}`}
                            style={{ backgroundColor: c.value }}
                            aria-label={c.name}
                        />
                    ))}
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
                <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                >
                    {saving ? "Creating..." : "Create Project"}
                </button>
            </div>
        </form>
    );
}

export function TaskBoard({ initialTasks, projects }: { initialTasks: Task[]; projects: Project[] }) {
    const [tasks, setTasks] = useState(initialTasks);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Task | null>(null);
    const [projectModalOpen, setProjectModalOpen] = useState(false);
    const [insight, setInsight] = useState<string | null>(null);

    // Require 8px of movement before a drag starts, so clicks on the row's
    // checkbox/edit/delete buttons aren't swallowed by dnd-kit's listeners.
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    // Re-sync after server actions revalidate (create/edit land in initialTasks)
    useEffect(() => {
        setTasks(initialTasks);
    }, [initialTasks]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        fetch("/api/nim/task-agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tasks }),
        })
            .then(r => r.json())
            .then(d => setInsight(d.insight ?? null))
            .catch(() => {}); // silently fail — AI is non-critical
    }, []);

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        setTasks((prev) => {
            const oldIndex = prev.findIndex((t) => t.id === active.id);
            const newIndex = prev.findIndex((t) => t.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return prev;
            return arrayMove(prev, oldIndex, newIndex);
        });
    }

    const onCreateTask = useCallback(async (fd: FormData) => {
        await createTask(fd);
        setModalOpen(false);
    }, []);

    const onUpdateTask = useCallback(async (fd: FormData) => {
        await updateTask(fd);
        setModalOpen(false);
        setEditing(null);
    }, []);

    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const onDeleteTask = useCallback((id: string) => {
        setConfirmDeleteId(id);
    }, []);

    const onCreateProject = useCallback(async (fd: FormData) => {
        await createProject(fd);
        setProjectModalOpen(false);
    }, []);

    const renderTasks = () => {
        if (tasks.length === 0 && projects.length === 0) {
            return (
                <div className="text-zinc-500 text-center py-12 italic">
                    No tasks yet. Add your first task to get started.
                </div>
            );
        }
        // One section per project (even when empty, so a new project is visible),
        // then an Uncategorized section for the rest.
        const groups: { key: string; proj: Project | null; items: Task[] }[] = projects.map((p) => ({
            key: p.id,
            proj: p,
            items: tasks.filter((t) => t.project_id === p.id),
        }));
        const uncategorized = tasks.filter((t) => !t.project_id || !projects.some((p) => p.id === t.project_id));
        if (uncategorized.length > 0) groups.push({ key: "uncategorized", proj: null, items: uncategorized });

        return groups.map(({ key, proj, items }) => (
            <div key={key}>
                <div className="flex items-center gap-2 mb-2 mt-4 first:mt-0">
                    {proj && (
                        <span
                            className="inline-block w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: proj.color }}
                        />
                    )}
                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
                        {proj ? proj.name : "Uncategorized"}
                    </h3>
                    <span className="text-xs text-zinc-600">{items.length}</span>
                </div>
                {items.length === 0 ? (
                    <p className="text-sm text-zinc-600 italic mb-2">No tasks yet</p>
                ) : (
                    items.map((task) => (
                        <TaskRow
                            key={task.id}
                            task={task}
                            onEdit={(t) => {
                                setEditing(t);
                                setModalOpen(true);
                            }}
                            onDelete={onDeleteTask}
                        />
                    ))
                )}
            </div>
        ));
    };

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold italic text-zinc-50">Tasks</h1>
                <div className="flex gap-3">
                    <button
                        onClick={() => setProjectModalOpen(true)}
                        className="px-4 py-2 rounded-xl text-sm text-zinc-400 border border-white/[0.08] hover:bg-white/[0.05] hover:text-zinc-50 transition-colors"
                    >
                        + New Project
                    </button>
                    <button
                        onClick={() => {
                            setEditing(null);
                            setModalOpen(true);
                        }}
                        className="px-4 py-2 rounded-xl text-sm bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
                    >
                        + New Task
                    </button>
                </div>
            </div>
            {insight && (
                <div className="mt-3 flex items-center gap-2 text-sm mb-6">
                    <span className="px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 italic">
                        ✦ {insight}
                    </span>
                </div>
            )}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    {renderTasks()}
                </SortableContext>
            </DndContext>
            <GlassModal open={modalOpen} onOpenChange={setModalOpen} title={editing ? "Edit Task" : "New Task"}>
                <TaskForm
                    key={editing?.id ?? "new"}
                    projects={projects}
                    onSubmit={editing ? onUpdateTask : onCreateTask}
                    initial={
                        editing
                            ? {
                                id: editing.id,
                                title: editing.title ?? "",
                                description: editing.description ?? "",
                                priority: editing.priority ?? 2,
                                project_id: editing.project_id ?? "",
                                due_date: editing.due_date ?? "",
                            }
                            : { title: "", description: "", priority: 2, project_id: "", due_date: "" }
                    }
                />
            </GlassModal>
            <GlassModal open={projectModalOpen} onOpenChange={setProjectModalOpen} title="New Project">
                <ProjectForm onSubmit={onCreateProject} />
            </GlassModal>
            <ConfirmModal
                open={confirmDeleteId !== null}
                onOpenChange={(v) => { if (!v) setConfirmDeleteId(null); }}
                title="Delete Task"
                message="This task will be permanently deleted. This can't be undone."
                onConfirm={async () => {
                    if (!confirmDeleteId) return;
                    await deleteTask(confirmDeleteId);
                    setTasks((prev) => prev.filter((t) => t.id !== confirmDeleteId));
                }}
            />
        </div>
    );
}
