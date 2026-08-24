import { AprovaIFDatabase } from "./BD.ts";
import path from "node:path";

const db = new AprovaIFDatabase();

const port = 3000;

const PUBLIC_DIR = path.resolve(
    import.meta.dir,
    "../public"
);

/* =====================================================
   TIPOS DAS REQUISIÇÕES
===================================================== */

type CriarUsuarioBody = {
    nome: string;
    email: string;
    senha: string;
};

type LoginBody = {
    email: string;
    senha: string;
};

type AtualizarPerfilBody = {
    id: number;
    nome: string;
    foto?: string | null;
    compartilharEstatisticas?: boolean;
};

type CriarProvaBody = {
    titulo: string;
    ano?: number | null;
    tipo: string;
    criadorId?: number;
};

type CriarQuestaoBody = {
    materia: string;
    assunto?: string | null;
    texto: string;
    dificuldade?: number | null;
    tipo?: string;
    imagem?: string | null;
};

type CriarAlternativaBody = {
    letra: string;
    texto: string;
    correta: boolean;
    figura?: string | null;
};

type AdicionarQuestaoBody = {
    questaoId: number;
    ordem: number;
};

type RespostaBody = {
    questaoId: number;
    alternativaId: number | null;
};

type ResultadoBody = {
    usuarioId: number;
    provaId: number;
    nota?: number;
    acertos?: number;
    erros?: number;
    respostas?: RespostaBody[];
};

/* =====================================================
   FUNÇÕES AUXILIARES
===================================================== */

function numero(valor: string | null): number | null {
    if (valor === null) {
        return null;
    }

    const convertido = Number(valor);

    return Number.isFinite(convertido) ? convertido : null;
}

function respostaErro(mensagem: string, status = 400) {
    return Response.json(
        { erro: mensagem },
        { status }
    );
}

async function lerJson<T>(request: Request): Promise<T> {
    return await request.json() as T;
}

/* =====================================================
   SERVIDOR
===================================================== */

