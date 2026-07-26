export type Priority = 'urgent' | 'normal' | 'low';
export type Column = 'todo' | 'doing' | 'done';

export interface Task {
  id: string;
  title: string;
  column: Column;
  priority: Priority;
  assignee: string | null;
  /** Number of unresolved review comments. */
  comments: number;
  /** Days until the task is due; negative means overdue. */
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

/** How many sprints the current member has shipped, for the ordinal greeting. */
export const sprintNumber = 22;
export const currentMember = 'Amara';
