import { Database } from "bun:sqlite";
import path from "node:path";

const DATABASE_PATH = path.resolve(import.meta.dir, "../../database.sqlite");

export const db = new Database(DATABASE_PATH);

db.run("PRAGMA foreign_keys = ON");

/* =====================================================
   MODELO FÍSICO
===================================================== */

// USUÁRIOS

db.run(`
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    senha TEXT NOT NULL,
    compartilhar_estatisticas INTEGER NOT NULL DEFAULT 0
        CHECK (compartilhar_estatisticas IN (0, 1)),
    foto_perfil TEXT,
    data_criacao TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)
`);

// TIPOS DE PROVA

db.run(`
CREATE TABLE IF NOT EXISTS tipo_prova (
    id_tipo_prova INTEGER PRIMARY KEY AUTOINCREMENT,
    descricao TEXT NOT NULL UNIQUE
)
`);

// TIPOS DE QUESTÃO

db.run(`
CREATE TABLE IF NOT EXISTS tipo_questao (
    id_tipo_questao INTEGER PRIMARY KEY AUTOINCREMENT,
    descricao TEXT NOT NULL UNIQUE
)
`);

// PROVAS

db.run(`
CREATE TABLE IF NOT EXISTS provas (
    id_prova INTEGER PRIMARY KEY AUTOINCREMENT,
    id_tipo_prova INTEGER NOT NULL,
    id_criador INTEGER,
    titulo TEXT NOT NULL,
    ano INTEGER,
    data_criacao TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_tipo_prova)
        REFERENCES tipo_prova(id_tipo_prova),

    FOREIGN KEY (id_criador)
        REFERENCES usuarios(id_usuario)
        ON DELETE SET NULL
)
`);

// QUESTÕES

db.run(`
CREATE TABLE IF NOT EXISTS questoes (
    id_questao INTEGER PRIMARY KEY AUTOINCREMENT,
    id_tipo_questao INTEGER NOT NULL,
    materia TEXT NOT NULL,
    assunto TEXT,
    texto TEXT NOT NULL,
    imagem TEXT,
    dificuldade INTEGER
        CHECK (dificuldade IS NULL OR dificuldade BETWEEN 1 AND 3),

    FOREIGN KEY (id_tipo_questao)
        REFERENCES tipo_questao(id_tipo_questao)
)
`);

// ALTERNATIVAS

db.run(`
CREATE TABLE IF NOT EXISTS alternativas (
    id_alternativa INTEGER PRIMARY KEY AUTOINCREMENT,
    id_questao INTEGER NOT NULL,
    letra TEXT NOT NULL,
    texto TEXT NOT NULL,
    correta INTEGER NOT NULL DEFAULT 0
        CHECK (correta IN (0, 1)),
    figura TEXT,

    FOREIGN KEY (id_questao)
        REFERENCES questoes(id_questao)
        ON DELETE CASCADE,

    UNIQUE (id_questao, letra)
)
`);

// RELAÇÃO PROVA <-> QUESTÃO

db.run(`
CREATE TABLE IF NOT EXISTS prova_questao (
    id_prova INTEGER NOT NULL,
    id_questao INTEGER NOT NULL,
    ordem INTEGER NOT NULL,

    PRIMARY KEY (id_prova, id_questao),

    FOREIGN KEY (id_prova)
        REFERENCES provas(id_prova)
        ON DELETE CASCADE,

    FOREIGN KEY (id_questao)
        REFERENCES questoes(id_questao)
        ON DELETE CASCADE,

    UNIQUE (id_prova, ordem)
)
`);

// RESULTADO DE UMA PROVA FEITA POR UM USUÁRIO

db.run(`
CREATE TABLE IF NOT EXISTS resultados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    prova_id INTEGER NOT NULL,
    nota REAL NOT NULL DEFAULT 0,
    acertos INTEGER NOT NULL DEFAULT 0,
    erros INTEGER NOT NULL DEFAULT 0,
    data_realizacao TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id_usuario),

    FOREIGN KEY (prova_id)
        REFERENCES provas(id_prova)
)
`);

// RESPOSTAS INDIVIDUAIS

