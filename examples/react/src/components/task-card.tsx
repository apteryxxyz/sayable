import { Say } from '@saykit/react';
import type { Task } from '../board.js';

function DueLabel({ dueInDays }: { dueInDays: number }) {
  if (dueInDays < 0) {
    return (
      <Say.Plural
        _={Math.abs(dueInDays)}
        one={<>{Math.abs(dueInDays)} day overdue</>}
        other={<>{Math.abs(dueInDays)} days overdue</>}
      />
    );
  }

  if (dueInDays === 0) return <Say>Due today</Say>;

  return (
    <Say.Plural
      _={dueInDays}
      one={<>Due in {dueInDays} day</>}
      other={<>Due in {dueInDays} days</>}
    />
  );
}

export function TaskCard({ task }: { task: Task }) {
  const { done, total } = task.subtasks;

  return (
    <article className={`card card--${task.priority}`}>
      <header className="card__header">
        <span className="card__id">{task.id}</span>
        <span className="card__priority">
          {/*
            `Say.Select` maps a discriminant onto a branch. `other` is mandatory —
            ICU requires a fallback, and so does the type for `Say.Select`.
          */}
          <Say.Select _={task.priority} urgent="Urgent" normal="Normal" low="Low" other="Normal" />
        </span>
      </header>

      <h3 className="card__title">{task.title}</h3>

      <p className="card__meta">
        {/*
          A JSX child inside `<Say>` is extracted as a tag, so a translator can
          move the emphasised name anywhere in the sentence without touching
          markup. The element itself never enters the catalogue. `say-tag`
          names that tag `<bold>` instead of a positional `<0>` — describe what
          the tag does, not what it wraps. The attribute is stripped at build
          time and never reaches the DOM.
        */}
        {task.assignee ? (
          <Say>
            Assigned to <strong say-tag="bold">{task.assignee}</strong>
          </Say>
        ) : (
          <Say>Nobody is on this yet</Say>
        )}
      </p>

      <footer className="card__footer">
        <span>
          <DueLabel dueInDays={task.dueInDays} />
        </span>

        <span>
          <Say.Plural
            _={total - done}
            _0="All subtasks done"
            one={<>{total - done} subtask left</>}
            other={<>{total - done} subtasks left</>}
          />
        </span>

        {task.comments > 0 && (
          <span>
            <Say.Plural
              _={task.comments}
              one={<>{task.comments} unresolved comment</>}
              other={<>{task.comments} unresolved comments</>}
            />
          </span>
        )}
      </footer>
    </article>
  );
}
