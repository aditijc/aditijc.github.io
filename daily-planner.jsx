import { useState, useCallback, useEffect, useRef } from "react";

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6);
const SLOTS_PER_HOUR = 4;
const TOTAL_SLOTS = HOURS.length * SLOTS_PER_HOUR;

const P = {
  bg: "#FAF6F1", card: "#FFFFFF", accent: "#D4764E", accentLight: "#F2E0D5",
  accentDark: "#B85C38", text: "#2C2520", textMuted: "#9A8E85", border: "#E8E0D8",
  taskBg: "#FDF8F4", gridEmpty: "#F5F0EB", gridFilled: "#D4764E", gridPast: "#E8E0D8",
};

const formatTime = (hour, min = 0) => {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? "AM" : "PM";
  return min ? `${h}:${String(min).padStart(2, "0")} ${ampm}` : `${h} ${ampm}`;
};
const formatDuration = (mins) => {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};
const slotToTime = (slot) => ({
  hour: HOURS[0] + Math.floor(slot / SLOTS_PER_HOUR),
  min: (slot % SLOTS_PER_HOUR) * 15,
});
const timeToMins = (h, m) => h * 60 + m;
const formatTimer = (secs) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const getDuePriority = (dueBy) => {
  if (!dueBy) return "low";
  const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 86400000);
  const due = new Date(dueBy + "T00:00:00");
  if (due <= today) return "high";
  if (due <= tomorrow) return "medium";
  return "low";
};
const formatDueLabel = (dueBy) => {
  if (!dueBy) return null;
  const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 86400000);
  const due = new Date(dueBy + "T00:00:00");
  if (due < today) return "overdue";
  if (due.getTime() === today.getTime()) return "today";
  if (due.getTime() === tomorrow.getTime()) return "tomorrow";
  return due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const PRIORITY_COLORS = {
  high: { bg: "#FDEAEA", dot: "#D94F4F", label: "High" },
  medium: { bg: "#FDF5E6", dot: "#E6A830", label: "Med" },
  low: { bg: "#E0F7FA", dot: "#0097A7", label: "Low" },
};