db.run(`
CREATE TABLE IF NOT EXISTS respostas_usuario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resultado_id INTEGER NOT NULL,
    questao_id INTEGER NOT NULL,
    alternativa_escolhida INTEGER,
    acertou INTEGER NOT NULL
        CHECK (acertou IN (0, 1)),

    FOREIGN KEY (resultado_id)
        REFERENCES resultados(id)
        ON DELETE CASCADE,

    FOREIGN KEY (questao_id)
        REFERENCES questoes(id_questao),

    FOREIGN KEY (alternativa_escolhida)
        REFERENCES alternativas(id_alternativa),

    UNIQUE (resultado_id, questao_id)
)
`);

// USUÁRIO <-> PROVA

db.run(`
CREATE TABLE IF NOT EXISTS relacao (
    id_prova INTEGER NOT NULL,
    id_usuario INTEGER NOT NULL,

    PRIMARY KEY (id_prova, id_usuario),

    FOREIGN KEY (id_prova)
        REFERENCES provas(id_prova)
        ON DELETE CASCADE,

    FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE
)
`);

/* =====================================================
   DADOS INICIAIS
===================================================== */

db.run(`
INSERT OR IGNORE INTO tipo_prova (descricao)
VALUES ('oficial')
`);

db.run(`
INSERT OR IGNORE INTO tipo_prova (descricao)
VALUES ('personalizada')
`);

db.run(`
INSERT OR IGNORE INTO tipo_questao (descricao)
VALUES ('multipla escolha')
`);

/* =====================================================
   USUÁRIOS
===================================================== */

const queryCriarUsuario = db.prepare(`
INSERT INTO usuarios (
    nome,
    email,
    senha
)
VALUES (?, ?, ?)
`);

const queryBuscarUsuario = db.prepare(`
SELECT
    id_usuario AS id,
    nome,
    email,
    foto_perfil,
    compartilhar_estatisticas,
    data_criacao
FROM usuarios
WHERE email = ?
`);

const queryBuscarUsuarioLogin = db.prepare(`
SELECT
    id_usuario AS id,
    nome,
    email,
    senha
FROM usuarios
WHERE email = ?
`);

const queryBuscarUsuarioId = db.prepare(`
SELECT
    id_usuario AS id,
    nome,
    email,
    foto_perfil,
    compartilhar_estatisticas,
    data_criacao
FROM usuarios
WHERE id_usuario = ?
`);

const queryAtualizarPerfil = db.prepare(`
UPDATE usuarios
SET
    nome = ?,
    foto_perfil = ?,
    compartilhar_estatisticas = ?
WHERE id_usuario = ?
`);

/* =====================================================
   PROVAS
===================================================== */

const queryBuscarTipoProva = db.prepare(`
SELECT id_tipo_prova
FROM tipo_prova
WHERE LOWER(descricao) = LOWER(?)
`);

const queryCriarTipoProva = db.prepare(`
INSERT INTO tipo_prova (descricao)
VALUES (?)
`);

const queryCriarProva = db.prepare(`
INSERT INTO provas (
    id_tipo_prova,
    id_criador,
    titulo,
    ano
)
VALUES (?, ?, ?, ?)
`);

const queryListarProvas = db.prepare(`
SELECT
    p.id_prova AS id,
    p.titulo,
    p.ano,
    tp.descricao AS tipo,
    p.id_criador AS criador_id,
    p.data_criacao,
    COUNT(pq.id_questao) AS quantidade_questoes
FROM provas p
INNER JOIN tipo_prova tp
    ON tp.id_tipo_prova = p.id_tipo_prova
LEFT JOIN prova_questao pq
    ON pq.id_prova = p.id_prova
GROUP BY p.id_prova
ORDER BY p.ano DESC, p.id_prova DESC
`);

const queryBuscarProva = db.prepare(`
SELECT
    p.id_prova AS id,
    p.titulo,
    p.ano,
    tp.descricao AS tipo,
    p.id_criador AS criador_id,
    p.data_criacao,
    COUNT(pq.id_questao) AS quantidade_questoes
FROM provas p
INNER JOIN tipo_prova tp
    ON tp.id_tipo_prova = p.id_tipo_prova
LEFT JOIN prova_questao pq
    ON pq.id_prova = p.id_prova
WHERE p.id_prova = ?
GROUP BY p.id_prova
`);

