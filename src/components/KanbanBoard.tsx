"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

type Task = {
  id: string;
  title: string;
  createdAt: number;
};

type ColumnId = "todo" | "in_progress" | "done";

type BoardState = Record<ColumnId, Task[]>;

const STORAGE_KEY = "kanban-todo-v1";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function useLocalBoard(initial: BoardState) {
  const [data, setData] = useState<BoardState>(initial);

  // Load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setData(JSON.parse(raw));
    } catch {}
  }, []);

  // Save
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, [data]);

  return [data, setData] as const;
}

const initialData: BoardState = {
  todo: [
    { id: uid(), title: "Спробувати нову дошку", createdAt: Date.now() },
    { id: uid(), title: "Додати перше завдання", createdAt: Date.now() },
  ],
  in_progress: [],
  done: [],
};

export default function KanbanBoard() {
  const [board, setBoard] = useLocalBoard(initialData);
  const [quickAdd, setQuickAdd] = useState<Record<ColumnId, string>>({
    todo: "",
    in_progress: "",
    done: "",
  });

  const columns = useMemo(
    () => [
      { id: "todo" as const, title: "Заплановано" },
      { id: "in_progress" as const, title: "В процесі" },
      { id: "done" as const, title: "Готово" },
    ],
    []
  );

  function addTask(col: ColumnId, title: string) {
    if (!title.trim()) return;
    setBoard((prev) => ({
      ...prev,
      [col]: [{ id: uid(), title: title.trim(), createdAt: Date.now() }, ...prev[col]],
    }));
    setQuickAdd((q) => ({ ...q, [col]: "" }));
  }

  function removeTask(col: ColumnId, id: string) {
    setBoard((prev) => ({ ...prev, [col]: prev[col].filter((t) => t.id !== id) }));
  }

  function moveTask(from: ColumnId, to: ColumnId, id: string, index?: number) {
    setBoard((prev) => {
      const source = [...prev[from]];
      const target = from === to ? source : [...prev[to]];
      const i = source.findIndex((t) => t.id === id);
      if (i === -1) return prev;
      const [task] = source.splice(i, 1);
      const insertAt = typeof index === "number" ? Math.max(0, Math.min(index, target.length)) : target.length;
      target.splice(insertAt, 0, task);
      return { ...prev, [from]: from === to ? target : source, [to]: target } as BoardState;
    });
  }

  function onDragStart(e: React.DragEvent<HTMLDivElement>, taskId: string, from: ColumnId) {
    e.dataTransfer.setData(
      "text/plain",
      JSON.stringify({ taskId, from })
    );
    e.dataTransfer.effectAllowed = "move";
  }

  function onDropColumn(e: React.DragEvent<HTMLDivElement>, to: ColumnId) {
    e.preventDefault();
    try {
      const payload = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (!payload?.taskId || !payload?.from) return;
      moveTask(payload.from as ColumnId, to, payload.taskId as string);
    } catch {}
  }

  return (
    <div className="min-h-screen app-bg">
      <header className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Моя Канбан-дошка</h1>
            <p className="text-[color:var(--accent-strong)]/90 mt-1">Лаконічний To-Do у пастельних фіолетових тонах</p>
          </div>
          <a
            className="btn-ghost"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              localStorage.removeItem(STORAGE_KEY);
              location.reload();
            }}
          >
            Скинути дані
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {columns.map((col) => (
            <div
              key={col.id}
              className="column"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDropColumn(e, col.id)}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold tracking-wide uppercase text-[color:var(--accent-strong)]">{col.title}</h2>
                <button
                  className="btn-ghost"
                  onClick={() => {
                    const value = prompt("Назва завдання");
                    if (value) addTask(col.id, value);
                  }}
                >
                  <Plus className="h-4 w-4" /> Додати
                </button>
              </div>

              <form
                className="mb-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  addTask(col.id, quickAdd[col.id]);
                }}
              >
                <div className="flex gap-2">
                  <input
                    value={quickAdd[col.id]}
                    onChange={(e) => setQuickAdd((q) => ({ ...q, [col.id]: e.target.value }))}
                    placeholder="Нове завдання..."
                    className="w-full rounded-lg bg-white/80 dark:bg-white/10 border border-violet-100/80 dark:border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                  />
                  <button type="submit" className="btn-primary">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Додати</span>
                  </button>
                </div>
              </form>

              <div className="space-y-3 min-h-[120px]">
                {board[col.id].length === 0 && (
                  <div className="text-sm text-foreground/60 border border-dashed border-violet-200 rounded-lg p-4 text-center">
                    Перетягніть сюди завдання або створіть нове
                  </div>
                )}

                {board[col.id].map((task) => (
                  <div
                    key={task.id}
                    className="card p-3 group cursor-grab active:cursor-grabbing"
                    draggable
                    onDragStart={(e) => onDragStart(e, task.id, col.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <p className="text-xs text-foreground/60 mt-1">{new Date(task.createdAt).toLocaleDateString()}</p>
                      </div>
                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity btn-ghost px-2 py-1"
                        title="Видалити"
                        onClick={() => removeTask(col.id, task.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
