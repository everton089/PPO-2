import { AprovaIFDatabase } from "./BD.ts";
import path from "path";

const db = new AprovaIFDatabase();

const port = 3000;

const PUBLIC_DIR = path.resolve(
    import.meta.dir,
    "../public"
);

/*=========================
    TIPOS DAS REQUISIÇÕES
=========================*/

type CriarUsuarioBody = {
    nome: string;
    email: string;
    senha: string;
};

type AtualizarPerfilBody = {
    id: number;
    nome: string;
    foto: string;
};

type CriarProvaBody = {
    titulo: string;
    ano: number;
    tipo: string;
    criadorId?: number;
};

type ResultadoBody = {
    usuarioId: number;
    provaId: number;
    nota: number;
    acertos: number;
};

Bun.serve({
    port,

    async fetch(request) {

        const url = new URL(request.url);
        let pathname = url.pathname;
        const method = request.method;

        /*=========================
            USUÁRIOS
        =========================*/

        if (pathname === "/api/usuarios" && method === "POST") {

            const body = await request.json() as CriarUsuarioBody;

            const usuario = db.criarUsuario(
                body.nome,
                body.email,
                body.senha
            );

            return Response.json(usuario, {
                status: 201
            });
        }

        if (pathname === "/api/usuarios" && method === "GET") {

            const email = url.searchParams.get("email");

            if (!email) {
                return Response.json(
                    {
                        erro: "Email não informado."
                    },
                    {
                        status: 400
                    }
                );
            }

            const usuario = db.buscarUsuario(email);

            return Response.json(usuario);
        }

        if (pathname === "/api/usuarios" && method === "PUT") {

            const body = await request.json() as AtualizarPerfilBody;

            db.atualizarPerfil(
                body.id,
                body.nome,
                body.foto
            );

            return Response.json({
                mensagem: "Perfil atualizado com sucesso."
            });
        }

        /*=========================
            PROVAS
        =========================*/

        if (pathname === "/api/provas" && method === "POST") {

            const body = await request.json() as CriarProvaBody;

            const prova = db.criarProva(
                body.titulo,
                body.ano,
                body.tipo,
                body.criadorId
            );

            return Response.json(prova, {
                status: 201
            });
        }

        if (pathname === "/api/provas" && method === "GET") {

            const provas = db.listarProvas();

            return Response.json(provas);
        }

        /*=========================
            RESULTADOS
        =========================*/

        if (pathname === "/api/resultados" && method === "POST") {

            const body = await request.json() as ResultadoBody;

            db.salvarResultado(
                body.usuarioId,
                body.provaId,
                body.nota,
                body.acertos
            );

            return Response.json({
                mensagem: "Resultado salvo com sucesso."
            });
        }

        /*=========================
            RANKING
        =========================*/

        if (pathname === "/api/ranking" && method === "GET") {

            const ranking = db.ranking();

            return Response.json(ranking);
        }

        /*=========================
            MELHORES MATÉRIAS
        =========================*/

        if (pathname === "/api/materias" && method === "GET") {

            const materias = db.melhoresNotasMateria();

            return Response.json(materias);
        }

        /*=========================
            ARQUIVOS ESTÁTICOS
        =========================*/

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
                status: 404
            }
        );
    }
});

console.log(
    `Servidor rodando em http://localhost:${port}`
);