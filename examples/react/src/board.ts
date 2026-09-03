export type Priority = 'urgent' | 'normal' | 'low';
export type Column = 'todo' | 'doing' | 'done';

export interface Task {
  id: string;
  title: string;
  column: Column;
  priority: Priority;
  assignee: string | null;
  comments: number;
  dueInDays: number;
  subtasks: { total: number; done: number };
}

export const tasks: Task[] = [
  {
    id: 'PLT-118',
    title: 'Rotate the staging database credentials',
    column: 'doing',
    priority: 'urgent',
    assignee: 'Amara',
    comments: 3,
    dueInDays: -1,
    subtasks: { total: 4, done: 3 },
  },
  {
    id: 'PLT-124',
    title: 'Split the checkout bundle',
    column: 'todo',
    priority: 'normal',
    assignee: null,
    comments: 0,
    dueInDays: 5,
    subtasks: { total: 3, done: 0 },
  },
  {
    id: 'PLT-131',
    title: 'Add a retry budget to the payments client',
    column: 'doing',
    priority: 'normal',
    assignee: 'Jonas',
    comments: 1,
    dueInDays: 2,
    subtasks: { total: 2, done: 1 },
  },
  {
    id: 'PLT-096',
    title: 'Document the incident review process',
    column: 'done',
    priority: 'low',
    assignee: 'Wren',
    comments: 0,
    dueInDays: 12,
    subtasks: { total: 5, done: 5 },
  },
];

export const columns: Column[] = ['todo', 'doing', 'done'];

export function tasksIn(column: Column) {
  return tasks.filter((task) => task.column === column);
}

export const sprintNumber = 22;
export const currentMember = 'Amara';

export const sprintEndsAt = new Date();
sprintEndsAt.setHours(17, 0, 0, 0);
sprintEndsAt.setDate(sprintEndsAt.getDate() + 3);

export const watchers = 5;

export function completionRatio() {
  const done = tasks.filter((task) => task.column === 'done').length;
  return done / tasks.length;
}
