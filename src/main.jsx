import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { dashboardCopy, events, navigation, taskSeed } from "./data";
import "./index.css";

const priorityLabels = { high: "High", medium: "Medium", low: "Low" };

function formatCreatedAt(value) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || "No date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatTime(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return value || "No time";
  const hours = Number(match[1]);
  const period = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${match[2]} ${period}`;
}

function formatDeadline(task) {
  const date = formatDate(task.deadline || task.due);
  return task.deadlineTime
    ? `${date} · ${formatTime(task.deadlineTime)}`
    : date;
}

function inputDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? value : "";
}

function loadTasks() {
  const savedTasks =
    JSON.parse(localStorage.getItem("taskspace-tasks") || "null") || taskSeed;
  return savedTasks.map((task, index) => {
    const seedTask = taskSeed.find((seed) => seed.id === task.id);
    return {
      ...task,
      createdAt:
        task.createdAt ||
        `2026-09-06T${String(9 + index).padStart(2, "0")}:00:00`,
      startDate: task.startDate || seedTask?.startDate || "",
      deadline: task.deadline || seedTask?.deadline || "",
      deadlineTime: task.deadlineTime || seedTask?.deadlineTime || "",
      type: task.type || seedTask?.type || "Task",
    };
  });
}

function isTaskOnDate(task, date) {
  const start = task.startDate || task.deadline || task.due;
  const deadline = task.deadline || task.startDate || task.due;
  return Boolean(start && deadline && start <= date && date <= deadline);
}

function isEventOnDate(event, date) {
  if (event.date === date) return true;
  if (event.date === "Today") return date === "2026-09-06";
  if (event.date === "Tomorrow") return date === "2026-09-07";
  return event.date === "Sep 10" && date === "2026-09-10";
}

function App() {
  const [activeView, setActiveView] = useState(
    () => localStorage.getItem("taskspace-view") || "overview",
  );
  const [tasks, setTasks] = useState(loadTasks);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("priority");
  const [showModal, setShowModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [detailEditing, setDetailEditing] = useState(false);
  const [calendarItem, setCalendarItem] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [eventItems, setEventItems] = useState(() =>
    (
      JSON.parse(localStorage.getItem("taskspace-events") || "null") || events
    ).map((event) => ({ ...event, completed: event.completed || false })),
  );
  const [dark, setDark] = useState(false);
  const visibleTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const matchesQuery = `${task.title} ${task.description} ${task.tag}`
          .toLowerCase()
          .includes(query.toLowerCase());
        return matchesQuery && (filter === "all" || task.status === filter);
      }),
    [tasks, query, filter],
  );
  const sortedTasks = useMemo(
    () =>
      [...visibleTasks].sort((a, b) => {
        if (sortBy === "priority")
          return (
            { high: 0, medium: 1, low: 2 }[a.priority] -
            { high: 0, medium: 1, low: 2 }[b.priority]
          );
        if (sortBy === "deadline")
          return (a.deadline || "9999-12-31").localeCompare(
            b.deadline || "9999-12-31",
          );
        if (sortBy === "status")
          return (
            { progress: 0, todo: 1, done: 2 }[a.status] -
            { progress: 0, todo: 1, done: 2 }[b.status]
          );
        return a.title.localeCompare(b.title);
      }),
    [visibleTasks, sortBy],
  );
  const completed = tasks.filter((task) => task.status === "done").length;
  const progress = Math.round((completed / tasks.length) * 100);

  function updateTasks(nextTasks) {
    setTasks(nextTasks);
    localStorage.setItem("taskspace-tasks", JSON.stringify(nextTasks));
  }
  function navigateView(view) {
    setActiveView(view);
    localStorage.setItem("taskspace-view", view);
    setDetailItem(null);
    setDetailEditing(false);
    setCalendarItem(null);
  }
  function openEventModal(eventItem = null) {
    setSelectedEvent(eventItem);
    setShowEventModal(true);
  }
  function openTaskDetails(task) {
    setDetailItem({ kind: "task", data: task });
    setDetailEditing(false);
  }
  function openEventDetails(eventItem) {
    setDetailItem({ kind: "event", data: eventItem });
    setDetailEditing(false);
  }
  function addEvent(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextEvent = {
      id: selectedEvent?.id || Date.now(),
      title: form.get("title"),
      time: form.get("time"),
      date: form.get("date"),
      type: form.get("type"),
      description: form.get("description") || "No description yet.",
      color: form.get("color"),
      completed: selectedEvent?.completed || false,
    };
    const nextEvents = selectedEvent
      ? eventItems.map((item) =>
          item.id === selectedEvent.id ? nextEvent : item,
        )
      : [...eventItems, nextEvent];
    setEventItems(nextEvents);
    localStorage.setItem("taskspace-events", JSON.stringify(nextEvents));
    setShowEventModal(false);
    setSelectedEvent(null);
    event.currentTarget.reset();
  }
  function deleteEvent() {
    setConfirmDialog({
      title: "Delete event?",
      message: `“${selectedEvent.title}” will be permanently removed.`,
      action: () => {
        const nextEvents = eventItems.filter(
          (item) => item.id !== selectedEvent.id,
        );
        setEventItems(nextEvents);
        localStorage.setItem("taskspace-events", JSON.stringify(nextEvents));
        setShowEventModal(false);
        setSelectedEvent(null);
      },
    });
  }
  function toggleTask(id) {
    updateTasks(
      tasks.map((task) =>
        task.id === id
          ? { ...task, status: task.status === "done" ? "todo" : "done" }
          : task,
      ),
    );
  }
  function updateTaskStatus(id, status) {
    updateTasks(
      tasks.map((task) => (task.id === id ? { ...task, status } : task)),
    );
  }
  function toggleEvent(id) {
    const nextEvents = eventItems.map((event) =>
      event.id === id ? { ...event, completed: !event.completed } : event,
    );
    setEventItems(nextEvents);
    localStorage.setItem("taskspace-events", JSON.stringify(nextEvents));
  }
  function addTask(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = {
      id: Date.now(),
      title: form.get("title"),
      description: form.get("description") || "No description yet.",
      status: "todo",
      priority: form.get("priority"),
      type: form.get("type"),
      due: form.get("deadline") || "No date",
      startDate: form.get("startDate"),
      deadline: form.get("deadline"),
      deadlineTime: form.get("deadlineTime"),
      tag: form.get("tag") || "New",
      icon: "✦",
      createdAt: new Date().toISOString(),
    };
    updateTasks([next, ...tasks]);
    setShowModal(false);
    event.currentTarget.reset();
  }
  function updateTask(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const updatedTask = {
      ...detailItem.data,
      title: form.get("title"),
      description: form.get("description") || "No description yet.",
      priority: form.get("priority"),
      type: form.get("type"),
      startDate: form.get("startDate"),
      deadline: form.get("deadline"),
      deadlineTime:
        form.get("deadlineTime") || detailItem.data.deadlineTime || "",
      due: form.get("deadline") || "No date",
      tag: form.get("tag") || "Uncategorized",
    };
    updateTasks(
      tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task)),
    );
    setDetailItem({ kind: "task", data: updatedTask });
    setDetailEditing(false);
  }
  function updateEvent(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const updatedEvent = {
      ...detailItem.data,
      title: form.get("title"),
      description: form.get("description") || "No description yet.",
      type: form.get("type"),
      color: form.get("color"),
      date: form.get("date"),
      time: form.get("time"),
    };
    const nextEvents = eventItems.map((item) =>
      item.id === updatedEvent.id ? updatedEvent : item,
    );
    setEventItems(nextEvents);
    localStorage.setItem("taskspace-events", JSON.stringify(nextEvents));
    setDetailItem({ kind: "event", data: updatedEvent });
    setDetailEditing(false);
  }
  function confirmDeleteTask(task) {
    setConfirmDialog({
      title: "Delete task?",
      message: `“${task.title}” will be permanently removed.`,
      action: () => {
        updateTasks(tasks.filter((item) => item.id !== task.id));
        setDetailItem(null);
      },
    });
  }
  function confirmDeleteEvent(eventItem) {
    setConfirmDialog({
      title: "Delete event?",
      message: `“${eventItem.title}” will be permanently removed.`,
      action: () => {
        const nextEvents = eventItems.filter(
          (item) => item.id !== eventItem.id,
        );
        setEventItems(nextEvents);
        localStorage.setItem("taskspace-events", JSON.stringify(nextEvents));
        setDetailItem(null);
      },
    });
  }
  function deleteTask() {
    confirmDeleteTask(detailItem.data);
  }

  return (
    <div className={dark ? "app dark" : "app"}>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">ts</span>
          <span>taskspace</span>
        </div>
        <p className="sidebar-label">Workspace</p>
        <nav>
          {navigation.map((item) => (
            <button
              key={item.id}
              className={
                activeView === item.id ? "nav-item active" : "nav-item"
              }
              onClick={() => navigateView(item.id)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p className="sidebar-label">Preferences</p>
          <button className="nav-item" onClick={() => setDark(!dark)}>
            <span>{dark ? "☼" : "◐"}</span>
            {dark ? "Light mode" : "Dark mode"}
          </button>
          <div className="profile">
            <div className="avatar">JD</div>
            <div>
              <strong>Jamie Doe</strong>
              <small>Personal space</small>
            </div>
            <span>•••</span>
          </div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>Workspace</span>
            <b>/</b>
            <strong>
              {navigation.find((item) => item.id === activeView)?.label}
            </strong>
          </div>
          <div className="top-actions">
            <label className="search">
              <span>⌕</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search anything"
              />
            </label>
            <button className="icon-button">⌘ K</button>
            <button className="avatar small">JD</button>
          </div>
        </header>
        {activeView === "overview" && (
          <Overview
            progress={progress}
            completed={completed}
            tasks={sortedTasks}
            events={eventItems}
            toggleTask={toggleTask}
            onOpen={openTaskDetails}
            onAdd={() => setShowModal(true)}
          />
        )}
        {activeView === "tasks" && (
          <TasksView
            tasks={sortedTasks}
            filter={filter}
            setFilter={setFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            toggleTask={toggleTask}
            onStatusChange={updateTaskStatus}
            onOpen={openTaskDetails}
            onDelete={confirmDeleteTask}
            onAdd={() => setShowModal(true)}
          />
        )}
        {activeView === "calendar" && (
          <CalendarView
            tasks={tasks}
            events={eventItems}
            onOpen={(kind, data) => setCalendarItem({ kind, data })}
          />
        )}
        {activeView === "events" && (
          <EventsView
            events={eventItems}
            onAdd={() => openEventModal()}
            onEdit={openEventDetails}
            onToggle={toggleEvent}
            onDelete={confirmDeleteEvent}
          />
        )}
        {activeView === "insights" && (
          <Insights tasks={tasks} progress={progress} />
        )}
      </main>
      {showModal && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setShowModal(false)
          }
        >
          <form className="modal" onSubmit={addTask}>
            <div className="modal-heading">
              <div>
                <p className="eyebrow">New entry</p>
                <h2>Add a task</h2>
              </div>
              <button
                type="button"
                className="close"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            <label>
              Task name
              <input
                name="title"
                required
                placeholder="What needs your attention?"
                autoFocus
              />
            </label>
            <label>
              Description
              <textarea
                name="description"
                placeholder="A little context goes a long way."
              />
            </label>
            <div className="form-grid">
              <label>
                Type
                <select name="type" defaultValue="Task">
                  <option>Task</option>
                  <option>Deadline</option>
                  <option>Meeting</option>
                  <option>Important</option>
                </select>
              </label>
              <label>
                Priority
                <select name="priority" defaultValue="medium">
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>
            </div>
            <label>
              Category
              <input name="tag" placeholder="e.g. Design" />
            </label>
            <div className="form-grid">
              <label>
                Start date
                <input name="startDate" type="date" required />
              </label>
              <label>
                Deadline
                <input name="deadline" type="date" required />
              </label>
              <label>
                Deadline time
                <input name="deadlineTime" type="time" />
              </label>
            </div>
            <button className="primary full" type="submit">
              Add task <span>↗</span>
            </button>
          </form>
        </div>
      )}
      {showEventModal && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) =>
            event.target === event.currentTarget &&
            (setShowEventModal(false), setSelectedEvent(null))
          }
        >
          <form className="modal" onSubmit={addEvent}>
            <div className="modal-heading">
              <div>
                <p className="eyebrow">
                  {selectedEvent ? "Edit entry" : "New entry"}
                </p>
                <h2>{selectedEvent ? "Update event" : "Add an event"}</h2>
              </div>
              <button
                type="button"
                className="close"
                onClick={() => {
                  setShowEventModal(false);
                  setSelectedEvent(null);
                }}
              >
                ×
              </button>
            </div>
            <label>
              Event name
              <input
                name="title"
                required
                defaultValue={selectedEvent?.title || ""}
                placeholder="What is happening?"
                autoFocus
              />
            </label>
            <label>
              Description
              <textarea
                name="description"
                defaultValue={selectedEvent?.description || ""}
                placeholder="Add useful context for this event."
              />
            </label>
            <div className="form-grid">
              <label>
                Category
                <select
                  name="type"
                  defaultValue={selectedEvent?.type || "Meeting"}
                >
                  <option>Meeting</option>
                  <option>Deadline</option>
                  <option>Important</option>
                </select>
              </label>
              <label>
                Color
                <select
                  name="color"
                  defaultValue={selectedEvent?.color || "coral"}
                >
                  <option value="coral">Coral</option>
                  <option value="blue">Blue</option>
                  <option value="green">Green</option>
                </select>
              </label>
            </div>
            <div className="form-grid">
              <label>
                Date
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={inputDate(selectedEvent?.date)}
                />
              </label>
              <label>
                Time
                <input
                  name="time"
                  required
                  defaultValue={selectedEvent?.time || ""}
                  placeholder="e.g. 14:00"
                />
              </label>
            </div>
            <div className="modal-footer">
              {selectedEvent && (
                <button
                  type="button"
                  className="delete-button"
                  onClick={deleteEvent}
                >
                  Delete event
                </button>
              )}
              <button className="primary" type="submit">
                {selectedEvent ? "Update event" : "Add event"} <span>↗</span>
              </button>
            </div>
          </form>
        </div>
      )}
      {detailItem && (
        <DetailDrawer
          item={detailItem}
          editing={detailEditing}
          onClose={() => setDetailItem(null)}
          onEdit={() => setDetailEditing(true)}
          onUpdate={detailItem.kind === "task" ? updateTask : updateEvent}
          onDelete={
            detailItem.kind === "task"
              ? deleteTask
              : () => confirmDeleteEvent(detailItem.data)
          }
        />
      )}
      {calendarItem && (
        <CalendarDetailModal
          item={calendarItem}
          onClose={() => setCalendarItem(null)}
        />
      )}
      {confirmDialog && (
        <ConfirmModal
          title={confirmDialog.title}
          message={confirmDialog.message}
          onCancel={() => setConfirmDialog(null)}
          onConfirm={() => {
            confirmDialog.action();
            setConfirmDialog(null);
          }}
        />
      )}
    </div>
  );
}

function Overview({
  progress,
  completed,
  tasks,
  events,
  toggleTask,
  onOpen,
  onAdd,
}) {
  return (
    <section className="page">
      <div className="hero">
        <div>
          <p className="eyebrow">{dashboardCopy.eyebrow}</p>
          <h1>{dashboardCopy.title}</h1>
          <p className="hero-subtitle">{dashboardCopy.subtitle}</p>
        </div>
        <button className="primary" onClick={onAdd}>
          New task <span>+</span>
        </button>
      </div>
      <div className="metric-grid">
        <Metric
          label="Open tasks"
          value={tasks.filter((task) => task.status !== "done").length}
          detail="2 due today"
          tone="peach"
        />
        <Metric
          label="Completed"
          value={completed}
          detail="+12% this week"
          tone="mint"
        />
        <Metric
          label="Focus score"
          value={`${progress}%`}
          detail="Keep the rhythm"
          tone="lilac"
        />
      </div>
      <div className="content-grid">
        <div className="panel task-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Your queue</p>
              <h2>Priority tasks</h2>
            </div>
            <button className="text-button" onClick={onAdd}>
              View all <span>→</span>
            </button>
          </div>
          <div className="task-list">
            {tasks.slice(0, 4).map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={() => toggleTask(task.id)}
                onOpen={() => onOpen(task)}
              />
            ))}
          </div>
        </div>
        <aside className="panel day-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Coming up</p>
              <h2>Today</h2>
            </div>
            <span className="date-badge">
              06<span>SEP</span>
            </span>
          </div>
          <div className="event-list">
            {events.map((event) => (
              <div className="event" key={event.id}>
                <span className={`event-dot ${event.color}`} />
                <div>
                  <strong>{event.title}</strong>
                  <small>
                    {formatDate(event.date)} · {formatTime(event.time)}
                  </small>
                </div>
              </div>
            ))}
          </div>
          <div className="quote">
            “The secret of getting ahead is getting started.”
            <small>— Mark Twain</small>
          </div>
        </aside>
      </div>
    </section>
  );
}
function Metric({ label, value, detail, tone }) {
  return (
    <div className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
function TaskRow({
  task,
  onToggle,
  onOpen,
  onDelete,
  onStatusChange,
  table = false,
}) {
  return (
    <div className={table ? "task-row table-row" : "task-row"}>
      {!table && (
        <button
          className={task.status === "done" ? "check checked" : "check"}
          onClick={onToggle}
        >
          {task.status === "done" ? "✓" : ""}
        </button>
      )}
      <div className="task-copy">
        <button
          className={task.status === "done" ? "task-title done" : "task-title"}
          onClick={onOpen}
        >
          {task.title}
        </button>
        <small>{task.description}</small>
      </div>
      {table && (
        <span className="task-type">{task.tag || "Uncategorized"}</span>
      )}
      <span className={`priority ${task.priority}`}>
        {priorityLabels[task.priority]}
      </span>
      {table && (
        <select
          className={`task-status-select ${task.status}`}
          value={task.status}
          onChange={(event) => onStatusChange(task.id, event.target.value)}
          aria-label={`Change status for ${task.title}`}
        >
          <option value="todo">To do</option>
          <option value="progress">In progress</option>
          <option value="done">Completed</option>
        </select>
      )}
      <span className="task-due">
        {formatDate(task.deadline || task.due)}
        {task.deadlineTime && <small>{formatTime(task.deadlineTime)}</small>}
      </span>
      {table && (
        <div className="table-actions">
          <button
            className={task.status === "done" ? "check checked" : "check"}
            onClick={() => onToggle(task.id)}
            aria-label={`Complete ${task.title}`}
          >
            {task.status === "done" ? "✓" : ""}
          </button>
          <button
            className="row-delete"
            onClick={() => onDelete(task)}
            aria-label={`Delete ${task.title}`}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
function TasksView({
  tasks,
  filter,
  setFilter,
  sortBy,
  setSortBy,
  toggleTask,
  onStatusChange,
  onOpen,
  onDelete,
  onAdd,
}) {
  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Workspace / My tasks</p>
          <h1>All tasks</h1>
          <p>Keep the important things moving.</p>
        </div>
        <button className="primary" onClick={onAdd}>
          New task <span>+</span>
        </button>
      </div>
      <div className="toolbar">
        <div className="filter-tabs">
          {[
            ["all", "All"],
            ["todo", "To do"],
            ["progress", "In progress"],
            ["done", "Completed"],
          ].map(([id, label]) => (
            <button
              className={filter === id ? "selected" : ""}
              key={id}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="sort-control">
          Sort by
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
          >
            <option value="priority">Priority</option>
            <option value="deadline">Deadline</option>
            <option value="status">Status</option>
            <option value="title">Title</option>
          </select>
        </label>
        <span className="task-count">{tasks.length} tasks</span>
      </div>
      <div className="panel full-panel task-table">
        <div className="task-table-header">
          <span>Task</span>
          <span>Category</span>
          <span>Priority</span>
          <span>Status</span>
          <span>Deadline</span>
          <span>Actions</span>
        </div>
        <div className="task-list">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              table
              onToggle={() => toggleTask(task.id)}
              onStatusChange={onStatusChange}
              onOpen={() => onOpen(task)}
              onDelete={onDelete}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
function TaskDetailsModal({ task, onClose, onUpdate, onDelete }) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <form className="modal task-details-modal" onSubmit={onUpdate}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Task details</p>
            <h2>{task.title}</h2>
          </div>
          <button type="button" className="close" onClick={onClose}>
            ×
          </button>
        </div>
        <p className="created-at">Created {formatCreatedAt(task.createdAt)}</p>
        <label>
          Task title
          <input name="title" defaultValue={task.title} required />
        </label>
        <label>
          Description
          <textarea name="description" defaultValue={task.description} />
        </label>
        <div className="form-grid">
          <label>
            Type
            <select name="type" defaultValue={task.type || "Task"}>
              <option>Task</option>
              <option>Deadline</option>
              <option>Meeting</option>
              <option>Important</option>
            </select>
          </label>
          <label>
            Priority
            <select name="priority" defaultValue={task.priority}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
        </div>
        <label>
          Category
          <input name="tag" defaultValue={task.tag} placeholder="e.g. Design" />
        </label>
        <div className="form-grid">
          <label>
            Start date
            <input
              name="startDate"
              type="date"
              defaultValue={task.startDate}
              required
            />
          </label>
          <label>
            Deadline
            <input
              name="deadline"
              type="date"
              defaultValue={task.deadline || task.due}
              required
            />
          </label>
        </div>
        <div className="detail-meta">
          <span>
            Status{" "}
            <b>
              {task.status === "done"
                ? "Completed"
                : task.status === "progress"
                  ? "In progress"
                  : "To do"}
            </b>
          </span>
          <span>
            Range{" "}
            <b>
              {task.startDate || "Not set"} to{" "}
              {task.deadline || task.due || "Not set"}
            </b>
          </span>
        </div>
        <div className="modal-footer">
          <button type="button" className="delete-button" onClick={onDelete}>
            Delete task
          </button>
          <button className="primary" type="submit">
            Update task <span>↗</span>
          </button>
        </div>
      </form>
    </div>
  );
}
function ConfirmModal({ title, message, onCancel, onConfirm }) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) =>
        event.target === event.currentTarget && onCancel()
      }
    >
      <div className="modal confirm-modal">
        <div className="confirm-symbol">!</div>
        <p className="eyebrow">Please confirm</p>
        <h2>{title}</h2>
        <p className="confirm-message">{message}</p>
        <div className="modal-footer">
          <button type="button" className="ghost-button" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="delete-confirm-button"
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
function CalendarDetailModal({ item, onClose }) {
  const isTask = item.kind === "task";
  const record = item.data;
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="modal calendar-detail-modal">
        <div className="modal-heading">
          <div>
            <p className="eyebrow">{isTask ? "Task" : "Event"} view</p>
            <h2>{record.title}</h2>
          </div>
          <button type="button" className="close" onClick={onClose}>
            ×
          </button>
        </div>
        <p className="drawer-description">{record.description}</p>
        <div className="drawer-facts">
          {isTask ? (
            <>
              <span>
                Category <b>{record.tag || "Uncategorized"}</b>
              </span>
              <span>
                Priority <b>{priorityLabels[record.priority]}</b>
              </span>
              <span>
                Status{" "}
                <b>
                  {record.status === "done"
                    ? "Completed"
                    : record.status === "progress"
                      ? "In progress"
                      : "To do"}
                </b>
              </span>
              <span>
                Start <b>{formatDate(record.startDate)}</b>
              </span>
              <span>
                Deadline <b>{formatDate(record.deadline || record.due)}</b>
              </span>
            </>
          ) : (
            <>
              <span>
                Category <b>{record.type}</b>
              </span>
              <span>
                Date <b>{formatDate(record.date)}</b>
              </span>
              <span>
                Time <b>{formatTime(record.time)}</b>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
function DetailDrawer({ item, editing, onClose, onEdit, onUpdate, onDelete }) {
  const isTask = item.kind === "task";
  const record = item.data;
  return (
    <aside className="detail-drawer">
      <div className="drawer-header">
        <div>
          <p className="eyebrow">{isTask ? "Task details" : "Event details"}</p>
          <h2>{record.title}</h2>
        </div>
        <button className="close" onClick={onClose}>
          ×
        </button>
      </div>
      {editing ? (
        <form onSubmit={onUpdate}>
          <label>
            {isTask ? "Task title" : "Event name"}
            <input name="title" defaultValue={record.title} required />
          </label>
          <label>
            Description
            <textarea name="description" defaultValue={record.description} />
          </label>
          <div className="form-grid">
            {isTask ? (
              <>
                <label>
                  Type
                  <select name="type" defaultValue={record.type || "Task"}>
                    <option>Task</option>
                    <option>Deadline</option>
                    <option>Meeting</option>
                    <option>Important</option>
                  </select>
                </label>
                <label>
                  Priority
                  <select name="priority" defaultValue={record.priority}>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </label>
              </>
            ) : (
              <>
                <label>
                  Category
                  <select name="type" defaultValue={record.type}>
                    <option>Meeting</option>
                    <option>Deadline</option>
                    <option>Important</option>
                  </select>
                </label>
                <label>
                  Color
                  <select name="color" defaultValue={record.color}>
                    <option value="coral">Coral</option>
                    <option value="blue">Blue</option>
                    <option value="green">Green</option>
                  </select>
                </label>
              </>
            )}
          </div>
          {isTask ? (
            <>
              <label>
                Category
                <input name="tag" defaultValue={record.tag} />
              </label>
              <div className="form-grid">
                <label>
                  Start date
                  <input
                    name="startDate"
                    type="date"
                    defaultValue={record.startDate}
                    required
                  />
                </label>
                <label>
                  Deadline
                  <input
                    name="deadline"
                    type="date"
                    defaultValue={record.deadline || record.due}
                    required
                  />
                </label>
              </div>
            </>
          ) : (
            <div className="form-grid">
              <label>
                Date
                <input
                  name="date"
                  type="date"
                  defaultValue={inputDate(record.date)}
                  required
                />
              </label>
              <label>
                Time
                <input name="time" defaultValue={record.time} required />
              </label>
            </div>
          )}
          <div className="drawer-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => onClose()}
            >
              Cancel
            </button>
            <button className="primary" type="submit">
              Save update <span>↗</span>
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="drawer-description">{record.description}</p>
          <div className="drawer-facts">
            {isTask ? (
              <>
                <span>
                  Category <b>{record.tag || "Uncategorized"}</b>
                </span>
                <span>
                  Priority <b>{priorityLabels[record.priority]}</b>
                </span>
                <span>
                  Status{" "}
                  <b>
                    {record.status === "done"
                      ? "Completed"
                      : record.status === "progress"
                        ? "In progress"
                        : "To do"}
                  </b>
                </span>
                <span>
                  Deadline <b>{formatDate(record.deadline || record.due)}</b>
                </span>
                <span>
                  Created <b>{formatCreatedAt(record.createdAt)}</b>
                </span>
              </>
            ) : (
              <>
                <span>
                  Category <b>{record.type}</b>
                </span>
                <span>
                  When{" "}
                  <b>
                    {formatDate(record.date)} · {formatTime(record.time)}
                  </b>
                </span>
              </>
            )}
          </div>
          <div className="drawer-actions">
            <button className="delete-button" onClick={onDelete}>
              Delete
            </button>
            <button className="primary" onClick={onEdit}>
              Update
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
function EventsView({ events, onAdd, onEdit, onToggle, onDelete }) {
  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Workspace / Events</p>
          <h1>Coming up</h1>
          <p>Meetings, deadlines, and important moments in one place.</p>
        </div>
        <button className="primary" onClick={onAdd}>
          New event <span>+</span>
        </button>
      </div>
      <div className="event-summary">
        <Metric
          label="Meetings"
          value={events.filter((event) => event.type === "Meeting").length}
          detail="Keep your conversations focused"
          tone="peach"
        />
        <Metric
          label="Deadlines"
          value={events.filter((event) => event.type === "Deadline").length}
          detail="Plan before the pressure"
          tone="mint"
        />
        <Metric
          label="Important"
          value={events.filter((event) => event.type === "Important").length}
          detail="Stay close to what matters"
          tone="lilac"
        />
      </div>
      <div className="panel events-panel">
        <div className="event-table-header">
          <span>Event</span>
          <span>Category</span>
          <span>Date</span>
          <span>Actions</span>
        </div>
        {events.map((event) => (
          <div
            className={event.completed ? "event-row completed" : "event-row"}
            key={event.id}
          >
            <div className="event-name">
              <div>
                <button
                  className="event-title-button"
                  onClick={() => onEdit(event)}
                >
                  {event.title}
                </button>
                <small>{event.description}</small>
              </div>
            </div>
            <span className={`event-type ${event.type.toLowerCase()}`}>
              {event.type}
            </span>
            <span className="event-when">
              {formatDate(event.date)}
              <small>{formatTime(event.time)}</small>
            </span>
            <div className="table-actions">
              <button
                className={event.completed ? "check checked" : "check"}
                onClick={() => onToggle(event.id)}
                aria-label={`Complete ${event.title}`}
              >
                {event.completed ? "✓" : ""}
              </button>
              <button
                className="row-delete"
                onClick={() => onDelete(event)}
                aria-label={`Delete ${event.title}`}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
function CalendarView({ tasks, events, onOpen }) {
  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Workspace / Calendar</p>
          <h1>September 2026</h1>
          <p>Tasks and events are plotted across their dates.</p>
        </div>
        <button className="ghost-button">Today</button>
      </div>
      <div className="panel calendar">
        <div className="weekdays">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="calendar-grid">
          {Array.from({ length: 35 }, (_, index) => {
            const dayNumber = index < 2 || index > 31 ? null : index - 1;
            const date = dayNumber
              ? `2026-09-${String(dayNumber).padStart(2, "0")}`
              : "";
            const dayTasks = date
              ? tasks.filter((task) => isTaskOnDate(task, date))
              : [];
            const dayEvents = date
              ? events.filter((event) => isEventOnDate(event, date))
              : [];
            return (
              <div
                className={
                  date === "2026-09-06" ? "calendar-day today" : "calendar-day"
                }
                key={index}
              >
                <span>{dayNumber}</span>
                {dayTasks.map((task) => (
                  <button
                    className={`calendar-task ${task.priority}`}
                    title={task.title}
                    key={`task-${task.id}`}
                    onClick={() => onOpen("task", task)}
                  >
                    {task.title}
                  </button>
                ))}
                {dayEvents.map((event) => (
                  <button
                    className={`calendar-event ${event.color}`}
                    title={event.title}
                    key={`event-${event.id}`}
                    onClick={() => onOpen("event", event)}
                  >
                    {event.title}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
function Insights({ tasks, progress }) {
  const counts = ["high", "medium", "low"].map((priority) => ({
    priority,
    count: tasks.filter((task) => task.priority === priority).length,
  }));
  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Workspace / Insights</p>
          <h1>Your momentum</h1>
          <p>Small signals that help you work with intention.</p>
        </div>
      </div>
      <div className="insight-grid">
        <div className="panel score-panel">
          <p className="eyebrow">Completion rate</p>
          <strong>{progress}%</strong>
          <div className="progress-track">
            <i style={{ width: `${progress}%` }} />
          </div>
          <p>
            {progress > 50
              ? "You are building a steady rhythm."
              : "A few small wins will change the shape of your week."}
          </p>
        </div>
        <div className="panel breakdown">
          <p className="eyebrow">Priority mix</p>
          {counts.map(({ priority, count }) => (
            <div className="bar-row" key={priority}>
              <span>{priorityLabels[priority]}</span>
              <div>
                <i
                  className={priority}
                  style={{ width: `${Math.max(count * 18, 8)}%` }}
                />
              </div>
              <b>{count}</b>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

createRoot(document.getElementById("root")).render(<App />);