const queryCriarRelacao = db.prepare(`
INSERT OR IGNORE INTO relacao (id_prova, id_usuario)
VALUES (?, ?)
`);

/* =====================================================
   QUESTÕES
===================================================== */

const queryBuscarTipoQuestao = db.prepare(`
SELECT id_tipo_questao
FROM tipo_questao
WHERE LOWER(descricao) = LOWER(?)
`);

const queryCriarQuestao = db.prepare(`
INSERT INTO questoes (
    id_tipo_questao,
    materia,
    assunto,
    texto,
    imagem,
    dificuldade
)
VALUES (?, ?, ?, ?, ?, ?)
`);

const queryCriarAlternativa = db.prepare(`
INSERT INTO alternativas (
    id_questao,
    letra,
    texto,
    correta,
    figura
)
VALUES (?, ?, ?, ?, ?)
`);

const queryAdicionarQuestaoProva = db.prepare(`
INSERT INTO prova_questao (
    id_prova,
    id_questao,
    ordem
)
VALUES (?, ?, ?)
`);

const queryListarQuestoesProva = db.prepare(`
SELECT
    q.id_questao AS id,
    q.materia,
    q.assunto,
    q.texto,
    q.imagem,
    q.dificuldade,
    pq.ordem,
    tq.descricao AS tipo_questao
FROM prova_questao pq
INNER JOIN questoes q
    ON q.id_questao = pq.id_questao
INNER JOIN tipo_questao tq
    ON tq.id_tipo_questao = q.id_tipo_questao
WHERE pq.id_prova = ?
ORDER BY pq.ordem ASC
`);

const queryListarAlternativas = db.prepare(`
SELECT
    id_alternativa AS id,
    id_questao,
    letra,
    texto,
    figura
FROM alternativas
WHERE id_questao = ?
ORDER BY letra ASC
`);

/* =====================================================
   RESULTADOS
===================================================== */

const querySalvarResultado = db.prepare(`
INSERT INTO resultados (
    usuario_id,
    prova_id,
    nota,
    acertos,
    erros
)
VALUES (?, ?, ?, ?, ?)
`);

const querySalvarResposta = db.prepare(`
INSERT INTO respostas_usuario (
    resultado_id,
    questao_id,
    alternativa_escolhida,
    acertou
)
VALUES (?, ?, ?, ?)
`);

const queryAlternativaCorreta = db.prepare(`
SELECT correta
FROM alternativas
WHERE id_alternativa = ?
`);

const queryAtualizarResultado = db.prepare(`
UPDATE resultados
SET nota = ?, acertos = ?, erros = ?
WHERE id = ?
`);

const queryBuscarResultado = db.prepare(`
SELECT
    r.id,
    r.usuario_id,
    u.nome AS usuario,
    r.prova_id,
    p.titulo AS prova,
    r.nota,
    r.acertos,
    r.erros,
    r.data_realizacao
FROM resultados r
INNER JOIN usuarios u
    ON u.id_usuario = r.usuario_id
INNER JOIN provas p
    ON p.id_prova = r.prova_id
WHERE r.id = ?
`);

const queryHistoricoUsuario = db.prepare(`
SELECT
    r.id,
    p.titulo AS prova,
    r.nota,
    r.acertos,
    r.erros,
    r.data_realizacao
FROM resultados r
INNER JOIN provas p
    ON p.id_prova = r.prova_id
WHERE r.usuario_id = ?
ORDER BY r.data_realizacao DESC
`);

/* =====================================================
   RANKING
===================================================== */

const queryRanking = db.prepare(`
SELECT
    u.id_usuario AS id,
    u.nome,
    ROUND(AVG(r.nota), 2) AS media,
    COUNT(r.id) AS simulados
FROM usuarios u
INNER JOIN resultados r
    ON r.usuario_id = u.id_usuario
WHERE u.compartilhar_estatisticas = 1
GROUP BY u.id_usuario
ORDER BY media DESC, simulados DESC, u.nome ASC
`);

