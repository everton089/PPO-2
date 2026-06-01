import { Database } from "bun:sqlite";

const db = new Database("database.sqlite");

db.run(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL
  )
`);

const querySelectItems = db.prepare("SELECT * FROM items");
const queryInsertItem = db.prepare(
  "INSERT INTO items (title) VALUES (?)"
);
const queryDeleteItem = db.prepare(
  "DELETE FROM items WHERE id = ?"
);
const queryUpdateItem = db.prepare(
  "UPDATE items SET title = ? WHERE id = ?"
);

export class TodoList {
  getItems() {
    return querySelectItems.all();
  }

  addItem(title: string) {
    const result = queryInsertItem.run(title);

    return {
      id: result.lastInsertRowid,
      title
    };
  }

  removeItem(id: number) {
    queryDeleteItem.run(id);
  }

  updateItem(id: number, title: string) {
    queryUpdateItem.run(title, id);

    return {
      id,
      title
    };
  }
}