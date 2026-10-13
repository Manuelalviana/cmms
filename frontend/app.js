const state = {
    view: "overview",
    machines: [],
    maintenances: [],
    search: "",
    status: "",
    editing: null,
    noticeTimer: null
};

const machineStatusOptions = ["Ativa", "Manutenção", "Inativa", "Descartada"];
const maintenanceStatusOptions = ["Pendente", "Em Andamento", "Concluida"];
const elements = {
    title: document.querySelector("#page-title"),
    subtitle: document.querySelector("#page-subtitle"),
    breadcrumb: document.querySelector("#breadcrumb-current"),
    kicker: document.querySelector("#table-kicker"),
    tableTitle: document.querySelector("#table-title"),
    tableDescription: document.querySelector("#table-description"),
    tableHead: document.querySelector("#table-head"),
    tableBody: document.querySelector("#table-body"),
    tableCount: document.querySelector("#table-count"),
    emptyState: document.querySelector("#empty-state"),
    search: document.querySelector("#search-input"),
    statusFilter: document.querySelector("#status-filter"),
    primaryAction: document.querySelector("#primary-action"),
    primaryActionLabel: document.querySelector("#primary-action-label"),
    dialog: document.querySelector("#record-dialog"),
    form: document.querySelector("#record-form"),
    dialogTitle: document.querySelector("#dialog-title"),
    dialogFields: document.querySelector("#dialog-fields"),
    notice: document.querySelector("#notice")
};

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);

function statusClass(status) {
    return ({
        "Ativa": "ativa",
        "Manutenção": "manutencao",
        "Inativa": "inativa",
        "Descartada": "descartada",
        "Pendente": "pendente",
        "Em Andamento": "andamento",
        "Concluida": "concluida"
    })[status] || "";
}

function statusLabel(status) {
    return status === "Concluida" ? "Concluída" : status;
}

function formatDate(value, includeTime = false) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    const options = includeTime
        ? { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
        : { day: "2-digit", month: "short", year: "numeric" };
    return new Intl.DateTimeFormat("pt-BR", options).format(date);
}

function toLocalInputValue(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (part) => String(part).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function request(path, options = {}) {
    const response = await fetch(path, {
        ...options,
        headers: { "Content-Type": "application/json", ...options.headers }
    });
    if (response.status === 204) return null;

    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.erro || `Falha na requisição (${response.status}).`);
    return result;
}

async function loadData() {
    elements.tableCount.textContent = "Carregando dados...";
    try {
        const [machines, maintenances] = await Promise.all([
            request("/api/maquinas"),
            request("/api/manutencoes")
        ]);
        state.machines = machines;
        state.maintenances = maintenances;
        render();
    } catch (error) {
        showNotice(error.message, true);
        elements.tableCount.textContent = "Não foi possível carregar os dados.";
    }
}

function showNotice(message, isError = false) {
    window.clearTimeout(state.noticeTimer);
    elements.notice.textContent = message;
    elements.notice.classList.toggle("is-error", isError);
    elements.notice.hidden = false;
    state.noticeTimer = window.setTimeout(() => { elements.notice.hidden = true; }, 4500);
}

function filteredRows(kind) {
    const rows = kind === "machines" ? state.machines : state.maintenances;
    const query = state.search.trim().toLocaleLowerCase("pt-BR");
    return rows.filter((row) => {
        const status = kind === "machines" ? row.status_maquina : row.status_manutencao;
        const searchable = kind === "machines"
            ? `${row.id_maquina} ${row.nome_maquina} ${row.setor_maquina} ${status}`
            : `${row.id_manutencao} ${row.maquina} ${row.descricao_manutencao || ""} ${status}`;
        return (!state.status || state.status === status) &&
            (!query || searchable.toLocaleLowerCase("pt-BR").includes(query));
    });
}