Bun.serve({
    port,

    async fetch(request) {
        const url = new URL(request.url);
        const pathname = url.pathname;
        const method = request.method;

        try {
            /* =================================================
               USUÁRIOS
            ================================================= */

            // POST /api/usuarios
            if (
                pathname === "/api/usuarios" &&
                method === "POST"
            ) {
                const body = await lerJson<CriarUsuarioBody>(request);

                if (!body.nome || !body.email || !body.senha) {
                    return respostaErro(
                        "Nome, email e senha são obrigatórios."
                    );
                }

                try {
                    const usuario = await db.criarUsuario(
                        body.nome,
                        body.email,
                        body.senha
                    );

                    return Response.json(usuario, {
                        status: 201
                    });
                } catch (error) {
                    if (
                        error instanceof Error &&
                        error.message === "EMAIL_JA_CADASTRADO"
                    ) {
                        return respostaErro(
                            "Este email já está cadastrado.",
                            409
                        );
                    }

                    throw error;
                }
            }

            // GET /api/usuarios?email=...
            if (
                pathname === "/api/usuarios" &&
                method === "GET"
            ) {
                const email = url.searchParams.get("email");

                if (!email) {
                    return respostaErro("Email não informado.");
                }

                const usuario = db.buscarUsuario(email);

                if (!usuario) {
                    return respostaErro(
                        "Usuário não encontrado.",
                        404
                    );
                }

                return Response.json(usuario);
            }

            // GET /api/usuarios/:id
            const usuarioMatch = pathname.match(
                /^\/api\/usuarios\/(\d+)$/
            );

            if (
                usuarioMatch &&
                method === "GET"
            ) {
                const id = Number(usuarioMatch[1]);
                const usuario = db.buscarUsuarioPorId(id);

                if (!usuario) {
                    return respostaErro(
                        "Usuário não encontrado.",
                        404
                    );
                }

                return Response.json(usuario);
            }

            // PUT /api/usuarios
            if (
                pathname === "/api/usuarios" &&
                method === "PUT"
            ) {
                const body = await lerJson<AtualizarPerfilBody>(request);

                if (!body.id || !body.nome) {
                    return respostaErro(
                        "ID e nome são obrigatórios."
                    );
                }

                const resultado = db.atualizarPerfil(
                    body.id,
                    body.nome,
                    body.foto ?? null,
                    body.compartilharEstatisticas
                );

                if (!resultado.alterado) {
                    return respostaErro(
                        "Usuário não encontrado.",
                        404
                    );
                }

                return Response.json(resultado);
            }

            // POST /api/login
            if (
                pathname === "/api/login" &&
                method === "POST"
            ) {
                const body = await lerJson<LoginBody>(request);

                if (!body.email || !body.senha) {
                    return respostaErro(
                        "Email e senha são obrigatórios."
                    );
                }

                const usuario = await db.validarLogin(
                    body.email,
                    body.senha
                );

                if (!usuario) {
                    return respostaErro(
                        "Email ou senha inválidos.",
                        401
                    );
                }

                return Response.json(usuario);
            }

            /* =================================================
               PROVAS
            ================================================= */

            // POST /api/provas
            if (
                pathname === "/api/provas" &&
                method === "POST"
            ) {
                const body = await lerJson<CriarProvaBody>(request);

                if (!body.titulo || !body.tipo) {
                    return respostaErro(
                        "Título e tipo são obrigatórios."
                    );
                }

                const prova = db.criarProva(
                    body.titulo,
                    body.ano ?? null,
                    body.tipo,
                    body.criadorId
                );

                return Response.json(prova, {
                    status: 201
                });
            }

            // GET /api/provas
            if (
                pathname === "/api/provas" &&
                method === "GET"
            ) {
                return Response.json(db.listarProvas());
            }

            // GET /api/provas/:id
            const provaMatch = pathname.match(
                /^\/api\/provas\/(\d+)$/
            );

            if (
                provaMatch &&
                method === "GET"
            ) {
                const id = Number(provaMatch[1]);
                const prova = db.buscarProva(id);

                if (!prova) {
                    return respostaErro(
                        "Prova não encontrada.",
                        404
                    );
                }

                return Response.json(prova);
            }

            /* =================================================
               QUESTÕES
            ================================================= */

            // POST /api/questoes
            if (
                pathname === "/api/questoes" &&
                method === "POST"
            ) {
                const body = await lerJson<CriarQuestaoBody>(request);

                if (!body.materia || !body.texto) {
                    return respostaErro(
                        "Matéria e texto são obrigatórios."
                    );
                }

                const questao = db.criarQuestao(
                    body.materia,
                    body.assunto ?? null,
                    body.texto,
                    body.dificuldade ?? null,
                    body.tipo ?? "multipla escolha",
                    body.imagem ?? null
                );

                return Response.json(questao, {
                    status: 201
                });
            }

            // POST /api/questoes/:id/alternativas
            const alternativaMatch = pathname.match(
                /^\/api\/questoes\/(\d+)\/alternativas$/
            );

            if (
                alternativaMatch &&
                method === "POST"
            ) {
                const questaoId = Number(alternativaMatch[1]);
                const body = await lerJson<CriarAlternativaBody>(request);

                if (!body.letra || !body.texto) {
                    return respostaErro(
                        "Letra e texto são obrigatórios."
                    );
                }

                const alternativa = db.criarAlternativa(
                    questaoId,
                    body.letra,
                    body.texto,
                    body.correta,
                    body.figura ?? null
                );

                return Response.json(alternativa, {
                    status: 201
                });
            }

            // POST /api/provas/:id/questoes
            const provaQuestaoMatch = pathname.match(
                /^\/api\/provas\/(\d+)\/questoes$/
            );

            if (
                provaQuestaoMatch &&
                method === "POST"
            ) {
                const provaId = Number(provaQuestaoMatch[1]);
                const body = await lerJson<AdicionarQuestaoBody>(request);

                if (!body.questaoId || !body.ordem) {
                    return respostaErro(
                        "questaoId e ordem são obrigatórios."
                    );
                }

                const resultado = db.adicionarQuestaoNaProva(
                    provaId,
                    body.questaoId,
                    body.ordem
                );

                return Response.json(resultado, {
                    status: 201
                });
            }

            // GET /api/provas/:id/questoes
            if (
                provaQuestaoMatch &&
                method === "GET"
            ) {
                const provaId = Number(provaQuestaoMatch[1]);

                return Response.json(
                    db.listarQuestoesDaProva(provaId)
                );
            }

            /* =================================================
               RESULTADOS
            ================================================= */

            // POST /api/resultados
            if (
                pathname === "/api/resultados" &&
                method === "POST"
            ) {
                const body = await lerJson<ResultadoBody>(request);

                if (!body.usuarioId || !body.provaId) {
                    return respostaErro(
                        "usuarioId e provaId são obrigatórios."
                    );
                }

                // Mantém compatibilidade com o formato atual do projeto.
                const resultado = db.salvarResultado(
                    body.usuarioId,
                    body.provaId,
                    body.nota ?? 0,
                    body.acertos ?? 0,
                    body.erros
                );

               let resultadoFinal: {
                    resultadoId: number;
                    nota: number;
                    acertos: number;
                    erros: number;
                };

                if (body.respostas) {
                    resultadoFinal = db.salvarRespostasDoResultado(
                        resultado.id,
                        body.respostas
                    );
                }

                return Response.json( {
                    status: 201
                });
            }

            // GET /api/resultados/:id
            const resultadoMatch = pathname.match(
                /^\/api\/resultados\/(\d+)$/
            );

            if (
                resultadoMatch &&
                method === "GET"
            ) {
                const id = Number(resultadoMatch[1]);
                const resultado = db.buscarResultado(id);

                if (!resultado) {
                    return respostaErro(
                        "Resultado não encontrado.",
                        404
                    );
                }

                return Response.json(resultado);
            }

            /* =================================================
               ESTATÍSTICAS
            ================================================= */

            // GET /api/estatisticas/:id
            const estatisticasMatch = pathname.match(
                /^\/api\/estatisticas\/(\d+)$/
            );

            if (
                estatisticasMatch &&
                method === "GET"
            ) {
                const usuarioId = Number(estatisticasMatch[1]);

                return Response.json(
                    db.estatisticasUsuario(usuarioId)
                );
            }

            // GET /api/usuarios/:id/estatisticas
            const usuarioEstatisticasMatch = pathname.match(
                /^\/api\/usuarios\/(\d+)\/estatisticas$/
            );

            if (
                usuarioEstatisticasMatch &&
                method === "GET"
            ) {
                const usuarioId = Number(
                    usuarioEstatisticasMatch[1]
                );

                return Response.json(
                    db.estatisticasUsuario(usuarioId)
                );
            }

            /* =================================================
               RANKING
            ================================================= */

            if (
                pathname === "/api/ranking" &&
                method === "GET"
            ) {
                return Response.json(db.ranking());
            }

            if (
                pathname === "/api/ranking/todos" &&
                method === "GET"
            ) {
                return Response.json(db.rankingTodos());
            }

            /* =================================================
               MELHORES DESEMPENHOS POR MATÉRIA
            ================================================= */

            if (
                pathname === "/api/materias" &&
                method === "GET"
            ) {
                return Response.json(
                    db.melhoresNotasMateria()
                );
            }

            /* =================================================
               HISTÓRICO DO USUÁRIO
            ================================================= */

            const historicoMatch = pathname.match(
                /^\/api\/usuarios\/(\d+)\/historico$/
            );

            if (
                historicoMatch &&
                method === "GET"
            ) {
                const usuarioId = Number(historicoMatch[1]);

                return Response.json(
                    db.historicoUsuario(usuarioId)
                );
            }

            /* =================================================
               ARQUIVOS ESTÁTICOS
            ================================================= */

            let arquivoPath = pathname;

            if (arquivoPath === "/") {
                arquivoPath = "/index.html";
            }
            else if (!arquivoPath.includes(".")) {
                arquivoPath += ".html";
            }

            const filePath = path.join(
                PUBLIC_DIR,
                arquivoPath
            );

            const file = Bun.file(filePath);

            if (await file.exists()) {
                return new Response(file);
            }

            return new Response(
                "Página não encontrada",
                { status: 404 }
            );
        }
        catch (error) {
            console.error(error);

            return respostaErro(
                "Erro interno do servidor.",
                500
            );
        }
    }
});

console.log(
    `Servidor rodando em http://localhost:${port}`
);