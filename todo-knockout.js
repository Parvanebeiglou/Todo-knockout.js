(function () {
  'use strict';

  const todosStorageKey = 'todos';

  function saveTodos(todos) {
    localStorage.setItem(
      todosStorageKey,
      JSON.stringify(
        todos.map((todo) => ({
          id: todo.id,
          title: todo.title(),
          completed: todo.completed(),
        })),
      ),
    );
  }

  function TodoViewModel(todo, onChange, onRemove, onEdit) {
    this.id = todo.id;
    this.title = ko.observable(todo.title);
    this.completed = ko.observable(todo.completed);
    this.isEditing = ko.observable(false);
    this.draftTitle = ko.observable(todo.title);
    this.onRemove = onRemove;
    this.onEdit = onEdit;

    this.title.subscribe(onChange);
    this.completed.subscribe(onChange);
  }

  TodoViewModel.prototype.toggleTodo = function () {
    this.completed(!this.completed());
  };

  TodoViewModel.prototype.editTodo = function () {
    this.draftTitle(this.title());
    this.onEdit(this);
    setTimeout(function () {
      const input = document.querySelector('.edit-input');
      if (input) {
        input.focus();
      }
    }, 0);
  };

  TodoViewModel.prototype.saveTodo = function () {
    const title = this.draftTitle().trim();
    if (!title) {
      alert('Todo title cannot be empty.');
      return;
    }

    this.title(title);
    this.isEditing(false);
  };

  TodoViewModel.prototype.cancelEdit = function () {
    this.isEditing(false);
    this.draftTitle(this.title());
  };

  TodoViewModel.prototype.onEditKeydown = function (_, event) {
    if (event.key === 'Enter') {
      this.saveTodo();
      return false;
    }
    if (event.key === 'Escape') {
      this.cancelEdit();
      return false;
    }
    return true;
  };

  TodoViewModel.prototype.removeTodo = function () {
    this.onRemove(this);
  };

  function AppViewModel() {
    this.newTodoTitle = ko.observable('');
    this.currentFilter = ko.observable('all');
    this.todos = ko.observableArray([]);
    this.filteredTodos = ko.pureComputed(() => {
      const filter = this.currentFilter();
      return this.todos().filter((todo) => {
        if (filter === 'active') {
          return !todo.completed();
        }
        if (filter === 'completed') {
          return todo.completed();
        }
        return true;
      });
    });

    this.addTodo = this.addTodo.bind(this);
    this.onAddKeydown = this.onAddKeydown.bind(this);
    this.loadTodos();
  }

  AppViewModel.prototype.makeTodo = function (todo) {
    return new TodoViewModel(
      todo,
      () => saveTodos(this.todos()),
      (removedTodo) => {
        this.todos.remove(removedTodo);
        saveTodos(this.todos());
      },
      (editingTodo) => {
        this.todos().forEach((todo) => todo.isEditing(false));
        editingTodo.isEditing(true);
      },
    );
  };

  AppViewModel.prototype.loadTodos = function () {
    const savedTodos = localStorage.getItem(todosStorageKey);
    if (!savedTodos) {
      return;
    }

    try {
      const parsedTodos = JSON.parse(savedTodos);
      if (!Array.isArray(parsedTodos)) {
        throw new Error('Saved todos must be an array.');
      }

      const validTodos = parsedTodos.filter(
        (todo) =>
          todo &&
          (typeof todo.id === 'string' || typeof todo.id === 'number') &&
          typeof todo.title === 'string' &&
          typeof todo.completed === 'boolean',
      );
      this.todos(validTodos.map((todo) => this.makeTodo(todo)));
    } catch (error) {
      console.error('Could not load saved todos.', error);
      localStorage.removeItem(todosStorageKey);
    }
  };

  AppViewModel.prototype.addTodo = function () {
    const title = this.newTodoTitle().trim();
    if (!title) {
      alert('Please enter a todo.');
      return;
    }

    this.todos.push(
      this.makeTodo({
        id: Date.now(),
        title,
        completed: false,
      }),
    );
    saveTodos(this.todos());
    this.newTodoTitle('');
  };

  AppViewModel.prototype.onAddKeydown = function (_, event) {
    if (event.key === 'Enter') {
      this.addTodo();
      return false;
    }
    return true;
  };

  function setupBindings() {
    const todoBox = document.querySelector('.todo-box');
    const input = document.getElementById('todo-input');
    const addButton = document.getElementById('add-button');
    const list = document.getElementById('todoList');

    input.removeAttribute('onkeydown');
    addButton.removeAttribute('onclick');
    input.setAttribute(
      'data-bind',
      'textInput: newTodoTitle, event: { keydown: onAddKeydown }',
    );
    addButton.setAttribute('data-bind', 'click: addTodo');

    document.querySelectorAll('.filter-button').forEach((button) => {
      const filter = button.dataset.filter;
      button.removeAttribute('onclick');
      button.setAttribute(
        'data-bind',
        `click: function () { currentFilter('${filter}'); }, css: { active: currentFilter() === '${filter}' }`,
      );
    });

    list.innerHTML = `
      <li data-bind="css: { completed: completed }">
        <span class="todo-title" data-bind="text: title, visible: !isEditing()"></span>
        <input class="edit-input" type="text" data-bind="textInput: draftTitle, visible: isEditing, event: { keydown: onEditKeydown }" />
        <div class="todo-actions">
          <button class="todo-button" type="button" data-bind="text: completed() ? 'Undo' : 'Complete', click: toggleTodo, visible: !isEditing()"></button>
          <button class="todo-button" type="button" data-bind="click: editTodo, visible: !isEditing()">Edit</button>
          <button class="todo-button remove" type="button" data-bind="click: removeTodo, visible: !isEditing()">Remove</button>
          <button class="todo-button" type="button" data-bind="click: saveTodo, visible: isEditing">Save</button>
          <button class="todo-button" type="button" data-bind="click: cancelEdit, visible: isEditing">Cancel</button>
        </div>
      </li>`;
    list.setAttribute('data-bind', 'foreach: filteredTodos');
    ko.applyBindings(new AppViewModel(), todoBox);
  }

  const knockoutScript = document.createElement('script');
  knockoutScript.src =
    'https://cdn.jsdelivr.net/npm/knockout@3.5.1/build/output/knockout-latest.js';
  knockoutScript.onload = setupBindings;
  knockoutScript.onerror = function () {
    console.error('Could not load Knockout.js from jsDelivr.');
  };
  document.head.appendChild(knockoutScript);
})();
