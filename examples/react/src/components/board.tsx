import { Say } from '@saykit/react';
import { type Column, columns, currentMember, sprintNumber, tasks, tasksIn } from '../board.js';
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
          {/*
            Two elements in one message. They extract as `<0>` and `<1>`, and a
            translator may reorder or renest them freely — the rendered output
            still uses these exact React elements, with their handlers intact.
          */}
          <Say>
            Nothing here. <a href="#new">Add a task</a> or drag one across from
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
          {/*
            An ordinal nested inside a sentence. `Say.Ordinal` uses CLDR ordinal
            categories, which is why English needs `one`/`two`/`few`/`other`
            rather than a hand-rolled suffix table — and why French only needs
            `one` and `other`.
          */}
          <Say>
            Welcome back, {currentMember}. This is your
            <Say.Ordinal _={sprintNumber} one="#st" two="#nd" few="#rd" other="#th" /> sprint.
          </Say>
        </p>

        <p className="masthead__summary">
          <Say.Plural
            _={open}
            _0="Everything is done. Enjoy the quiet."
            one="# task still open"
            other="# tasks still open"
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