function renderOverviewRows() {
    const rows = [...state.maintenances]
        .sort((a, b) => new Date(b.data_entrada_manutencao) - new Date(a.data_entrada_manutencao))
        .slice(0, 6);
    elements.tableHead.innerHTML = `<tr>
        <th>Equipamento</th><th>Descrição</th><th>Data de entrada</th><th>Previsão</th><th>Status</th><th>Ações</th>
    </tr>`;
    elements.tableBody.innerHTML = rows.map((row) => `<tr>
        <td><span class="record-name"><span class="record-avatar" aria-hidden="true">⚙</span>${escapeHtml(row.maquina)}</span></td>
        <td><span class="record-description" title="${escapeHtml(row.descricao_manutencao || "Sem descrição")}">${escapeHtml(row.descricao_manutencao || "Sem descrição")}</span></td>
        <td>${formatDate(row.data_entrada_manutencao, true)}</td>
        <td>${formatDate(row.data_prevista_manutencao)}</td>
        <td><span class="status-badge status-${statusClass(row.status_manutencao)}">${escapeHtml(statusLabel(row.status_manutencao))}</span></td>
        <td><div class="row-actions"><button class="action-button" type="button" data-action="edit" data-kind="maintenance" data-id="${row.id_manutencao}">Editar</button><button class="action-button delete" type="button" data-action="delete" data-kind="maintenance" data-id="${row.id_manutencao}">Excluir</button></div></td>
    </tr>`).join("");
    elements.tableCount.textContent = `Exibindo ${rows.length} de ${state.maintenances.length} manutenções`;
    return rows.length;
}

function renderMachineRows() {
    const rows = filteredRows("machines");
    elements.tableHead.innerHTML = `<tr><th>Equipamento</th><th>Setor</th><th>Status</th><th>Ações</th></tr>`;
    elements.tableBody.innerHTML = rows.map((row) => `<tr>
        <td><span class="record-name"><span class="record-avatar" aria-hidden="true">⚙</span>${escapeHtml(row.nome_maquina)}</span></td>
        <td>${escapeHtml(row.setor_maquina)}</td>
        <td><span class="status-badge status-${statusClass(row.status_maquina)}">${escapeHtml(row.status_maquina)}</span></td>
        <td><div class="row-actions"><button class="action-button" type="button" data-action="edit" data-kind="machine" data-id="${row.id_maquina}">Editar</button><button class="action-button delete" type="button" data-action="delete" data-kind="machine" data-id="${row.id_maquina}">Excluir</button></div></td>
    </tr>`).join("");
    elements.tableCount.textContent = `Exibindo ${rows.length} de ${state.machines.length} máquinas`;
    return rows.length;
}

function renderMaintenanceRows() {
    const rows = filteredRows("maintenance");
    elements.tableHead.innerHTML = `<tr>
        <th>Equipamento</th><th>Descrição</th><th>Entrada</th><th>Previsão</th><th>Saída</th><th>Status</th><th>Ações</th>
    </tr>`;
    elements.tableBody.innerHTML = rows.map((row) => `<tr>
        <td><span class="record-name"><span class="record-avatar" aria-hidden="true">⚙</span>${escapeHtml(row.maquina)}</span></td>
        <td><span class="record-description" title="${escapeHtml(row.descricao_manutencao || "Sem descrição")}">${escapeHtml(row.descricao_manutencao || "Sem descrição")}</span></td>
        <td>${formatDate(row.data_entrada_manutencao, true)}</td>
        <td>${formatDate(row.data_prevista_manutencao)}</td>
        <td>${formatDate(row.data_saida_manutencao)}</td>
        <td><span class="status-badge status-${statusClass(row.status_manutencao)}">${escapeHtml(statusLabel(row.status_manutencao))}</span></td>
        <td><div class="row-actions"><button class="action-button" type="button" data-action="edit" data-kind="maintenance" data-id="${row.id_manutencao}">Editar</button><button class="action-button delete" type="button" data-action="delete" data-kind="maintenance" data-id="${row.id_manutencao}">Excluir</button></div></td>
    </tr>`).join("");
    elements.tableCount.textContent = `Exibindo ${rows.length} de ${state.maintenances.length} manutenções`;
    return rows.length;
}

function renderMetrics() {
    document.querySelector("#metric-machines").textContent = state.machines.length;
    document.querySelector("#metric-active").textContent =
        state.machines.filter((machine) => machine.status_maquina === "Ativa").length;
    document.querySelector("#metric-in-maintenance").textContent =
        state.maintenances.filter((maintenance) => maintenance.status_manutencao === "Em Andamento").length;
    document.querySelector("#metric-pending").textContent =
        state.maintenances.filter((maintenance) => maintenance.status_manutencao === "Pendente").length;
    document.querySelector("#machine-nav-count").textContent = state.machines.length;
    document.querySelector("#maintenance-nav-count").textContent = state.maintenances.length;
}

