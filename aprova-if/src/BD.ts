import { Database } from "bun:sqlite";

const db = new Database("database.sqlite");

/* =========================
   USUÁRIOS
========================= */
db.run(`
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    foto_perfil TEXT,
    compartilhar_estatisticas BOOLEAN DEFAULT 0,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
)
`);

/* =========================
   PROVAS
========================= */
db.run(`
CREATE TABLE IF NOT EXISTS provas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    ano INTEGER,
    tipo TEXT NOT NULL, -- oficial ou personalizada
    criador_id INTEGER,
    FOREIGN KEY (criador_id) REFERENCES usuarios(id)
)
`);

/* =========================
   QUESTÕES
========================= */
db.run(`
CREATE TABLE IF NOT EXISTS questoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prova_id INTEGER NOT NULL,
    materia TEXT NOT NULL,
    enunciado TEXT NOT NULL,
    FOREIGN KEY (prova_id) REFERENCES provas(id)
)
`);

/* =========================
   ALTERNATIVAS
========================= */
db.run(`
CREATE TABLE IF NOT EXISTS alternativas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    questao_id INTEGER NOT NULL,
    texto TEXT NOT NULL,
    correta BOOLEAN DEFAULT 0,
    FOREIGN KEY (questao_id) REFERENCES questoes(id)
)
`);

/* =========================
   RESULTADOS
========================= */
db.run(`
CREATE TABLE IF NOT EXISTS resultados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    prova_id INTEGER NOT NULL,
    nota REAL NOT NULL,
    acertos INTEGER NOT NULL,
    data_realizacao DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (prova_id) REFERENCES provas(id)
)
`);

const queryCriarUsuario = db.prepare(`
INSERT INTO usuarios (
    nome,
    email,
    senha
) VALUES (?, ?, ?)
`);

const queryBuscarUsuario = db.prepare(`
SELECT * FROM usuarios
WHERE email = ?
`);

const queryAtualizarPerfil = db.prepare(`
UPDATE usuarios
SET nome = ?, foto_perfil = ?
WHERE id = ?
`);

const queryCriarProva = db.prepare(`
INSERT INTO provas (
    titulo,
    ano,
    tipo,
    criador_id
) VALUES (?, ?, ?, ?)
`);

const queryListarProvas = db.prepare(`
SELECT * FROM provas
`);

const querySalvarResultado = db.prepare(`
INSERT INTO resultados (
    usuario_id,
    prova_id,
    nota,
    acertos
) VALUES (?, ?, ?, ?)
`);

const queryRanking = db.prepare(`
SELECT
    usuarios.id,
    usuarios.nome,
    ROUND(AVG(resultados.nota), 2) as media
FROM resultados
INNER JOIN usuarios
ON usuarios.id = resultados.usuario_id
GROUP BY usuarios.id
ORDER BY media DESC
`);

const queryMelhoresNotasMateria = db.prepare(`
SELECT
    usuarios.nome,
    questoes.materia,
    COUNT(*) as acertos
FROM usuarios
INNER JOIN resultados
ON usuarios.id = resultados.usuario_id
INNER JOIN provas
ON provas.id = resultados.prova_id
INNER JOIN questoes
ON questoes.prova_id = provas.id
GROUP BY usuarios.id, questoes.materia
ORDER BY acertos DESC
`);

export class AprovaIFDatabase {

    criarUsuario(nome: string, email: string, senha: string) {
        return queryCriarUsuario.run(nome, email, senha);
    }

    buscarUsuario(email: string) {
        return queryBuscarUsuario.get(email);
    }

    atualizarPerfil(id: number, nome: string, foto: string) {
        return queryAtualizarPerfil.run(nome, foto, id);
    }

    criarProva(
        titulo: string,
        ano: number,
        tipo: string,
        criadorId?: number
    ) {
        return queryCriarProva.run(
            titulo,
            ano,
            tipo,
            criadorId ?? null
        );
    }

    listarProvas() {
        return queryListarProvas.all();
    }

    salvarResultado(
        usuarioId: number,
        provaId: number,
        nota: number,
        acertos: number
    ) {
        return querySalvarResultado.run(
            usuarioId,
            provaId,
            nota,
            acertos
        );
    }

    ranking() {
        return queryRanking.all();
    }

    melhoresNotasMateria() {
        return queryMelhoresNotasMateria.all();
    }
}