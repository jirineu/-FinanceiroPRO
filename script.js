// Função de Alerta Personalizado
// --- REDIRECIONAMENTO AUTOMÁTICO DE ALERTS ---
window.alert = function(mensagem) {
    mostrarAlerta(mensagem);
};

// Esta é a função que cria o visual (Toast)
function mostrarAlerta(mensagem) {
    // Tenta encontrar o elemento, se não existir, ele cria um na hora
    let alertBox = document.getElementById('custom-alert');
    
    if (!alertBox) {
        alertBox = document.createElement('div');
        alertBox.id = 'custom-alert';
        document.body.appendChild(alertBox);
    }

    alertBox.innerHTML = `<i class="fas fa-info-circle" style="color:#2563eb"></i> ${mensagem}`;
    alertBox.classList.add('show');

    // Remove a classe após 3 segundos
    setTimeout(() => {
        alertBox.classList.remove('show');
    }, 3000);
}
// --- BANCO DE DADOS (Persistência Local) ---

let db = JSON.parse(localStorage.getItem('clean_fin_db')) || { 
    entradas: [], 
    dividas: [], 
    mercadoTemp: [],
    patrimonio: [] 
};

// --- NAVEGAÇÃO HORIZONTAL ---
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.h-nav-item').forEach(n => n.classList.remove('active'));
    
    const activeTab = document.getElementById(tabId);
    if (activeTab) activeTab.classList.add('active');
    
    const navMap = {
        'financeiro': 'nav-fin', 
        'mercado': 'nav-mer', 
        'investimentos': 'nav-inv', 
        'historico': 'nav-his', 
        'config': 'nav-cfg'
    };
    
    const navBtn = document.getElementById(navMap[tabId]);
    if (navBtn) navBtn.classList.add('active');
    
    renderAll();
}

function salvar() {
    localStorage.setItem('clean_fin_db', JSON.stringify(db));
    renderAll();
}

// --- LÓGICA DE ENTRADA (SALDO INICIAL) ---
function abrirModalEntrada() {
    const valorStr = prompt("Valor da Entrada (R$):");
    if (!valorStr) return;
    const valor = parseFloat(valorStr.replace(',', '.'));
    if (isNaN(valor)) return alert("Valor inválido");

    db.entradas.push({
        id: Date.now(),
        descricao: "Entrada de Saldo",
        valor: valor,
        data: new Date().toISOString().split('T')[0] 
    });
    salvar();
}

// --- GESTÃO DE DESPESAS (CARTEIRA) ---
function handleDivida() {
    const desc = document.getElementById('desc-divida').value;
    const valorInput = document.getElementById('valor-divida').value;
    const diaInput = document.getElementById('data-divida').value; 
    const tipo = document.getElementById('tipo-divida').value;
    const numP = parseInt(document.getElementById('num-parcelas').value) || 1;

    const valorParcela = parseFloat(valorInput);
    const dia = parseInt(diaInput);

    if (!desc || isNaN(valorParcela) || isNaN(dia) || dia < 1 || dia > 31) {
        return alert("Preencha descrição, valor e dia (1-31).");
    }

    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = agora.getMonth();
    const baseId = Date.now();

    if (tipo === 'Parcelada') {
        for (let i = 1; i <= numP; i++) {
            let dt = new Date(ano, mes + (i - 1), dia);
            db.dividas.push({
                id: baseId + i,
                desc: `${desc} (${i}/${numP})`,
                valor: valorParcela,
                data: dt.toISOString().split('T')[0],
                tipo: 'Parcelada',
                paga: false
            });
        }
    } 
    // NOVO BLOCO: Tratamento para despesa Fixa
    else if (tipo === 'Fixa') {
        for (let i = 0; i < 12; i++) { // Registra para os próximos 12 meses
            let dt = new Date(ano, mes + i, dia);
            db.dividas.push({
                id: baseId + i,
                desc: desc,
                valor: valorParcela,
                data: dt.toISOString().split('T')[0],
                tipo: 'Fixa',
                paga: false
            });
        }
    } 
    // Caso contrário, é "À Vista" (Apenas o mês atual)
    else {
        let dt = new Date(ano, mes, dia);
        db.dividas.push({ 
            id: Date.now(), 
            desc: desc, 
            valor: valorParcela, 
            data: dt.toISOString().split('T')[0], 
            tipo: tipo,
            paga: false
        });
    }
    
    limparCamposDivida();
    salvar();
}

