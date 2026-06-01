import { TodoList } from "./core.ts";
import path from "path";

const todo = new TodoList();

const port = 3000;

const PUBLIC_DIR = path.resolve(
  import.meta.dir,
  "../public"
);

type BodyType = {
  title: string;
};

Bun.serve({
  port,

  async fetch(request) {
    const url = new URL(request.url);

    let pathname = url.pathname;

    const method = request.method;

    if (pathname === "/") {
      pathname = "/index.html";
    }
    else if (!pathname.includes(".")) {
      pathname += ".html";
    }

    const filePath = path.join(
      PUBLIC_DIR,
      pathname
    );

    const file = Bun.file(filePath);

    if (await file.exists()) {
      return new Response(file);
    }

    return new Response(
      "Página não encontrada",
      {
        status: 404,
      }
    );
  },
});

console.log(
  `Servidor rodando em http://localhost:${port}`
);