function render() {
    renderMetrics();
    const isOverview = state.view === "overview";
    const isMachineView = state.view === "machines";
    const isMaintenanceView = state.view === "maintenance";
    const viewConfig = isOverview
        ? {
            title: "Visão geral",
            subtitle: "Acompanhe o estado dos equipamentos e das atividades de manutenção.",
            kicker: "ACOMPANHAMENTO",
            tableTitle: "Manutenções recentes",
            description: "Atividades e status atual dos equipamentos.",
            action: "Nova manutenção"
        }
        : isMachineView
            ? {
                title: "Máquinas",
                subtitle: "Consulte e gerencie os equipamentos cadastrados na operação.",
                kicker: "CADASTRO DE ATIVOS",
                tableTitle: "Equipamentos cadastrados",
                description: "Dados e disponibilidade dos equipamentos.",
                action: "Nova máquina"
            }
            : {
                title: "Manutenções",
                subtitle: "Organize os atendimentos e acompanhe o ciclo de cada manutenção.",
                kicker: "ORDENS DE SERVIÇO",
                tableTitle: "Todas as manutenções",
                description: "Histórico, prazos e andamento dos serviços.",
                action: "Nova manutenção"
            };

    elements.title.textContent = viewConfig.title;
    elements.subtitle.textContent = viewConfig.subtitle;
    elements.breadcrumb.textContent = viewConfig.title;
    elements.kicker.textContent = viewConfig.kicker;
    elements.tableTitle.textContent = viewConfig.tableTitle;
    elements.tableDescription.textContent = viewConfig.description;
    elements.primaryActionLabel.textContent = viewConfig.action;
    elements.primaryAction.dataset.kind = isMachineView ? "machine" : "maintenance";
    document.querySelector("#status-filter").value = state.status;
    document.querySelectorAll(".nav-link").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.view === state.view);
    });
    document.querySelector("#status-filter").hidden = isOverview;
    elements.search.placeholder = isMachineView ? "Buscar máquina..." : "Buscar manutenção...";

    let visibleCount;
    if (isOverview) visibleCount = renderOverviewRows();
    else if (isMachineView) visibleCount = renderMachineRows();
    else visibleCount = renderMaintenanceRows();
    elements.emptyState.hidden = visibleCount !== 0;
}

function fieldMarkup({ name, label, type = "text", value = "", required = false, options, multiline = false, placeholder = "" }) {
    const requiredAttribute = required ? "required" : "";
    const inputId = `field-${name}`;
    let input;
    if (options) {
        input = `<select id="${inputId}" name="${name}" ${requiredAttribute}>${options.map((option) => {
            const optionValue = typeof option === "string" ? option : option.value;
            const optionLabel = typeof option === "string" ? option : option.label;
            return `<option value="${escapeHtml(optionValue)}" ${String(optionValue) === String(value) ? "selected" : ""}>${escapeHtml(optionLabel)}</option>`;
        }).join("")}</select>`;
    } else if (multiline) {
        input = `<textarea id="${inputId}" name="${name}" maxlength="65535" placeholder="${escapeHtml(placeholder)}" ${requiredAttribute}>${escapeHtml(value)}</textarea>`;
    } else {
        input = `<input id="${inputId}" name="${name}" type="${type}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" ${requiredAttribute}>`;
    }
    return `<label class="form-field" for="${inputId}">${label}${input}</label>`;
}