function limparCamposDivida() {
    document.getElementById('desc-divida').value = '';
    document.getElementById('valor-divida').value = '';
    document.getElementById('data-divida').value = '';
    toggleParcelas('À Vista');
}

// --- GESTÃO DE MERCADO (CARRINHO) ---
function handleMercado() {
    const nome = document.getElementById('item-nome').value;
    const valor = parseFloat(document.getElementById('item-valor').value);
    const qtd = parseInt(document.getElementById('item-qtd').value) || 1;

    if (!nome || isNaN(valor)) return alert("Informe nome e preço.");

    db.mercadoTemp.push({ id: Date.now(), nome, valor, qtd });
    
    document.getElementById('item-nome').value = '';
    document.getElementById('item-valor').value = '';
    document.getElementById('item-qtd').value = '1';
    salvar();
}

function finalizarCompra() {
    if (db.mercadoTemp.length === 0) return;
    
    const total = db.mercadoTemp.reduce((acc, i) => acc + (i.valor * i.qtd), 0);
    const agora = new Date();
    
    db.dividas.push({
        id: Date.now(),
        desc: "Compra de Mercado",
        valor: total,
        data: agora.toISOString().split('T')[0],
        tipo: "À Vista"
    });

    db.mercadoTemp = [];
    alert("Compra finalizada e abatida do saldo!");
    showTab('financeiro');
}

// --- GESTÃO DE PATRIMÔNIO (INVESTIMENTOS) ---
function handlePatrimonio() {
    const valor = parseFloat(document.getElementById('valor-patrimonio').value);
    const tipo = document.getElementById('tipo-patrimonio').value;

    if (isNaN(valor) || valor <= 0) return alert("Informe um valor válido.");

    const agora = new Date();
    const dataISO = agora.toISOString().split('T')[0];

    // Adiciona ao registro de Patrimônio
    db.patrimonio.push({ id: Date.now(), valor, tipo, data: dataISO });

    // Abate do Saldo (Cria uma saída na carteira)
    db.dividas.push({
        id: Date.now() + 1,
        desc: `Investimento: ${tipo}`,
        valor: valor,
        data: dataISO,
        tipo: 'Investimento'
    });

    document.getElementById('valor-patrimonio').value = '';
    alert("Investimento registrado e saldo abatido!");
    salvar();
}

