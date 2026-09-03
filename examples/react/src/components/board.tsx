import { Say } from '@saykit/react';
import {
  type Column,
  columns,
  completionRatio,
  currentMember,
  sprintEndsAt,
  sprintNumber,
  tasks,
  tasksIn,
  watchers,
} from '../board.js';
import { TaskCard } from './task-card.js';

function ColumnHeading({ column }: { column: Column }) {
  return <Say.Select _={column} todo="To do" doing="In progress" done="Done" other="Backlog" />;
}

function BoardColumn({ column }: { column: Column }) {
  const items = tasksIn(column);

  return (
    <section className="column">
      <h2 className="column__heading">
        <ColumnHeading column={column} /> <span className="column__count">{items.length}</span>
      </h2>

      {items.length === 0 ? (
        <p className="column__empty">
          <Say>
            Nothing here. <a href="#new">Add a task</a> or drag one across from{' '}
            <strong>To do</strong>.
          </Say>
        </p>
      ) : (
        items.map((task) => <TaskCard key={task.id} task={task} />)
      )}
    </section>
  );
}

export function Board() {
  const open = tasks.filter((task) => task.column !== 'done').length;

  return (
    <>
      <header className="masthead">
        <h1>
          <Say>Taskboard</Say>
        </h1>

        <p className="masthead__greeting">
          <Say>
            Welcome back, {currentMember}. This is your{' '}
            <Say.Ordinal
              _={sprintNumber}
              one={<>{sprintNumber}st</>}
              two={<>{sprintNumber}nd</>}
              few={<>{sprintNumber}rd</>}
              other={<>{sprintNumber}th</>}
            />{' '}
            sprint.
          </Say>
        </p>

        <p className="masthead__summary">
          <Say.Plural
            _={open}
            _0="Everything is done. Enjoy the quiet."
            one={<>{open} task still open</>}
            other={<>{open} tasks still open</>}
          />
        </p>

        <p className="masthead__summary">
          <Say>
            <Say.Number _={{ complete: completionRatio() }} style="percent" /> complete. This sprint
            ends on <Say.Date _={{ sprintEndsAt }} style="medium" />, at{' '}
            <Say.Time _={{ sprintEndsAt }} style="short" />.
          </Say>
        </p>

        <p className="masthead__summary">
          <Say.Plural
            _={watchers}
            offset={1}
            _1="Nobody else is watching this board"
            one={<>You and {watchers} other member are watching</>}
            other={<>You and {watchers} others are watching</>}
          />
        </p>
      </header>

      <div className="board">
        {columns.map((column) => (
          <BoardColumn key={column} column={column} />
        ))}
      </div>
    </>
  );
}