/* ── Availability Grid ── */
function AvailabilityGrid({ slots, setSlots }) {
  const [isDragging, setIsDragging] = useState(false);
  const dragValue = useRef(true);
  const gridRef = useRef(null);
  const lastSlot = useRef(null);

  const getSlotFromEvent = useCallback((e) => {
    const grid = gridRef.current;
    if (!grid) return null;
    const rect = grid.getBoundingClientRect();
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const slot = Math.floor((clientY - rect.top) / (rect.height / TOTAL_SLOTS));
    return slot >= 0 && slot < TOTAL_SLOTS ? slot : null;
  }, []);

  const fillRange = useCallback((from, to, val) => {
    const lo = Math.min(from, to), hi = Math.max(from, to);
    setSlots((prev) => { const n = [...prev]; for (let i = lo; i <= hi; i++) n[i] = val; return n; });
  }, [setSlots]);

  const handleStart = useCallback((e, slot) => {
    e.preventDefault();
    const newVal = !slots[slot];
    setIsDragging(true); dragValue.current = newVal; lastSlot.current = slot;
    setSlots((p) => { const n = [...p]; n[slot] = newVal; return n; });
  }, [slots, setSlots]);

  const handleMove = useCallback((e) => {
    if (!isDragging) return; e.preventDefault();
    const slot = getSlotFromEvent(e);
    if (slot === null || slot === lastSlot.current) return;
    fillRange(lastSlot.current, slot, dragValue.current);
    lastSlot.current = slot;
  }, [isDragging, getSlotFromEvent, fillRange]);

  const handleEnd = useCallback(() => { setIsDragging(false); lastSlot.current = null; }, []);

  useEffect(() => {
    if (!isDragging) return;
    const m = (e) => handleMove(e), u = () => handleEnd();
    window.addEventListener("mousemove", m); window.addEventListener("mouseup", u);
    window.addEventListener("touchmove", m, { passive: false }); window.addEventListener("touchend", u);
    return () => { window.removeEventListener("mousemove", m); window.removeEventListener("mouseup", u);
      window.removeEventListener("touchmove", m); window.removeEventListener("touchend", u); };
  }, [isDragging, handleMove, handleEnd]);

  const freeMinutes = slots.filter(Boolean).length * 15;
  const now = new Date();
  const nowMins = timeToMins(now.getHours(), now.getMinutes());
  const nowSlot = Math.floor((nowMins - HOURS[0] * 60) / 15);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: P.textMuted }}>Click & drag to mark free time</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {freeMinutes > 0 && <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: P.accent, fontWeight: 600 }}>{formatDuration(freeMinutes)} selected</span>}
          {freeMinutes > 0 && <button onClick={() => setSlots(new Array(TOTAL_SLOTS).fill(false))} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: P.textMuted, background: "none", border: `1px solid ${P.border}`, borderRadius: 6, padding: "3px 8px" }}>Clear</button>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 0, userSelect: "none", WebkitUserSelect: "none", touchAction: "none" }}>
        <div style={{ width: 52, flexShrink: 0 }}>
          {HOURS.map((h) => (
            <div key={h} style={{ height: SLOTS_PER_HOUR * 14, display: "flex", alignItems: "flex-start", justifyContent: "flex-end", paddingRight: 8 }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: P.textMuted, lineHeight: 1, transform: "translateY(-5px)" }}>{formatTime(h)}</span>
            </div>
          ))}
        </div>
        <div ref={gridRef} style={{ flex: 1, borderRadius: 10, overflow: "hidden", border: `1px solid ${P.border}`, cursor: "pointer", position: "relative" }}>
          {Array.from({ length: TOTAL_SLOTS }, (_, i) => {
            const isHourBoundary = i % SLOTS_PER_HOUR === 0;
            const isHalfHour = i % (SLOTS_PER_HOUR / 2) === 0 && !isHourBoundary;
            const filled = slots[i];
            const isPast = i < nowSlot;
            const isBlockStart = filled && (i === 0 || !slots[i - 1]);
            let blockLabel = null;
            if (isBlockStart) {
              let be = i; while (be < TOTAL_SLOTS - 1 && slots[be + 1]) be++;
              const st = slotToTime(i), et = slotToTime(be + 1);
              if (be - i + 1 >= 2) blockLabel = `${formatTime(st.hour, st.min)} – ${formatTime(et.hour, et.min)}`;
            }
            return (
              <div key={i} onMouseDown={(e) => handleStart(e, i)} onTouchStart={(e) => handleStart(e, i)}
                style={{
                  height: 14, position: "relative", transition: "background 0.08s ease",
                  background: filled ? (isPast ? "#C4A08A" : P.gridFilled) : (isPast ? P.gridPast : P.gridEmpty),
                  borderTop: isHourBoundary && i > 0 ? `1px solid ${filled ? "rgba(255,255,255,0.3)" : P.border}` : isHalfHour ? `1px solid ${filled ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.04)"}` : "none",
                }}>
                {blockLabel && <div style={{ position: "absolute", left: 10, top: 2, fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.9)", whiteSpace: "nowrap", pointerEvents: "none", zIndex: 2, letterSpacing: 0.3 }}>{blockLabel}</div>}
                {i === nowSlot && <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 2, background: "#D94F4F", zIndex: 3 }} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Timer ── */
function Timer({ task, onClose }) {
  const totalSecs = task.duration * 60;
  const [remaining, setRemaining] = useState(totalSecs);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((p) => {
          if (p <= 1) { setRunning(false); setFinished(true); clearInterval(intervalRef.current); return 0; }
          return p - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, remaining]);

  const handleClose = () => {
    clearInterval(intervalRef.current);
    const remainingMins = Math.round(remaining / 60);
    onClose(remainingMins);
  };

  const progress = 1 - remaining / totalSecs;
  const pc = PRIORITY_COLORS[getDuePriority(task.dueBy)];
  const circumference = 2 * Math.PI * 90;
  const remainingMins = Math.round(remaining / 60);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(44,37,32,0.6)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      animation: "fadeIn 0.3s ease",
    }}>
      <div style={{
        background: P.card, borderRadius: 24, padding: "40px 48px", textAlign: "center",
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)", maxWidth: 380, width: "90%",
      }}>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 2, color: P.textMuted, marginBottom: 6 }}>
          {finished ? "Complete!" : running ? "Focus Time" : "Ready?"}
        </div>
        <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 22, color: P.text, marginBottom: 28 }}>{task.name}</div>

        <div style={{ position: "relative", width: 200, height: 200, margin: "0 auto 28px" }}>
          <svg width="200" height="200" viewBox="0 0 200 200" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="100" cy="100" r="90" fill="none" stroke={P.border} strokeWidth="6" />
            <circle cx="100" cy="100" r="90" fill="none" stroke={finished ? "#4CAF76" : pc.dot} strokeWidth="6"
              strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)}
              strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.5s ease" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 48, fontWeight: 600, color: P.text, letterSpacing: -1 }}>
              {formatTimer(remaining)}
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: P.textMuted }}>
              {formatDuration(task.duration)} total
            </div>
          </div>
        </div>

        {remainingMins < task.duration && !finished && (
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: P.accent, marginBottom: 16 }}>
            {formatDuration(remainingMins)} remaining · duration will update on close
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          {!finished && (
            <button onClick={() => setRunning((p) => !p)} style={{
              padding: "12px 28px", borderRadius: 10, border: "none", fontSize: 14, fontWeight: 600,
              background: running ? P.taskBg : `linear-gradient(135deg, ${P.accent}, #E8956D)`,
              color: running ? P.text : "#fff", fontFamily: "'DM Sans', sans-serif",
              boxShadow: running ? "none" : "0 4px 16px rgba(212,118,78,0.3)",
            }}>{running ? "Pause" : remaining < totalSecs ? "Resume" : "Start"}</button>
          )}
          {!running && !finished && remaining < totalSecs && (
            <button onClick={() => { setRemaining(totalSecs); elapsedRef.current = 0; setFinished(false); }} style={{
              padding: "12px 20px", borderRadius: 10, border: `1px solid ${P.border}`,
              background: P.card, color: P.textMuted, fontSize: 13, fontWeight: 500,
              fontFamily: "'DM Sans', sans-serif",
            }}>Reset</button>
          )}
          <button onClick={handleClose} style={{
            padding: "12px 20px", borderRadius: 10,
            border: finished ? "none" : `1px solid ${P.border}`,
            background: finished ? "#4CAF76" : P.card,
            color: finished ? "#fff" : P.textMuted,
            fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
          }}>{finished ? "Done!" : "Close"}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Main ── */
