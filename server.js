const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./database");

const app = express();
const port = process.env.PORT || 3000;
const machineStatuses = ["Ativa", "Manutenção", "Inativa", "Descartada"];
const maintenanceStatuses = ["Pendente", "Em Andamento", "Concluida"];

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "frontend")));

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

function asyncRoute(handler) {
    return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function requireText(value, label, maxLength) {
    if (typeof value !== "string" || !value.trim()) {
        throw new HttpError(400, `${label} é obrigatório.`);
    }

    const text = value.trim();
    if (text.length > maxLength) {
        throw new HttpError(400, `${label} deve ter no máximo ${maxLength} caracteres.`);
    }
    return text;
}

function requireStatus(value, label, allowedValues) {
    if (!allowedValues.includes(value)) {
        throw new HttpError(400, `${label} inválido.`);
    }
    return value;
}

function requireMachineId(value) {
    const id = Number(value);
    if (!Number.isInteger(id) || id < 1) {
        throw new HttpError(400, "Selecione uma máquina válida.");
    }
    return id;
}

function optionalDate(value, label) {
    if (value === undefined || value === null || value === "") {
        return null;
    }
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?)?$/.test(value)) {
        throw new HttpError(400, `${label} inválida.`);
    }
    const normalized = value.replace("T", " ");
    const parsed = new Date(`${normalized.length === 16 ? `${normalized}:00` : normalized}Z`);
    if (Number.isNaN(parsed.getTime())) {
        throw new HttpError(400, `${label} inválida.`);
    }
    return normalized.length === 16 ? `${normalized}:00` : normalized;
}

function requireRecordId(value) {
    const id = Number(value);
    if (!Number.isInteger(id) || id < 1) {
        throw new HttpError(400, "Identificador inválido.");
    }
    return id;
}

function reportDatabaseError(error, res) {
    if (error instanceof HttpError) {
        return res.status(error.status).json({ erro: error.message });
    }

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
        return res.status(400).json({ erro: "A máquina selecionada não existe." });
    }
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
        return res.status(409).json({ erro: "Não é possível excluir uma máquina que possui manutenções." });
    }
    if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ erro: "Já existe um registro com esses dados." });
    }

    console.error("Erro na API:", error);
    return res.status(500).json({ erro: "Não foi possível concluir a operação." });
}

const handleApiError = (error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }
    return reportDatabaseError(error, res);
};

app.get("/api/health", (req, res) => {
    res.json({ mensagem: "API CMMS funcionando." });
});

app.get("/api/maquinas", asyncRoute(async (req, res) => {
    const [rows] = await db.query("SELECT * FROM maquinas ORDER BY id_maquina");
    res.json(rows);
}));

app.post("/api/maquinas", asyncRoute(async (req, res) => {
    const nome = requireText(req.body.nome_maquina, "Nome da máquina", 100);
    const setor = requireText(req.body.setor_maquina, "Setor", 100);
    const status = req.body.status_maquina === undefined
        ? "Ativa"
        : requireStatus(req.body.status_maquina, "Status da máquina", machineStatuses);

    const [result] = await db.execute(
        "INSERT INTO maquinas (nome_maquina, setor_maquina, status_maquina) VALUES (?, ?, ?)",
        [nome, setor, status]
    );
    const [rows] = await db.execute("SELECT * FROM maquinas WHERE id_maquina = ?", [result.insertId]);
    res.status(201).json(rows[0]);
}));

app.put("/api/maquinas/:id", asyncRoute(async (req, res) => {
    const id = requireRecordId(req.params.id);
    const nome = requireText(req.body.nome_maquina, "Nome da máquina", 100);
    const setor = requireText(req.body.setor_maquina, "Setor", 100);
    const status = requireStatus(req.body.status_maquina, "Status da máquina", machineStatuses);
    const [result] = await db.execute(
        "UPDATE maquinas SET nome_maquina = ?, setor_maquina = ?, status_maquina = ? WHERE id_maquina = ?",
        [nome, setor, status, id]
    );
    if (!result.affectedRows) {
        throw new HttpError(404, "Máquina não encontrada.");
    }
    const [rows] = await db.execute("SELECT * FROM maquinas WHERE id_maquina = ?", [id]);
    res.json(rows[0]);
}));

