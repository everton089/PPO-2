import { AprovaIFDatabase } from "./BD.ts";
import path from "node:path";
import { mkdir } from "node:fs/promises";

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
    curso?: string | null;
    campus?: string | null;
    adminEmail?: string;
    adminSenha?: string;
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

type SimuladoPersonalizadoBody = {
    materias?: string[];
    quantidade?: number;
    dificuldade?: number | null;
    criadorId?: number;
    curso?: string | null;
    campus?: string | null;
};

type ResultadoVisitanteBody = {
    visitanteId: string;
    provaId: number;
    respostas: RespostaBody[];
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

                if (
                    typeof body.nome !== "string" ||
                    typeof body.email !== "string" ||
                    typeof body.senha !== "string" ||
                    !body.nome.trim() ||
                    !body.email.trim() ||
                    !body.senha
                ) {
                    return respostaErro("Nome, email e senha são obrigatórios.");
                }

                const nome = body.nome.trim();
                const email = body.email.trim().toLowerCase();
                if (nome.length < 2 || nome.length > 100) {
                    return respostaErro("O nome deve ter entre 2 e 100 caracteres.");
                }
                if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    return respostaErro("Informe um e-mail válido.");
                }
                if (body.senha.length < 8) {
                    return respostaErro("A senha deve ter pelo menos 8 caracteres.");
                }

                try {
                    const usuario = await db.criarUsuario(
                        nome,
                        email,
                        body.senha
                    );

                    return Response.json(usuario, {
                        status: 201
                    });
                } catch (error) {
                    if (
                        error instanceof Error &&
                        (error.message === "EMAIL_JA_CADASTRADO" ||
                         error.message.includes("UNIQUE constraint failed: usuarios.email"))
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

                if (
                    typeof body.email !== "string" ||
                    typeof body.senha !== "string" ||
                    !body.email.trim() ||
                    !body.senha
                ) {
                    return respostaErro("Email e senha são obrigatórios.");
                }

                const usuario = await db.validarLogin(
                    body.email.trim().toLowerCase(),
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

                if (typeof body.titulo !== "string" || !body.titulo.trim() || !body.tipo) {
                    return respostaErro("Título e tipo são obrigatórios.");
                }

                const tipo = body.tipo.trim().toLowerCase();
                if (tipo !== "oficial" && tipo !== "personalizada") {
                    return respostaErro("O tipo deve ser 'oficial' ou 'personalizada'.");
                }

                // Provas oficiais exigem autenticação de administrador no servidor.
                // Configure ADMIN_EMAIL no ambiente e use a senha da conta correspondente.
                if (tipo === "oficial") {
                    const emailAdminConfigurado = process.env.ADMIN_EMAIL?.trim().toLowerCase();
                    const emailInformado = body.adminEmail?.trim().toLowerCase();
                    if (!emailAdminConfigurado) {
                        return respostaErro("O administrador ainda não foi configurado. Defina ADMIN_EMAIL no arquivo .env.", 503);
                    }
                    if (!emailInformado || emailInformado !== emailAdminConfigurado || !body.adminSenha) {
                        return respostaErro("Apenas o administrador pode cadastrar provas oficiais.", 403);
                    }
                    const adminValido = await db.validarLogin(emailInformado, body.adminSenha);
                    if (!adminValido) {
                        return respostaErro("Credenciais do administrador inválidas.", 403);
                    }
                }

                const prova = db.criarProva(
                    body.titulo.trim(),
                    body.ano ?? null,
                    tipo,
                    body.criadorId,
                    body.curso ?? null,
                    body.campus ?? null
                );

                return Response.json(prova, {
                    status: 201
                });
            }

            // Filtros disponíveis para a tela pública de provas.
            if (pathname === "/api/provas/filtros" && method === "GET") {
                return Response.json(db.filtrosProvas());
            }

            // Gerar simulado a partir do banco de questões existente.
            if (pathname === "/api/simulados/personalizados" && method === "POST") {
                const body = await lerJson<SimuladoPersonalizadoBody>(request);
                const materias = Array.isArray(body.materias)
                    ? body.materias.filter((item) => typeof item === "string").slice(0, 20)
                    : [];
                const quantidade = Number(body.quantidade ?? 10);
                const dificuldade = body.dificuldade === null || body.dificuldade === undefined
                    ? null : Number(body.dificuldade);
                if (!Number.isFinite(quantidade) || quantidade < 1 || quantidade > 40) {
                    return respostaErro("A quantidade deve ficar entre 1 e 40 questões.");
                }
                if (dificuldade !== null && ![1, 2, 3].includes(dificuldade)) {
                    return respostaErro("Selecione uma dificuldade válida.");
                }
                try {
                    const prova = db.gerarSimuladoPersonalizado(materias, quantidade, dificuldade, body.criadorId, body.curso, body.campus);
                    return Response.json(prova, { status: 201 });
                } catch (error) {
                    if (error instanceof Error && error.message === "SEM_QUESTOES_PARA_SIMULADO") {
                        return respostaErro("Ainda não há questões suficientes para esses filtros. Tente outra matéria ou dificuldade.", 422);
                    }
                    throw error;
                }
            }

            // GET /api/provas?tipo=&ano=&curso=&campus=
            if (pathname === "/api/provas" && method === "GET") {
                const anoTexto = url.searchParams.get("ano");
                const ano = anoTexto && Number.isFinite(Number(anoTexto)) ? Number(anoTexto) : null;
                return Response.json(db.listarProvas({
                    tipo: url.searchParams.get("tipo"),
                    ano,
                    curso: url.searchParams.get("curso"),
                    campus: url.searchParams.get("campus")
                }));
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
               IMAGENS DE QUESTÕES
            ================================================= */

            // POST /api/imagens-questao — upload de imagem de enunciado.
            if (pathname === "/api/imagens-questao" && method === "POST") {
                const contentLength = Number(request.headers.get("content-length") || 0);
                if (contentLength > 5 * 1024 * 1024 + 1024 * 1024) {
                    return respostaErro("A imagem deve ter no máximo 5 MB.", 413);
                }

                const formData = await request.formData();
                const arquivo = formData.get("imagem");
                if (!(arquivo instanceof File)) {
                    return respostaErro("Selecione uma imagem para enviar.");
                }
                if (arquivo.size < 1 || arquivo.size > 5 * 1024 * 1024) {
                    return respostaErro("A imagem deve ter entre 1 byte e 5 MB.", 413);
                }

                const extensoesPermitidas: Record<string, string> = {
                    "image/jpeg": ".jpg",
                    "image/png": ".png",
                    "image/webp": ".webp",
                    "image/gif": ".gif"
                };
                const extensao = extensoesPermitidas[arquivo.type];
                if (!extensao) {
                    return respostaErro("Formato não permitido. Use PNG, JPG, WEBP ou GIF.");
                }

                const diretorioImagens = path.join(PUBLIC_DIR, "assets", "images", "questions");
                await mkdir(diretorioImagens, { recursive: true });
                const nomeArquivo = `${crypto.randomUUID()}${extensao}`;
                await Bun.write(path.join(diretorioImagens, nomeArquivo), arquivo);
                return Response.json({ url: `/assets/images/questions/${nomeArquivo}` }, { status: 201 });
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

                if (body.imagem != null && (typeof body.imagem !== "string" || body.imagem.length > 500 || !body.imagem.startsWith("/assets/images/questions/"))) {
                    return respostaErro("O endereço da imagem da questão é inválido.");
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

                return Response.json({
                    resultadoId: resultado.id,
                    ...(body.respostas ? resultadoFinal! : {
                        nota: body.nota ?? 0,
                        acertos: body.acertos ?? 0,
                        erros: body.erros ?? 0
                    })
                }, { status: 201 });
            }

            // Salvar resultados de visitantes sem exigir cadastro.
            if (pathname === "/api/resultados-visitantes" && method === "POST") {
                const body = await lerJson<ResultadoVisitanteBody>(request);
                if (typeof body.visitanteId !== "string" || !/^[a-zA-Z0-9-]{16,80}$/.test(body.visitanteId)) {
                    return respostaErro("Identificador de visitante inválido.");
                }
                if (!Number.isInteger(body.provaId) || body.provaId < 1 || !Array.isArray(body.respostas)) {
                    return respostaErro("Prova e respostas são obrigatórias.");
                }
                const resultado = db.salvarResultadoVisitante(body.visitanteId, body.provaId, body.respostas);
                return Response.json(resultado, { status: 201 });
            }

            if (pathname === "/api/historico-visitante" && method === "GET") {
                const visitanteId = url.searchParams.get("visitanteId") || "";
                if (!/^[a-zA-Z0-9-]{16,80}$/.test(visitanteId)) {
                    return respostaErro("Identificador de visitante inválido.");
                }
                return Response.json(db.historicoVisitante(visitanteId));
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