export default function DailyPlanner() {
  const [tasks, setTasks] = useState(() => {
    try {
      const savedDate = localStorage.getItem("planner_date");
      const today = new Date().toDateString();
      if (savedDate !== today) {
        ["planner_tasks", "planner_slots", "planner_restBreak", "planner_schedule", "planner_completed"].forEach((k) => localStorage.removeItem(k));
        localStorage.setItem("planner_date", today);
        return [];
      }
      return JSON.parse(localStorage.getItem("planner_tasks")) || [];
    } catch { return []; }
  });
  const [taskName, setTaskName] = useState("");
  const [taskDuration, setTaskDuration] = useState(30);
  const [taskDueBy, setTaskDueBy] = useState("");
  const [taskDeps, setTaskDeps] = useState([]);
  const [slots, setSlots] = useState(() => {
    try { return JSON.parse(localStorage.getItem("planner_slots")) || new Array(TOTAL_SLOTS).fill(false); } catch { return new Array(TOTAL_SLOTS).fill(false); }
  });
  const [restBreak, setRestBreak] = useState(() => {
    try { return JSON.parse(localStorage.getItem("planner_restBreak")) ?? 0; } catch { return 0; }
  });
  const [schedule, setSchedule] = useState(() => {
    try { return JSON.parse(localStorage.getItem("planner_schedule")) || null; } catch { return null; }
  });
  const [completed, setCompleted] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("planner_completed")) || []); } catch { return new Set(); }
  });
  const [timerTask, setTimerTask] = useState(null);
  const [animateIn, setAnimateIn] = useState(false);
  const [stressMode, setStressMode] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editValues, setEditValues] = useState({ name: "", duration: 30, dueBy: "" });
  const [savedForLater, setSavedForLater] = useState(() => {
    try { return JSON.parse(localStorage.getItem("planner_saved")) || []; } catch { return []; }
  });
  const inputRef = useRef(null);
  const dragTaskId = useRef(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [today] = useState(() => new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }));

  useEffect(() => { setAnimateIn(true); }, []);

  useEffect(() => { localStorage.setItem("planner_tasks", JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem("planner_slots", JSON.stringify(slots)); }, [slots]);
  useEffect(() => { localStorage.setItem("planner_restBreak", JSON.stringify(restBreak)); }, [restBreak]);
  useEffect(() => { localStorage.setItem("planner_schedule", JSON.stringify(schedule)); }, [schedule]);
  useEffect(() => { localStorage.setItem("planner_completed", JSON.stringify([...completed])); }, [completed]);
  useEffect(() => { localStorage.setItem("planner_saved", JSON.stringify(savedForLater)); }, [savedForLater]);

  const addTask = useCallback(() => {
    if (!taskName.trim()) return;
    setTasks((prev) => [...prev, {
      id: Date.now(), name: taskName.trim(), duration: taskDuration,
      dueBy: taskDueBy, dependsOn: taskDeps.length ? [...taskDeps] : [],
    }]);
    setTaskName(""); setTaskDuration(30); setTaskDueBy(""); setTaskDeps([]);
    inputRef.current?.focus();
  }, [taskName, taskDuration, taskDueBy, taskDeps]);

  const removeTask = (id) => {
    setTasks((prev) => prev.map((t) => ({
      ...t, dependsOn: t.dependsOn.filter((d) => d !== id),
    })).filter((t) => t.id !== id));
    setCompleted((prev) => { const n = new Set(prev); n.delete(id); return n; });
    if (editingTaskId === id) setEditingTaskId(null);
  };

  const patchSchedule = (id, patch) => {
    setSchedule((prev) => {
      if (!prev) return prev;
      const update = (arr) => arr.map((t) => t.id === id ? { ...t, ...patch } : t);
      return { ...prev, scheduled: update(prev.scheduled), unscheduled: update(prev.unscheduled) };
    });
  };

  const updateTaskDuration = (id, mins) => {
    if (mins <= 0) return;
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, duration: mins } : t));
    patchSchedule(id, { duration: mins });
  };

  const startEdit = (task) => {
    setEditingTaskId(task.id);
    setEditValues({ name: task.name, duration: task.duration, dueBy: task.dueBy || "" });
  };

  const saveEdit = (id) => {
    if (!editValues.name.trim()) return;
    const patch = { name: editValues.name.trim(), duration: editValues.duration, dueBy: editValues.dueBy };
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, ...patch } : t));
    patchSchedule(id, patch);
    setEditingTaskId(null);
  };

  const cancelEdit = () => setEditingTaskId(null);

  const handleDragStart = (e, id) => {
    dragTaskId.current = id;
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e, id) => {
    e.preventDefault();
    if (id !== dragTaskId.current) setDragOverId(id);
  };
  const handleDrop = (e, id) => {
    e.preventDefault();
    if (!dragTaskId.current || dragTaskId.current === id) { setDragOverId(null); return; }
    setSchedule((prev) => {
      if (!prev) return prev;
      const items = [...prev.scheduled];
      const from = items.findIndex((t) => t.id === dragTaskId.current);
      const to = items.findIndex((t) => t.id === id);
      if (from === -1 || to === -1) return prev;
      const [moved] = items.splice(from, 1);
      items.splice(to, 0, moved);
      // Recompute start/end times sequentially from the original first start
      const firstStart = timeToMins(prev.scheduled[0].startHour, prev.scheduled[0].startMin);
      let cursor = firstStart;
      const recomputed = items.map((item, i) => {
        const start = i === 0 ? cursor : cursor + restBreak;
        const rounded = Math.ceil(item.duration / 15) * 15;
        const end = start + rounded;
        cursor = end;
        return {
          ...item,
          startHour: Math.floor(start / 60), startMin: start % 60,
          endHour: Math.floor(end / 60), endMin: end % 60,
          hasBreakBefore: i > 0 && restBreak > 0,
        };
      });
      return { ...prev, scheduled: recomputed };
    });
    setDragOverId(null);
    dragTaskId.current = null;
  };
  const handleDragEnd = () => { setDragOverId(null); dragTaskId.current = null; };

  const saveForLater = (task) => {
    setSavedForLater((prev) => prev.some((t) => t.id === task.id) ? prev : [...prev, { id: task.id, name: task.name, duration: task.duration, dueBy: task.dueBy || "" }]);
    removeTask(task.id);
  };

  const addFromSaved = (saved) => {
    setTasks((prev) => [...prev, { ...saved, id: Date.now(), dependsOn: [] }]);
    setSavedForLater((prev) => prev.filter((t) => t.id !== saved.id));
  };

  const removeSaved = (id) => setSavedForLater((prev) => prev.filter((t) => t.id !== id));

  const toggleComplete = (id) => {
    setCompleted((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const getFreeBlocks = useCallback(() => {
    const now = new Date();
    const nowMins = timeToMins(now.getHours(), now.getMinutes());
    const blocks = [];
    let i = 0;
    while (i < TOTAL_SLOTS) {
      if (slots[i]) {
        const start = i;
        while (i < TOTAL_SLOTS && slots[i]) i++;
        const st = slotToTime(start), et = slotToTime(i);
        const startMins = timeToMins(st.hour, st.min);
        const endMins = timeToMins(et.hour, et.min);
        if (endMins > nowMins) {
          blocks.push({ startMins: Math.max(startMins, nowMins), endMins });
        }
      } else { i++; }
    }
    // Round up start to next 15-min boundary
    return blocks.map((b) => ({
      startMins: Math.ceil(b.startMins / 15) * 15,
      endMins: b.endMins,
    })).filter((b) => b.endMins > b.startMins);
  }, [slots]);

  const generateSchedule = () => {
    const incompleteTasks = tasks.filter((t) => !completed.has(t.id));
    if (!incompleteTasks.length) return;
    const freeBlocks = getFreeBlocks();
    if (!freeBlocks.length) return;

    // Topological sort respecting dependencies, then priority within each level
    const taskMap = new Map(incompleteTasks.map((t) => [t.id, t]));
    const placed = new Map(); // id -> endMins
    const scheduled = [];
    const unscheduled = [];

    // Build dependency-aware ordering
    const getOrder = (task, visited = new Set()) => {
      if (visited.has(task.id)) return 0;
      visited.add(task.id);
      if (!task.dependsOn || !task.dependsOn.length) return 0;
      const activeDeps = task.dependsOn.filter((d) => taskMap.has(d));
      if (!activeDeps.length) return 0;
      return 1 + Math.max(...activeDeps.map((d) => getOrder(taskMap.get(d), visited)));
    };

    const sorted = [...incompleteTasks].sort((a, b) => {
      const depA = getOrder(a), depB = getOrder(b);
      if (depA !== depB) return depA - depB;
      const pri = { high: 0, medium: 1, low: 2 };
      return pri[getDuePriority(a.dueBy)] - pri[getDuePriority(b.dueBy)] || b.duration - a.duration;
    });

    const availBlocks = freeBlocks.map((b) => ({ ...b }));

    for (const task of sorted) {
      let placed_task = false;
      // Earliest start = latest end of all dependencies
      let depEndMins = 0;
      if (task.dependsOn && task.dependsOn.length) {
        for (const depId of task.dependsOn) {
          if (placed.has(depId)) depEndMins = Math.max(depEndMins, placed.get(depId));
        }
      }
      const earliestStart = depEndMins > 0 ? depEndMins + restBreak : 0;

      for (const block of availBlocks) {
        const blockStart = Math.max(block.startMins, earliestStart);
        const breakPad = scheduled.length > 0 && blockStart === block.startMins ? restBreak : 0;
        const actualStart = blockStart + breakPad;
        if (actualStart >= block.endMins) continue;
        const roundedDuration = Math.ceil(task.duration / 15) * 15;
        if (block.endMins - actualStart >= roundedDuration) {
          const endMins = actualStart + roundedDuration;
          scheduled.push({
            ...task,
            startHour: Math.floor(actualStart / 60), startMin: actualStart % 60,
            endHour: Math.floor(endMins / 60), endMin: endMins % 60,
            hasBreakBefore: breakPad > 0 || (earliestStart > 0 && restBreak > 0),
          });
          placed.set(task.id, endMins);
          // Consume the used portion
          block.startMins = endMins;
          placed_task = true;
          break;
        }
      }
      if (!placed_task) unscheduled.push(task);
    }

    scheduled.sort((a, b) => timeToMins(a.startHour, a.startMin) - timeToMins(b.startHour, b.startMin));
    setSchedule({ scheduled, unscheduled });
  };

  const resetAll = () => {
    setTasks([]); setSlots(new Array(TOTAL_SLOTS).fill(false));
    setRestBreak(0); setSchedule(null); setCompleted(new Set());
    ["planner_tasks", "planner_slots", "planner_restBreak", "planner_schedule", "planner_completed", "planner_date"]
      .forEach((k) => localStorage.removeItem(k));
  };

  const totalTaskTime = tasks.reduce((s, t) => s + t.duration, 0);
  const totalFreeTime = slots.filter(Boolean).length * 15;
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  const dmSans = "'DM Sans', sans-serif";
  const lbl = { fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: P.textMuted, marginBottom: 4, display: "block", fontFamily: dmSans };

  return (
    <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", background: P.bg, minHeight: "100vh", color: P.text, transition: "opacity 0.8s ease", opacity: animateIn ? 1 : 0 }}>
      <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input, select, button { font-family: 'DM Sans', sans-serif; }
        input:focus, select:focus { outline: 2px solid ${P.accent}; outline-offset: 1px; }
        button { cursor: pointer; transition: all 0.2s ease; }
        button:hover { transform: translateY(-1px); }
        button:active { transform: translateY(0); }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .task-item { animation: slideUp 0.35s ease forwards; }
        .sched-item { animation: slideUp 0.4s ease forwards; }
        ::selection { background: ${P.accentLight}; }
        input::placeholder { color: ${P.textMuted}; }
        @media (max-width: 780px) { .planner-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      {timerTask && <Timer task={timerTask} onClose={(elapsedMins) => { updateTaskDuration(timerTask.id, elapsedMins); setTimerTask(null); }} />}

      {/* Header */}
      <div style={{ padding: "40px 32px 24px", maxWidth: 960, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: dmSans, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 2.5, color: P.accent, marginBottom: 10 }}>Daily Planner</div>
          <h1 style={{ fontSize: 36, fontWeight: 400, lineHeight: 1.1, marginBottom: 10 }}>{today}</h1>
          <button onClick={() => { const next = !stressMode; setStressMode(next); window.stressMode = next; }} style={{
            fontFamily: dmSans, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1,
            padding: "2px 8px", borderRadius: 6, border: `1px solid ${stressMode ? P.accent : P.border}`,
            background: stressMode ? P.accentLight : "transparent",
            color: stressMode ? P.accentDark : P.textMuted,
          }}>stress mode</button>
        </div>
        <div style={{ fontFamily: dmSans, fontSize: 12, color: P.textMuted, display: "flex", gap: 16 }}>
          <span>{tasks.length} task{tasks.length !== 1 ? "s" : ""} · {formatDuration(totalTaskTime)}</span>
          {completed.size > 0 && <span style={{ color: "#4CAF76" }}>{completed.size}/{tasks.length} done</span>}
          <span>{formatDuration(totalFreeTime)} free</span>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 32px 60px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }} className="planner-grid">

        {/* ── Left Column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Add Task */}
          <div style={{ background: P.card, borderRadius: 16, padding: 24, border: `1px solid ${P.border}` }}>
            <h2 style={{ fontSize: 20, fontWeight: 400, marginBottom: 18, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22 }}>✦</span> To-Do List
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input ref={inputRef} type="text" placeholder="What needs doing?" value={taskName}
                onChange={(e) => setTaskName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()}
                style={{ fontSize: 14, padding: "12px 16px", border: `1px solid ${P.border}`, borderRadius: 10, background: P.taskBg, color: P.text, width: "100%" }} />
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Duration (min)</label>
                  <input type="number" min="1" value={taskDuration}
                    onChange={(e) => { const v = parseInt(e.target.value); if (v > 0) setTaskDuration(v); }}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${P.border}`, background: P.taskBg, color: P.text, fontSize: 13 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Due By</label>
                  <input type="date" value={taskDueBy} min={todayStr()}
                    onChange={(e) => setTaskDueBy(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${P.border}`, background: P.taskBg, color: taskDueBy ? P.text : P.textMuted, fontSize: 13, colorScheme: "dark" }} />
                </div>
              </div>
              {/* Dependency selector */}
              {tasks.length > 0 && (
                <div>
                  <label style={lbl}>Depends on (optional)</label>
                  <div style={{
                    border: `1px solid ${P.border}`, borderRadius: 10, background: P.taskBg,
                    padding: "8px 10px", display: "flex", flexWrap: "wrap", gap: 6, minHeight: 40, alignItems: "center",
                  }}>
                    {taskDeps.map((depId) => {
                      const dt = taskMap.get(depId);
                      if (!dt) return null;
                      return (
                        <span key={depId} style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          background: P.accentLight, color: P.accentDark, borderRadius: 6,
                          padding: "4px 8px", fontSize: 12, fontWeight: 500, fontFamily: dmSans,
                        }}>
                          {dt.name}
                          <button onClick={() => setTaskDeps((p) => p.filter((d) => d !== depId))} style={{
                            background: "none", border: "none", color: P.accentDark, fontSize: 14,
                            padding: 0, lineHeight: 1, cursor: "pointer", opacity: 0.7,
                          }}>×</button>
                        </span>
                      );
                    })}
                    <select
                      value=""
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        if (id && !taskDeps.includes(id)) setTaskDeps((p) => [...p, id]);
                      }}
                      style={{
                        border: "none", background: "transparent", color: P.textMuted,
                        fontSize: 12, fontFamily: dmSans, appearance: "none", padding: "2px 4px",
                        cursor: "pointer", outline: "none", flex: taskDeps.length ? "0 0 auto" : "1",
                        minWidth: taskDeps.length ? 24 : "auto",
                      }}
                    >
                      <option value="">{taskDeps.length ? "+" : "Select tasks..."}</option>
                      {tasks.filter((t) => !taskDeps.includes(t.id)).map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              <button onClick={addTask} style={{
                padding: "12px 20px", borderRadius: 10, border: "none", background: P.accent,
                color: "#fff", fontSize: 14, fontWeight: 600, opacity: taskName.trim() ? 1 : 0.5,
              }}>Add Task</button>
            </div>
          </div>

          {/* Task List */}
          {tasks.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {tasks.map((task, i) => {
                const pc = PRIORITY_COLORS[getDuePriority(task.dueBy)];
                const dep = task.dependsOn.length ? task.dependsOn.map((d) => taskMap.get(d)).filter(Boolean) : [];
                const done = completed.has(task.id);
                const isEditing = editingTaskId === task.id;

                if (isEditing) {
                  return (
                    <div key={task.id} className="task-item" style={{
                      background: P.card, borderRadius: 12, padding: "14px 16px",
                      border: `2px solid ${P.accent}`, display: "flex", flexDirection: "column", gap: 10,
                      animationDelay: `${i * 0.05}s`,
                    }}>
                      <input
                        autoFocus
                        type="text"
                        value={editValues.name}
                        onChange={(e) => setEditValues((v) => ({ ...v, name: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") saveEdit(task.id); if (e.key === "Escape") cancelEdit(); }}
                        style={{ fontSize: 14, padding: "8px 12px", border: `1px solid ${P.border}`, borderRadius: 8, background: P.taskBg, color: P.text, width: "100%" }}
                      />
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input type="number" min="1" value={editValues.duration}
                          onChange={(e) => { const v = parseInt(e.target.value); if (v > 0) setEditValues((ev) => ({ ...ev, duration: v })); }}
                          style={{ width: 72, padding: "7px 10px", borderRadius: 8, border: `1px solid ${P.border}`, background: P.taskBg, color: P.text, fontSize: 13 }} />
                        <input type="date" value={editValues.dueBy} min={todayStr()}
                          onChange={(e) => setEditValues((v) => ({ ...v, dueBy: e.target.value }))}
                          style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: `1px solid ${P.border}`, background: P.taskBg, color: editValues.dueBy ? P.text : P.textMuted, fontSize: 13, colorScheme: "dark" }} />
                        <button onClick={() => saveEdit(task.id)} style={{
                          padding: "7px 14px", borderRadius: 8, border: "none",
                          background: P.accent, color: "#fff", fontSize: 13, fontWeight: 600,
                        }}>Save</button>
                        <button onClick={cancelEdit} style={{
                          padding: "7px 10px", borderRadius: 8, border: `1px solid ${P.border}`,
                          background: "none", color: P.textMuted, fontSize: 13,
                        }}>Cancel</button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={task.id} className="task-item" style={{
                    background: P.card, borderRadius: 12, padding: "14px 16px",
                    border: `1px solid ${P.border}`, display: "grid",
                    gridTemplateColumns: "20px minmax(0,1fr) 56px 24px 24px 24px 24px",
                    alignItems: "center", columnGap: 12, minHeight: 72, animationDelay: `${i * 0.05}s`,
                    opacity: done ? 0.55 : 1, transition: "opacity 0.3s ease",
                  }}>
                    <button onClick={() => toggleComplete(task.id)} style={{
                      width: 20, height: 20, borderRadius: 6, flexShrink: 0, cursor: "pointer",
                      border: done ? "none" : `2px solid ${pc.dot}`,
                      background: done ? pc.dot : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.2s ease", padding: 0, maxWidth: 20,
                    }}>
                      {done && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </button>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, fontFamily: dmSans, textDecoration: done ? "line-through" : "none", color: done ? P.textMuted : "#fff8f4", wordBreak: "normal", overflowWrap: "normal" }}>{task.name}</div>
                      {task.dueBy && <div style={{ fontSize: 11, color: pc.dot, fontFamily: dmSans, marginTop: 2 }}>due {formatDueLabel(task.dueBy)}</div>}
                      {dep.length > 0 && <div style={{ fontSize: 11, color: P.textMuted, fontFamily: dmSans, marginTop: 2 }}>↳ after {dep.map((d) => d.name).join(", ")}</div>}
                    </div>
                    <span style={{
                      fontFamily: dmSans, fontSize: 12, color: P.textMuted, background: P.taskBg,
                      borderRadius: 20, height: 30, width: 56, lineHeight: 1,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                    }}>{formatDuration(task.duration)}</span>
                    {!done ? (
                      <button onClick={() => setTimerTask(task)} title="Start timer" style={{
                        background: "none", border: "none", color: P.accent, fontSize: 15,
                        borderRadius: 6, lineHeight: 1, width: 24, height: 24, padding: 0,
                        whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>▶</button>
                    ) : (
                      <span style={{ width: 24, height: 24, display: "inline-block" }} />
                    )}
                    <button onClick={() => saveForLater(task)} title="Save for later" style={{
                      background: "none", border: "none", color: P.textMuted, fontSize: 14,
                      borderRadius: 6, lineHeight: 1, width: 24, height: 24, padding: 0,
                      whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>☆</button>
                    <button onClick={() => startEdit(task)} title="Edit task" style={{
                      background: "none", border: "none", color: P.textMuted, fontSize: 13,
                      borderRadius: 6, lineHeight: 1, width: 24, height: 24, padding: 0,
                      whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>✎</button>
                    <button onClick={() => removeTask(task.id)} style={{
                      background: "none", border: "none", color: P.textMuted, fontSize: 18, fontWeight: 500,
                      borderRadius: 6, lineHeight: 1, width: 24, height: 24, padding: 0,
                      whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>×</button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Settings */}
          <div style={{
            background: P.card, borderRadius: 12, padding: "14px 18px",
            border: `1px solid ${P.border}`, display: "flex", alignItems: "center",
            justifyContent: "space-between", gap: 12, flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

              <span style={{ fontFamily: dmSans, fontSize: 13, fontWeight: 500, color: P.text }}>Rest between tasks</span>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {[0, 5, 10, 15, 30].map((m) => (
                <button key={m} onClick={() => setRestBreak(m)} style={{
                  padding: "6px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                  fontFamily: dmSans, minWidth: 52, whiteSpace: "nowrap",
                  border: restBreak === m ? `2px solid ${P.accent}` : `1px solid ${P.border}`,
                  background: restBreak === m ? P.accentLight : P.taskBg,
                  color: restBreak === m ? P.accentDark : P.textMuted,
                }}>{m === 0 ? "None" : `${m}m`}</button>
              ))}
            </div>
          </div>

          {/* Generate */}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={generateSchedule} disabled={!tasks.length || !totalFreeTime || tasks.every((t) => completed.has(t.id))}
              style={{
                flex: 1, padding: "16px 24px", borderRadius: 12, border: "none",
                background: tasks.length && totalFreeTime && !tasks.every((t) => completed.has(t.id))
                  ? "linear-gradient(135deg, #D4764E 0%, #E8956D 100%)" : P.border,
                color: tasks.length && totalFreeTime && !tasks.every((t) => completed.has(t.id)) ? "#fff" : P.textMuted,
                fontSize: 15, fontWeight: 600, letterSpacing: 0.5,
                boxShadow: tasks.length && totalFreeTime && !tasks.every((t) => completed.has(t.id)) ? "0 4px 20px rgba(212,118,78,0.3)" : "none",
              }}>{schedule ? "✦ Replan" : "✦ Plan My Day"}</button>
            {schedule && <button onClick={resetAll} style={{ padding: "16px 20px", borderRadius: 12, border: `1px solid ${P.border}`, background: P.card, color: P.textMuted, fontSize: 13, fontWeight: 500 }}>Reset</button>}
          </div>

          {/* Availability — below tasks */}
          <div style={{ background: P.card, borderRadius: 16, padding: 24, border: `1px solid ${P.border}` }}>
            <h2 style={{ fontSize: 20, fontWeight: 400, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>◷</span> Availability
            </h2>
            <AvailabilityGrid slots={slots} setSlots={setSlots} />
          </div>
        </div>

        {/* ── Right Column — Schedule ── */}
        <div style={{ position: "sticky", top: 20, alignSelf: "start", maxHeight: "calc(100vh - 40px)", overflowY: "auto" }}>
          {schedule ? (
            <div style={{ background: P.card, borderRadius: 16, padding: 24, border: `1px solid ${P.border}`, animation: "fadeIn 0.5s ease" }}>
              <h2 style={{ fontSize: 20, fontWeight: 400, marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>❧</span> Your Schedule
              </h2>
              <div style={{ fontFamily: dmSans, fontSize: 11, color: P.textMuted, marginBottom: 18 }}>
                Planned from {formatTime(new Date().getHours(), Math.ceil(new Date().getMinutes() / 15) * 15 % 60)} onward
                {completed.size > 0 && <span> · {completed.size} completed</span>}
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {schedule.scheduled.map((item, i) => {
                  const pc = PRIORITY_COLORS[getDuePriority(item.dueBy)];
                  const dep = item.dependsOn && item.dependsOn.length ? item.dependsOn.map((d) => taskMap.get(d)).filter(Boolean) : [];
                  return (
                    <div key={item.id}>
                      {item.hasBreakBefore && (
                        <div className="sched-item" style={{ display: "flex", gap: 16, animationDelay: `${i * 0.08 - 0.04}s`, opacity: 0, animationFillMode: "forwards", marginBottom: 4 }}>
                          <div style={{ width: 72, flexShrink: 0 }} />
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}><div style={{ width: 2, height: "100%", background: P.border }} /></div>
                          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 8, background: "repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(212,118,78,0.08) 4px, rgba(212,118,78,0.08) 8px)" }}>
  
                            <span style={{ fontFamily: dmSans, fontSize: 11, color: P.textMuted, fontStyle: "italic" }}>{formatDuration(restBreak)} break</span>
                          </div>
                        </div>
                      )}
                      <div className="sched-item"
                        draggable
                        onDragStart={(e) => handleDragStart(e, item.id)}
                        onDragOver={(e) => handleDragOver(e, item.id)}
                        onDrop={(e) => handleDrop(e, item.id)}
                        onDragEnd={handleDragEnd}
                        style={{ display: "flex", gap: 16, animationDelay: `${i * 0.08}s`, opacity: dragTaskId.current === item.id ? 0.4 : 0, animationFillMode: "forwards", cursor: "grab" }}>
                        <div style={{ width: 72, flexShrink: 0, textAlign: "right", paddingTop: 14, fontFamily: dmSans }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{formatTime(item.startHour, item.startMin)}</div>
                          <div style={{ fontSize: 11, color: P.textMuted }}>{formatDuration(item.duration)}</div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 18 }}>
                          <div style={{ width: 10, height: 10, borderRadius: "50%", background: pc.dot, border: `2px solid ${P.card}`, boxShadow: `0 0 0 2px ${pc.dot}`, zIndex: 1 }} />
                          {i < schedule.scheduled.length - 1 && <div style={{ width: 2, flex: 1, background: `linear-gradient(to bottom, ${pc.dot}40, ${P.border})`, minHeight: 30 }} />}
                        </div>
                        <div style={{ flex: 1, background: dragOverId === item.id ? `${pc.dot}30` : completed.has(item.id) ? `${pc.bg}88` : pc.bg, borderRadius: 10, padding: "12px 16px", marginBottom: 10, borderLeft: `3px solid ${pc.dot}`, display: "flex", alignItems: "center", gap: 10, opacity: completed.has(item.id) ? 0.6 : 1, transition: "background 0.15s ease, opacity 0.3s ease" }}>
                          <button onClick={() => toggleComplete(item.id)} style={{
                            width: 20, height: 20, borderRadius: 6, flexShrink: 0, cursor: "pointer",
                            border: completed.has(item.id) ? "none" : `2px solid ${pc.dot}`,
                            background: completed.has(item.id) ? pc.dot : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.2s ease", padding: 0,
                          }}>
                            {completed.has(item.id) && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </button>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: dmSans, fontSize: 14, fontWeight: 500, textDecoration: completed.has(item.id) ? "line-through" : "none", color: completed.has(item.id) ? P.textMuted : "#fff8f4", wordBreak: "normal", overflowWrap: "normal" }}>{item.name}</div>
                            <div style={{ fontFamily: dmSans, fontSize: 11, color: P.textMuted, marginTop: 3, wordBreak: "keep-all", overflowWrap: "normal" }}>
                              {formatTime(item.startHour, item.startMin)} – {formatTime(item.endHour, item.endMin)}
                              {dep.length > 0 && <span> · after {dep.map((d) => d.name).join(", ")}</span>}
                            </div>
                          </div>
                          {!completed.has(item.id) && <button onClick={() => setTimerTask(item)} title="Start timer" style={{
                            background: "none", border: `1px solid ${pc.dot}40`, borderRadius: 8,
                            color: pc.dot, fontSize: 12, padding: "6px 10px", fontFamily: dmSans,
                            fontWeight: 600, flexShrink: 0, display: "flex", alignItems: "center", gap: 4,
                            width: "auto", maxWidth: "fit-content", whiteSpace: "nowrap",
                          }}>▶ Timer</button>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {schedule.unscheduled.length > 0 && (
                <div style={{ marginTop: 20, padding: "14px 16px", background: "#FFF5F5", borderRadius: 10, border: "1px solid #F0D0D0" }}>
                  <div style={{ fontFamily: dmSans, fontSize: 12, fontWeight: 600, color: "#C0392B", marginBottom: 8 }}>Couldn't fit these in:</div>
                  {schedule.unscheduled.map((t) => (
                    <div key={t.id} style={{ fontFamily: dmSans, fontSize: 13, color: P.text, padding: "4px 0" }}>{t.name} ({formatDuration(t.duration)})</div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{
              background: P.card, borderRadius: 16, padding: "48px 24px", border: `1px solid ${P.border}`,
              textAlign: "center",
            }}>
              <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>❧</div>
              <div style={{ fontFamily: dmSans, fontSize: 14, color: P.textMuted }}>
                Add tasks & mark your availability,
              </div>
              <div style={{ fontFamily: dmSans, fontSize: 14, color: P.textMuted }}>
                then hit <strong style={{ color: P.accent }}>Plan My Day</strong>
              </div>
            </div>
          )}

          {/* Save for Later */}
          <div style={{ background: P.card, borderRadius: 16, padding: 20, border: `1px solid ${P.border}`, marginTop: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 400, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>☆</span>
              <span style={{ fontFamily: dmSans }}>Saved for Later</span>
            </h2>
            {savedForLater.length === 0 ? (
              <div style={{ fontFamily: dmSans, fontSize: 13, color: P.textMuted }}>
                Hit ☆ on any task to save it here across resets and days.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {savedForLater.map((saved) => {
                  const pc = PRIORITY_COLORS[getDuePriority(saved.dueBy)];
                  return (
                    <div key={saved.id} style={{
                      display: "grid", gridTemplateColumns: "8px 1fr auto auto",
                      alignItems: "center", gap: 10,
                      background: P.taskBg, borderRadius: 10, padding: "10px 12px",
                      border: `1px solid ${P.border}`,
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: pc.dot }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: dmSans, fontSize: 13, fontWeight: 500, color: P.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{saved.name}</div>
                        <div style={{ fontFamily: dmSans, fontSize: 11, color: P.textMuted }}>{formatDuration(saved.duration)}</div>
                      </div>
                      <button onClick={() => addFromSaved(saved)} style={{
                        background: "none", border: `1px solid ${P.border}`, borderRadius: 6,
                        color: P.accent, fontSize: 11, fontWeight: 600, fontFamily: dmSans,
                        padding: "4px 8px", whiteSpace: "nowrap",
                      }}>+ Today</button>
                      <button onClick={() => removeSaved(saved.id)} style={{
                        background: "none", border: "none", color: P.textMuted, fontSize: 18, fontWeight: 500,
                        borderRadius: 6, lineHeight: 1, width: 24, height: 24, padding: 0,
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                      }}>×</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