const queryRankingTodos = db.prepare(`
SELECT
    u.id_usuario AS id,
    u.nome,
    ROUND(AVG(r.nota), 2) AS media,
    COUNT(r.id) AS simulados
FROM usuarios u
INNER JOIN resultados r
    ON r.usuario_id = u.id_usuario
GROUP BY u.id_usuario
ORDER BY media DESC, simulados DESC, u.nome ASC
`);

/* =====================================================
   ESTATÍSTICAS POR MATÉRIA
===================================================== */

const queryDesempenhoPorMateria = db.prepare(`
SELECT
    q.materia,
    SUM(ru.acertou) AS acertos,
    COUNT(ru.id) AS total,
    ROUND(
        (SUM(ru.acertou) * 100.0) / NULLIF(COUNT(ru.id), 0),
        2
    ) AS percentual
FROM respostas_usuario ru
INNER JOIN questoes q
    ON q.id_questao = ru.questao_id
INNER JOIN resultados r
    ON r.id = ru.resultado_id
WHERE r.usuario_id = ?
GROUP BY q.materia
ORDER BY percentual DESC
`);

const queryMelhoresNotasMateria = db.prepare(`
WITH desempenho AS (
    SELECT
        u.id_usuario AS usuario_id,
        u.nome,
        q.materia,
        SUM(ru.acertou) AS acertos,
        COUNT(ru.id) AS total,
        ROUND(
            (SUM(ru.acertou) * 100.0) / NULLIF(COUNT(ru.id), 0),
            2
        ) AS percentual
    FROM usuarios u
    INNER JOIN resultados r
        ON r.usuario_id = u.id_usuario
    INNER JOIN respostas_usuario ru
        ON ru.resultado_id = r.id
    INNER JOIN questoes q
        ON q.id_questao = ru.questao_id
    WHERE u.compartilhar_estatisticas = 1
    GROUP BY u.id_usuario, q.materia
)
SELECT *
FROM desempenho
ORDER BY materia ASC, percentual DESC, acertos DESC
`);

const queryEvolucaoUsuario = db.prepare(`
SELECT
    r.id,
    p.titulo AS prova,
    r.nota,
    r.data_realizacao
FROM resultados r
INNER JOIN provas p
    ON p.id_prova = r.prova_id
WHERE r.usuario_id = ?
ORDER BY r.data_realizacao ASC, r.id ASC
`);

const queryEstatisticasGeraisUsuario = db.prepare(`
SELECT
    COUNT(r.id) AS simulados_realizados,
    ROUND(COALESCE(AVG(r.nota), 0), 2) AS media_geral,
    COALESCE(SUM(r.acertos + r.erros), 0) AS questoes_respondidas,
    COALESCE(SUM(r.acertos), 0) AS acertos,
    COALESCE(SUM(r.erros), 0) AS erros
FROM resultados r
WHERE r.usuario_id = ?
`);

const queryPosicaoRanking = db.prepare(`
WITH ranking AS (
    SELECT
        u.id_usuario,
        AVG(r.nota) AS media
    FROM usuarios u
    INNER JOIN resultados r
        ON r.usuario_id = u.id_usuario
    WHERE u.compartilhar_estatisticas = 1
    GROUP BY u.id_usuario
),
posicoes AS (
    SELECT
        id_usuario,
        RANK() OVER (ORDER BY media DESC) AS posicao
    FROM ranking
)
SELECT posicao
FROM posicoes
WHERE id_usuario = ?
`);

/* =====================================================
   CLASSE
===================================================== */

export class AprovaIFDatabase {

    async criarUsuario(nome: string, email: string, senha: string) {
        const emailNormalizado = email.trim().toLowerCase();
        const nomeNormalizado = nome.trim();

        if (!nomeNormalizado || !emailNormalizado || !senha) {
            throw new Error("Nome, email e senha são obrigatórios.");
        }

        const usuarioExistente = queryBuscarUsuarioLogin.get(emailNormalizado);

        if (usuarioExistente) {
            throw new Error("EMAIL_JA_CADASTRADO");
        }

        const senhaHash = await Bun.password.hash(senha);

        const result = queryCriarUsuario.run(
            nomeNormalizado,
            emailNormalizado,
            senhaHash
        );

        return {
            id: Number(result.lastInsertRowid),
            nome: nomeNormalizado,
            email: emailNormalizado
        };
    }