// --- RENDERIZAÇÃO CENTRALIZADA ---
function renderAll() {
    const agora = new Date();
    const mesAt = agora.getMonth();
    const anoAt = agora.getFullYear();

    // Filtros Mensais
    const dividasMes = db.dividas.filter(d => {
        const dt = new Date(d.data + "T00:00:00");
        return dt.getMonth() === mesAt && dt.getFullYear() === anoAt;
    });

    const entradasMes = db.entradas.filter(e => {
        const dt = new Date(e.data + "T00:00:00");
        return dt.getMonth() === mesAt && dt.getFullYear() === anoAt;
    });

    // --- CÁLCULOS ATUALIZADOS ---
    
    // 1. Total de Entradas
    const totalE = entradasMes.reduce((acc, e) => acc + e.valor, 0);
    
    // 2. Total de Dívidas (apenas as marcadas como PAGAS)
    const totalD = dividasMes
        .filter(d => d.paga === true) 
        .reduce((acc, d) => acc + d.valor, 0);

    // 3. Total de Patrimônio (Tudo o que foi investido/guardado)
    // Somamos todo o array de patrimônio para subtrair do saldo disponível
    const totalP = db.patrimonio.reduce((acc, p) => acc + p.valor, 0);
        
    // 4. Saldo Atual: Entradas - Dívidas Pagas - Patrimônio Investido
    const saldo = totalE - totalD - totalP;

    // UI Saldo
    const saldoElem = document.getElementById('saldo-geral');
    if (saldoElem) saldoElem.innerText = saldo.toLocaleString('pt-BR', {minimumFractionDigits: 2});

    // UI Lista Carteira
    const listaD = document.getElementById('lista-dividas');
    if (listaD) {
        listaD.innerHTML = dividasMes.sort((a,b) => new Date(a.data) - new Date(b.data)).map(d => `
            <div class="list-item-card ${d.paga ? 'opacity-60' : ''}" style="display:flex; justify-content:space-between; align-items:center; border-left: 4px solid ${d.paga ? '#10b981' : '#f59e0b'}; margin-bottom: 8px; padding: 10px; background: white; border-radius: 8px;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <button onclick="alternarPagamento(${d.id})" style="font-size: 1.4rem; color: ${d.paga ? '#10b981' : '#cbd5e1'}; background: none; border: none; cursor: pointer;">
                        <i class="fas ${d.paga ? 'fa-check-circle' : 'fa-circle'}"></i>
                    </button>
                    <div>
                        <p style="font-weight:700; font-size:13px; margin:0; ${d.paga ? 'text-decoration: line-through; color: #94a3b8;' : ''}">${d.desc}</p>
                        <p style="font-size:10px; color:#94a3b8; text-transform:uppercase; margin:0;">${d.tipo}</p>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:12px;">
                    <span style="font-weight:800; font-size:14px; color: ${d.paga ? '#64748b' : '#1e293b'}">R$ ${d.valor.toFixed(2)}</span>
                    <button onclick="removerItem('dividas', ${d.id})" style="color: #ef4444; border: none; background: none; cursor: pointer; padding: 5px; opacity: 0.5;">
                        <i class="fas fa-times-circle"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    // UI Mercado
    const listaC = document.getElementById('lista-carrinho');
    if (listaC) {
        listaC.innerHTML = db.mercadoTemp.map(i => `
            <li class="flex justify-between text-sm py-1 border-b border-slate-100">
                <span>${i.qtd}x ${i.nome}</span>
                <span class="font-bold">R$ ${(i.valor * i.qtd).toFixed(2)}</span>
            </li>
        `).join('');
        const totalC = db.mercadoTemp.reduce((acc, i) => acc + (i.valor * i.qtd), 0);
        document.getElementById('total-carrinho').innerText = `R$ ${totalC.toFixed(2)}`;
        document.getElementById('area-carrinho').style.display = db.mercadoTemp.length ? 'block' : 'none';
    }

    // UI Patrimônio
    const listaP = document.getElementById('lista-patrimonio');
    if (listaP) {
        listaP.innerHTML = db.patrimonio.map(p => `
            <div class="list-item-card" style="display:flex; justify-content:space-between; padding:10px;">
                <span style="font-size:12px; font-weight:700;">${p.tipo}</span>
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:12px; font-weight:800; color:#10b981;">R$ ${p.valor.toFixed(2)}</span>
                    <button onclick="removerItem('patrimonio', ${p.id})" style="color: #ef4444; font-size: 10px; opacity: 0.5;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderHistorico();
}

// --- HISTÓRICO COM INDICADORES ---
function renderHistorico() {
    const histArea = document.getElementById('lista-historico');
    if (!histArea) return;
    const meses = {};
    db.dividas.forEach(item => {
        const dt = new Date(item.data + "T00:00:00");
        const chave = `${dt.toLocaleString('pt-BR', {month: 'long'})} ${dt.getFullYear()}`;
        if(!meses[chave]) meses[chave] = { gastos: 0, investido: 0, itens: [] };
        if(item.tipo === 'Investimento') meses[chave].investido += item.valor;
        else meses[chave].gastos += item.valor;
        meses[chave].itens.push(item);
    });

    histArea.innerHTML = Object.keys(meses).map(m => `
        <div class="form-card" style="margin-bottom:15px;">
            <p class="text-[10px] font-black text-slate-400 uppercase mb-2">${m}</p>
            <div class="flex gap-4 mb-3 pb-2 border-b border-slate-50">
                <span class="text-xs font-bold text-red-500">Gastos: R$ ${meses[m].gastos.toFixed(2)}</span>
                <span class="text-xs font-bold text-emerald-500">Investido: R$ ${meses[m].investido.toFixed(2)}</span>
            </div>
            ${meses[m].itens.map(it => `
                <div class="flex justify-between text-[11px] mb-1">
                    <span class="${it.tipo === 'Investimento' ? 'text-emerald-600 font-bold' : 'text-slate-500'}">${it.desc}</span>
                    <span class="font-mono">R$ ${it.valor.toFixed(2)}</span>
                </div>
            `).join('')}
        </div>
    `).join('');
}

// --- UTILITÁRIOS ---
function toggleParcelas(val) { document.getElementById('campo-parcelas').style.display = (val === 'Parcelada') ? 'block' : 'none'; }
function removerItem(lista, id) { if(confirm("Remover?")) { db[lista] = db[lista].filter(i => i.id !== id); salvar(); } }
function exportarJSON() { const data = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db)); const a = document.createElement('a'); a.href = data; a.download = `financeiro_backup.json`; a.click(); }
function importarJSON() { const file = document.getElementById('importFile').files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (e) => { db = JSON.parse(e.target.result); salvar(); location.reload(); }; reader.readAsText(file); }
function resetarTudo() { if(confirm("Apagar todos os dados?")) { localStorage.clear(); location.reload(); } }