function openForm(kind, record = null) {
    state.editing = record ? { kind, id: kind === "machine" ? record.id_maquina : record.id_manutencao } : null;
    const isMachine = kind === "machine";
    const machineOptions = state.machines.map((machine) => ({
        value: machine.id_maquina,
        label: machine.nome_maquina
    }));
    elements.dialogTitle.textContent = `${record ? "Editar" : "Nova"} ${isMachine ? "máquina" : "manutenção"}`;

    if (isMachine) {
        elements.dialogFields.innerHTML = [
            fieldMarkup({ name: "nome_maquina", label: "Nome da máquina", value: record?.nome_maquina || "", required: true, placeholder: "Ex.: Torno CNC 02" }),
            fieldMarkup({ name: "setor_maquina", label: "Setor", value: record?.setor_maquina || "", required: true, placeholder: "Ex.: Usinagem" }),
            fieldMarkup({ name: "status_maquina", label: "Status", value: record?.status_maquina || "Ativa", options: machineStatusOptions })
        ].join("");
    } else {
        if (!state.machines.length) {
            showNotice("Cadastre uma máquina antes de registrar uma manutenção.", true);
            return;
        }
        elements.dialogFields.innerHTML = [
            fieldMarkup({ name: "id_maquina", label: "Equipamento", value: record?.id_maquina || machineOptions[0].value, options: machineOptions, required: true }),
            fieldMarkup({ name: "descricao_manutencao", label: "Descrição do serviço", value: record?.descricao_manutencao || "", multiline: true, placeholder: "Descreva o serviço ou problema" }),
            fieldMarkup({ name: "status_manutencao", label: "Status", value: record?.status_manutencao || "Pendente", options: maintenanceStatusOptions }),
            fieldMarkup({ name: "data_prevista_manutencao", label: "Data prevista", type: "datetime-local", value: toLocalInputValue(record?.data_prevista_manutencao) }),
            fieldMarkup({ name: "data_saida_manutencao", label: "Data de conclusão / saída", type: "datetime-local", value: toLocalInputValue(record?.data_saida_manutencao) })
        ].join("");
    }
    elements.dialog.showModal();
}

async function deleteRecord(kind, id) {
    const isMachine = kind === "machine";
    const row = isMachine
        ? state.machines.find((item) => item.id_maquina === id)
        : state.maintenances.find((item) => item.id_manutencao === id);
    const label = isMachine ? row?.nome_maquina : `manutenção de ${row?.maquina || "equipamento"}`;
    if (!window.confirm(`Deseja realmente excluir ${label}?`)) return;

    try {
        await request(`/api/${isMachine ? "maquinas" : "manutencoes"}/${id}`, { method: "DELETE" });
        showNotice("Registro excluído com sucesso.");
        await loadData();
    } catch (error) {
        showNotice(error.message, true);
    }
}

document.querySelectorAll(".nav-link").forEach((button) => {
    button.addEventListener("click", () => {
        state.view = button.dataset.view;
        state.status = "";
        state.search = "";
        elements.search.value = "";
        render();
    });
});

elements.search.addEventListener("input", () => {
    state.search = elements.search.value;
    render();
});

elements.statusFilter.addEventListener("change", () => {
    state.status = elements.statusFilter.value;
    render();
});

elements.primaryAction.addEventListener("click", () => {
    openForm(elements.primaryAction.dataset.kind);
});

document.querySelector("#refresh-button").addEventListener("click", loadData);

document.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => elements.dialog.close());
});

elements.dialog.addEventListener("click", (event) => {
    if (event.target === elements.dialog) elements.dialog.close();
});

elements.tableBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const kind = button.dataset.kind;
    const id = Number(button.dataset.id);
    if (button.dataset.action === "delete") {
        deleteRecord(kind, id);
        return;
    }
    const record = kind === "machine"
        ? state.machines.find((item) => item.id_maquina === id)
        : state.maintenances.find((item) => item.id_manutencao === id);
    if (record) openForm(kind, record);
});

elements.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = document.querySelector("#save-button");
    const data = Object.fromEntries(new FormData(elements.form).entries());
    const kind = state.editing?.kind || elements.primaryAction.dataset.kind;
    const isMachine = kind === "machine";
    const endpoint = isMachine ? "maquinas" : "manutencoes";
    const payload = isMachine
        ? data
        : {
            ...data,
            id_maquina: Number(data.id_maquina),
            descricao_manutencao: data.descricao_manutencao.trim() || null,
            data_prevista_manutencao: data.data_prevista_manutencao || null,
            data_saida_manutencao: data.data_saida_manutencao || null
        };
    const editing = state.editing;
    submit.disabled = true;
    submit.textContent = "Salvando...";
    try {
        await request(`/api/${endpoint}${editing ? `/${editing.id}` : ""}`, {
            method: editing ? "PUT" : "POST",
            body: JSON.stringify(payload)
        });
        elements.dialog.close();
        showNotice(editing ? "Registro atualizado com sucesso." : "Registro cadastrado com sucesso.");
        await loadData();
    } catch (error) {
        showNotice(error.message, true);
    } finally {
        submit.disabled = false;
        submit.textContent = "Salvar registro";
    }
});

document.querySelector("#today-label").textContent =
    new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
        .format(new Date()).toLocaleUpperCase("pt-BR");

render();
loadData();