    buscarUsuario(email: string) {
        return queryBuscarUsuario.get(email.trim().toLowerCase());
    }

    buscarUsuarioPorId(id: number) {
        return queryBuscarUsuarioId.get(id);
    }

    async validarLogin(email: string, senha: string) {
        const usuario = queryBuscarUsuarioLogin.get(
            email.trim().toLowerCase()
        ) as { id: number; nome: string; email: string; senha: string } | null;

        if (!usuario) {
            return null;
        }

        const senhaValida = await Bun.password.verify(
            senha,
            usuario.senha
        );

        if (!senhaValida) {
            return null;
        }

        return {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email
        };
    }

    atualizarPerfil(
        id: number,
        nome: string,
        foto: string | null,
        compartilharEstatisticas?: boolean
    ) {
        const atual = queryBuscarUsuarioId.get(id) as
            | { compartilhar_estatisticas: number }
            | null;

        const compartilhar = compartilharEstatisticas === undefined
            ? atual?.compartilhar_estatisticas ?? 0
            : compartilharEstatisticas ? 1 : 0;

        const result = queryAtualizarPerfil.run(
            nome.trim(),
            foto,
            compartilhar,
            id
        );

        return {
            alterado: result.changes > 0,
            usuario: this.buscarUsuarioPorId(id)
        };
    }

    /* ---------- PROVAS ---------- */

    private obterOuCriarTipoProva(tipo: string) {
        const nome = tipo.trim().toLowerCase();

        const existente = queryBuscarTipoProva.get(nome) as
            | { id_tipo_prova: number }
            | null;

        if (existente) {
            return existente.id_tipo_prova;
        }

        const result = queryCriarTipoProva.run(nome);
        return Number(result.lastInsertRowid);
    }

    criarProva(
        titulo: string,
        ano: number | null,
        tipo: string,
        criadorId?: number
    ) {
        const tipoId = this.obterOuCriarTipoProva(tipo);

        const result = queryCriarProva.run(
            tipoId,
            criadorId ?? null,
            titulo.trim(),
            ano ?? null
        );

        const id = Number(result.lastInsertRowid);

        if (criadorId !== undefined) {
            queryCriarRelacao.run(id, criadorId);
        }

        return queryBuscarProva.get(id);
    }

    listarProvas() {
        return queryListarProvas.all();
    }

    buscarProva(id: number) {
        return queryBuscarProva.get(id);
    }

    /* ---------- QUESTÕES ---------- */

    private obterTipoQuestao(tipo: string = "multipla escolha") {
        const existente = queryBuscarTipoQuestao.get(tipo.trim()) as
            | { id_tipo_questao: number }
            | null;

        if (!existente) {
            throw new Error("TIPO_QUESTAO_NAO_ENCONTRADO");
        }

        return existente.id_tipo_questao;
    }

    criarQuestao(
        materia: string,
        assunto: string | null,
        texto: string,
        dificuldade: number | null,
        tipo: string = "multipla escolha",
        imagem: string | null = null
    ) {
        const tipoId = this.obterTipoQuestao(tipo);

        const result = queryCriarQuestao.run(
            tipoId,
            materia.trim(),
            assunto?.trim() ?? null,
            texto.trim(),
            imagem,
            dificuldade
        );

        return {
            id: Number(result.lastInsertRowid)
        };
    }

    criarAlternativa(
        questaoId: number,
        letra: string,
        texto: string,
        correta: boolean,
        figura: string | null = null
    ) {
        const result = queryCriarAlternativa.run(
            questaoId,
            letra.trim().toUpperCase(),
            texto.trim(),
            correta ? 1 : 0,
            figura
        );

        return {
            id: Number(result.lastInsertRowid)
        };
    }

    adicionarQuestaoNaProva(
        provaId: number,
        questaoId: number,
        ordem: number
    ) {
        queryAdicionarQuestaoProva.run(
            provaId,
            questaoId,
            ordem
        );

        return {
            provaId,
            questaoId,
            ordem
        };
    }