app.delete("/api/maquinas/:id", asyncRoute(async (req, res) => {
    const id = requireRecordId(req.params.id);
    const [result] = await db.execute("DELETE FROM maquinas WHERE id_maquina = ?", [id]);
    if (!result.affectedRows) {
        throw new HttpError(404, "Máquina não encontrada.");
    }
    res.status(204).end();
}));

const maintenanceQuery = `
    SELECT m.*, maquinas.nome_maquina AS maquina
    FROM manutencoes AS m
    INNER JOIN maquinas ON m.id_maquina = maquinas.id_maquina
`;

app.get("/api/manutencoes", asyncRoute(async (req, res) => {
    const [rows] = await db.query(`${maintenanceQuery} ORDER BY m.id_manutencao DESC`);
    res.json(rows);
}));

app.post("/api/manutencoes", asyncRoute(async (req, res) => {
    const machineId = requireMachineId(req.body.id_maquina);
    const description = req.body.descricao_manutencao === undefined
        ? null
        : requireText(req.body.descricao_manutencao, "Descrição", 65535);
    const status = req.body.status_manutencao === undefined
        ? "Pendente"
        : requireStatus(req.body.status_manutencao, "Status da manutenção", maintenanceStatuses);
    const expectedDate = optionalDate(req.body.data_prevista_manutencao, "Data prevista");
    const exitDate = optionalDate(req.body.data_saida_manutencao, "Data de saída");
    const [result] = await db.execute(
        `INSERT INTO manutencoes
            (id_maquina, descricao_manutencao, status_manutencao, data_prevista_manutencao, data_saida_manutencao)
         VALUES (?, ?, ?, ?, ?)`,
        [machineId, description, status, expectedDate, exitDate]
    );
    const [rows] = await db.execute(`${maintenanceQuery} WHERE m.id_manutencao = ?`, [result.insertId]);
    res.status(201).json(rows[0]);
}));

app.put("/api/manutencoes/:id", asyncRoute(async (req, res) => {
    const id = requireRecordId(req.params.id);
    const machineId = requireMachineId(req.body.id_maquina);
    const description = req.body.descricao_manutencao === undefined
        ? null
        : requireText(req.body.descricao_manutencao, "Descrição", 65535);
    const status = requireStatus(req.body.status_manutencao, "Status da manutenção", maintenanceStatuses);
    const expectedDate = optionalDate(req.body.data_prevista_manutencao, "Data prevista");
    const exitDate = optionalDate(req.body.data_saida_manutencao, "Data de saída");
    const [result] = await db.execute(
        `UPDATE manutencoes
         SET id_maquina = ?, descricao_manutencao = ?, status_manutencao = ?,
             data_prevista_manutencao = ?, data_saida_manutencao = ?
         WHERE id_manutencao = ?`,
        [machineId, description, status, expectedDate, exitDate, id]
    );
    if (!result.affectedRows) {
        throw new HttpError(404, "Manutenção não encontrada.");
    }
    const [rows] = await db.execute(`${maintenanceQuery} WHERE m.id_manutencao = ?`, [id]);
    res.json(rows[0]);
}));

app.delete("/api/manutencoes/:id", asyncRoute(async (req, res) => {
    const id = requireRecordId(req.params.id);
    const [result] = await db.execute("DELETE FROM manutencoes WHERE id_manutencao = ?", [id]);
    if (!result.affectedRows) {
        throw new HttpError(404, "Manutenção não encontrada.");
    }
    res.status(204).end();
}));

app.get("/maquinas", asyncRoute(async (req, res) => {
    const [rows] = await db.query("SELECT * FROM maquinas ORDER BY id_maquina");
    res.json(rows);
}));

app.get("/manutencoes", asyncRoute(async (req, res) => {
    const [rows] = await db.query(`${maintenanceQuery} ORDER BY m.id_manutencao DESC`);
    res.json(rows);
}));

app.use("/api", handleApiError);
app.use("/maquinas", handleApiError);
app.use("/manutencoes", handleApiError);

app.use((req, res) => {
    res.status(404).json({ erro: "Rota não encontrada." });
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}!`);
});