document.addEventListener('DOMContentLoaded', () => renderAll());



// Função para ajustar o saldo atual através de um lançamento de correção
function editarSaldoAtual() {
    const agora = new Date();
    const mesAt = agora.getMonth();
    const anoAt = agora.getFullYear();

    // 1. Calcula o saldo atual exato do mês vigente
    const totalE = db.entradas.filter(e => {
        const dt = new Date(e.data + "T00:00:00");
        return dt.getMonth() === mesAt && dt.getFullYear() === anoAt;
    }).reduce((acc, e) => acc + e.valor, 0);

  const totalD = dividasMes
    .filter(d => d.paga === true) // Só subtrai se estiver paga
    .reduce((acc, d) => acc + d.valor, 0);

    const saldoSistema = totalE - totalD;

    // 2. Pergunta ao usuário o valor real que ele tem
    const novoSaldoStr = prompt(`Saldo no sistema: R$ ${saldoSistema.toFixed(2)}\nDigite o saldo real que você possui agora:`);
    
    if (novoSaldoStr === null || novoSaldoStr.trim() === "") return;
    
    const novoSaldo = parseFloat(novoSaldoStr.replace(',', '.'));
    if (isNaN(novoSaldo)) return alert("Valor inválido.");

    // 3. Calcula a diferença e gera um lançamento de "Ajuste"
    const diferenca = novoSaldo - saldoSistema;

    if (diferenca !== 0) {
        db.entradas.push({
            id: Date.now(),
            descricao: "Ajuste de Saldo Manual",
            valor: diferenca,
            data: agora.toISOString().split('T')[0]
        });
        
        alert("Saldo ajustado com sucesso!");
        salvar(); // Chama a função que salva no LocalStorage e atualiza a tela
    }
}
function alternarPagamento(id) {
    const divida = db.dividas.find(d => d.id === id);
    if (divida) {
        divida.paga = !divida.paga; // Inverte o estado (de pendente para pago e vice-versa)
        salvar(); // Salva e atualiza a tela automaticamente
    }
}