    listarQuestoesDaProva(provaId: number) {
        const questoes = queryListarQuestoesProva.all(provaId) as Array<{
            id: number;
            materia: string;
            assunto: string | null;
            texto: string;
            imagem: string | null;
            dificuldade: number | null;
            ordem: number;
            tipo_questao: string;
        }>;

        return questoes.map((questao) => ({
            ...questao,
            alternativas: queryListarAlternativas.all(questao.id)
        }));
    }

    /* ---------- RESULTADOS ---------- */

    salvarResultado(
        usuarioId: number,
        provaId: number,
        nota: number,
        acertos: number,
        erros?: number
    ) {
        let errosCalculados = erros;

        if (errosCalculados === undefined) {
            const prova = queryListarQuestoesProva.all(provaId) as unknown[];
            errosCalculados = Math.max(prova.length - acertos, 0);
        }

        const result = querySalvarResultado.run(
            usuarioId,
            provaId,
            nota,
            acertos,
            errosCalculados
        );

        return {
            id: Number(result.lastInsertRowid)
        };
    }

    salvarResposta(
        resultadoId: number,
        questaoId: number,
        alternativaEscolhida: number | null,
        acertou: boolean
    ) {
        querySalvarResposta.run(
            resultadoId,
            questaoId,
            alternativaEscolhida,
            acertou ? 1 : 0
        );

        return {
            resultadoId,
            questaoId,
            alternativaEscolhida,
            acertou
        };
    }

    salvarRespostasDoResultado(
        resultadoId: number,
        respostas: Array<{ questaoId: number; alternativaId: number | null }>
    ) {
        let acertos = 0;

        for (const resposta of respostas) {
            let acertou = false;

            if (resposta.alternativaId !== null) {
                const alternativa = queryAlternativaCorreta.get(
                    resposta.alternativaId
                ) as { correta: number } | null;

                acertou = alternativa?.correta === 1;
            }

            if (acertou) {
                acertos++;
            }

            querySalvarResposta.run(
                resultadoId,
                resposta.questaoId,
                resposta.alternativaId,
                acertou ? 1 : 0
            );
        }

        const erros = Math.max(respostas.length - acertos, 0);
        const nota = respostas.length > 0
            ? Number(((acertos / respostas.length) * 100).toFixed(2))
            : 0;

        queryAtualizarResultado.run(
            nota,
            acertos,
            erros,
            resultadoId
        );

        return {
            resultadoId,
            nota,
            acertos,
            erros
        };
    }

    buscarResultado(id: number) {
        return queryBuscarResultado.get(id);
    }

    historicoUsuario(usuarioId: number) {
        return queryHistoricoUsuario.all(usuarioId);
    }

    /* ---------- RANKING ---------- */

    ranking() {
        return queryRanking.all();
    }

    rankingTodos() {
        return queryRankingTodos.all();
    }

    melhoresNotasMateria() {
        return queryMelhoresNotasMateria.all();
    }

    /* ---------- ESTATÍSTICAS ---------- */

    estatisticasUsuario(usuarioId: number) {
        const gerais = queryEstatisticasGeraisUsuario.get(usuarioId);
        const posicao = queryPosicaoRanking.get(usuarioId) as
            | { posicao: number }
            | null;

        return {
            gerais,
            ranking: posicao?.posicao ?? null,
            evolucao: queryEvolucaoUsuario.all(usuarioId),
            materias: queryDesempenhoPorMateria.all(usuarioId),
            historico: queryHistoricoUsuario.all(usuarioId)
        };
    }
       
        async criarUsuarios(nome: string, email: string, senha: string) {
    const senhaHash = await Bun.password.hash(senha);

    return queryCriarUsuario.run(
        nome,
        email,
        senhaHash
    );
}
async autenticarUsuario(email: string, senha: string) {

    const usuario = queryBuscarUsuario.get(email) as {
        id_usuario: number;
        nome: string;
        email: string;
        senha: string;
    } | null;

    if (!usuario) {
        return null;
    }

    const senhaValida = await Bun.password.verify(
        senha,
        usuario.senha
    );

    if (!senhaValida) {
        return null;
    }

    return {
        id_usuario: usuario.id_usuario,
        nome: usuario.nome,
        email: usuario.email
    };
}
}