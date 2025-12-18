
// =====================================================================
// 1) MAPEAMENTO DAS PÁGINAS DO SITE  RECURSOS DA API
// =====================================================================
// -------------------------------------------------------------

// Mapeamento das páginas .html padronizada com os recursos da SWAPI
// SWAPI atua como um banco de dados do site
// Assim fica muito mais fácil conectar cada página ao endpoint correspondente
// -------------------------------------------------------------
const MAPA_PAGINAS = {
    "filmes.html": "films",
    "personagens.html": "people",
    "planetas.html": "planets",
    "veiculos.html": "vehicles",
    "especies.html": "species",
    "espaconaves.html": "starships"
};





// =====================================================================
// 2) IDENTIFICAR QUAL PÁGINA HTML ESTÁ SENDO ABERTA
// =====================================================================
// -------------------------------------------------------------

// window.location.pathname: pega o caminho do arquivo. ex: /projeto/filmes.html
// .split("/"): separa o caminho em partes. ex: ["", "projeto", "filmes.html"]
//,pop(): pega o ultimo item, ou seja o nome da pag, levando a pagina que o user esta 
// essencial p n escrever if (pagina === "filmes.html") carregar("films");... 
// ou ter fzr js d página por página 
// -------------------------------------------------------------
function obterPaginaAtual() {
    const partes = window.location.pathname.split("/");
    return partes.pop();
}



// =====================================================================
// 3) CARREGAR DADOS DA SWAPI (COM PAGINAÇÃO + LOCALSTORAGE)
// =====================================================================
// ------------------------------------------------------------------
// Carrega dados da SWAPI com caching em localStorage
// Se houver cache evita consultas desnecessárias
// Se não houver busca todas as páginas da API
// Atualização do cache automaticamente a cada 
// ------------------------------------------------------------------
async function carregarDadosSWAPI(recurso) {

    const chave = `sw_${recurso}`;
    const chaveTempo = `sw_${recurso}_timestamp`;

    const cache = localStorage.getItem(chave);
    const cacheTempo = localStorage.getItem(chaveTempo);

    // Tempo de validade do cahe definido em millisegundos 
    // 3 dias (em milissegundos)
    const validade = 3 * 24 * 60 * 60 * 1000;

    // Se existe cache e ainda está dentro da validade → usar cache
    if (cache && cacheTempo) {

        const tempoPassado = Date.now() - Number(cacheTempo);

        if (tempoPassado < validade) {
            // Ainda válido → usar cache
            return JSON.parse(cache);
        } else {
            // Cache expirou → limpar o cache antigo
            localStorage.removeItem(chave);
            localStorage.removeItem(chaveTempo);
        }
    }

    // Se chegou aqui: não existe cache OU expirou → buscar da API
    let lista = [];
    let url = `https://swapi.dev/api/${recurso}/`;

    while (url) {
        const resp = await fetch(url);
        const dados = await resp.json();

        lista = [...lista, ...dados.results];
        url = dados.next;
    }

    // Salvar novo cache + timestamp
    localStorage.setItem(chave, JSON.stringify(lista));
    localStorage.setItem(chaveTempo, Date.now().toString());

    return lista;
}



// ------------------------------------------------------------------
// Filtro interno da página (busca local)
// A função filtrarLista serve para exibir a página com apenas o CARD
// do item que o usuário escolheu na busca global.


// supondo que o user busque por Luke Skywalker e clique na sugestão
// window.location.search Pega tudo que vem depois de ? na URL.
// "?busca=Luke Skywalker"
// new URLSearchParams(): essa class pega a string e transforma em um objeto 
// organizado, permitindo acessar os parâmetros da URL.
// get pega o valor e retorna o termo .get("busca") --> ?busca=Luke Skywalker
// --> termo = "Luke Skywalker"
// ------------------------------------------------------------------
function filtrarLista(lista) {

    const termo = new URLSearchParams(window.location.search).get("busca");
    if (!termo) return lista;

    return lista.filter(item =>
        //toLowerCase() transforma td em minusculo
        //.includes(termo.toLowerCase()) Verifica se o nome do item contém o termo procurado
        (item.title || item.name).toLowerCase().includes(termo.toLowerCase())
    );
}



// ------------------------------------------------------------------
// Criar CARD visual para cada item da lista
// • Monta nome, imagem e botão "Ver detalhes"
// • Faz mapeamento automático para imagem correta (prefixos/pastas)
// ------------------------------------------------------------------
function criarCard(item, container, recurso) {

    // Prefixos baseados no tipo ex.: "f1.png", "p1.png")
    const prefixos = {
        "people": "p",
        "species": "s",
        "vehicles": "v",
        "starships": "n",
        "planets": "pl",
        "films": "f"
    };

    // Pastas específicas para cada categoria
    const pastas = {
        "people": "personagens",
        "species": "especies",
        "vehicles": "veiculos",
        "starships": "espaconaves",
        "planets": "planetas",
        "films": "filmes"
    };

    const prefixo = prefixos[recurso];
    const pasta = pastas[recurso];

    // A SWAPI sempre coloca o ID no final da URL e extrai esse número
    const id = item.url.match(/(\d+)\/$/)[1];

    const caminhoIMG = `assets/img/${pasta}/${prefixo}${id}.png`;

    // Estrutura visual do card
    const div = document.createElement("div");
    div.className = "col-12 col-md-6 col-lg-4 mb-4";

    div.innerHTML = `
        <div class="card sw-card h-100 p-3 text-center">

            <img src="${caminhoIMG}" 
                 class="sw-img-card"
                 onerror="this.onerror=null; this.src='assets/img/default.png';">

            <h5 class="sw-card-title mt-3">${item.title || item.name}</h5>

            <button class="btn btn-outline-light w-100 verMaisBtn mt-2">
                Ver detalhes
            </button>

        </div>
    `;

    // Botão abre modal com detalhes
    div.querySelector(".verMaisBtn").addEventListener("click", () => {
        abrirModal(item);
    });

    container.appendChild(div);
}



// ------------------------------------------------------------------
// Modal dinâmico — gera conteúdo automaticamente
// Detecta o tipo do item pelo conteúdo recebido
// E monta HTML elegante para mostrar informações
// ------------------------------------------------------------------
function abrirModal(item) {

    const titulo = document.getElementById("modalTitulo");
    const conteudo = document.getElementById("modalConteudo");

    titulo.innerText = item.title || item.name;

    // Detecta tipo do item pela estrutura do JSON
    let tipo = "";

    if (item.model && item.starship_class) tipo = "starship";
    else if (item.model && item.vehicle_class) tipo = "vehicle";
    else if (item.height) tipo = "character";
    else if (item.classification) tipo = "species";
    else if (item.climate) tipo = "planet";
    else if (item.opening_crawl) tipo = "film";

    // Container principal do modal
    let html = `<div class="modal-detalhes">`;

    // Função para exibir campo somente se existir
    const campo = (nome, valor) => {
        if (!valor || valor === "unknown") return "";
        return `
            <div class="detalhe-linha">
                <span class="detalhe-label">${nome}:</span>
                <span class="detalhe-valor">${valor}</span>
            </div>
        `;
    };

    // BLOCO DE DETALHES POR TIPO
    // -------------------------------------------------------------

    if (tipo === "starship") {
        html += campo("Modelo", item.model);
        html += campo("Fabricante", item.manufacturer);
        html += campo("Classe", item.starship_class);
        html += campo("Custo", item.cost_in_credits);
        html += campo("Tamanho (m)", item.length);
        html += campo("Velocidade (km/h)", item.max_atmosphering_speed);
        html += campo("Tripulação", item.crew);
        html += campo("Passageiros", item.passengers);
        html += campo("Carga (kg)", item.cargo_capacity);
        html += campo("Consumíveis", item.consumables);
    }

    if (tipo === "vehicle") {
        html += campo("Modelo", item.model);
        html += campo("Fabricante", item.manufacturer);
        html += campo("Classe", item.vehicle_class);
        html += campo("Custo", item.cost_in_credits);
        html += campo("Velocidade", item.max_atmosphering_speed);
        html += campo("Tripulação", item.crew);
        html += campo("Passageiros", item.passengers);
    }

    if (tipo === "character") {
        html += campo("Altura", item.height + " cm");
        html += campo("Peso", item.mass + " kg");
        html += campo("Cabelo", item.hair_color);
        html += campo("Olhos", item.eye_color);
        html += campo("Gênero", item.gender);
        html += campo("Nascimento", item.birth_year);
    }

    if (tipo === "species") {
        html += campo("Classificação", item.classification);
        html += campo("Designação", item.designation);
        html += campo("Altura média", item.average_height);
        html += campo("Expectativa de vida", item.average_lifespan);
        html += campo("Linguagem", item.language);
    }

    if (tipo === "planet") {
        html += campo("Clima", item.climate);
        html += campo("Terreno", item.terrain);
        html += campo("População", item.population);
        html += campo("Diâmetro", item.diameter);
        html += campo("Gravidade", item.gravity);
    }

    if (tipo === "film") {
        html += campo("Diretor", item.director);
        html += campo("Produtor", item.producer);
        html += campo("Lançamento", item.release_date);

        html += `
            <div class="detalhe-bloco">
                <div class="detalhe-label">Abertura:</div>
                <pre class="crawl">${item.opening_crawl}</pre>
            </div>
        `;
    }

    html += `</div>`;

    conteudo.innerHTML = html;

    // Abre modal do Bootstrap
    new bootstrap.Modal(document.getElementById("modalInfo")).show();
}





// ------------------------------------------------------------------
// Busca GLOBAL — pesquisa em TODOS os recursos
// (films, people, starships, etc.)
// ------------------------------------------------------------------
async function buscarGlobal(termo) {

    const recursos = Object.values(MAPA_PAGINAS);
    let resultados = [];

    for (const recurso of recursos) {
        const dados = await carregarDadosSWAPI(recurso);

        const filtrados = dados
            .filter(item => (item.title || item.name).toLowerCase().includes(termo.toLowerCase()))
            .map(item => ({
                nome: item.title || item.name,
                pagina: obterPaginaPorRecurso(recurso),
                recurso
            }));

        resultados = [...resultados, ...filtrados];
    }

    return resultados;
}



// ------------------------------------------------------------------
// Descobre a página original baseada no recurso
// Ex.: recurso "people" --> "personagens.html"
// ou seja A tradutora entre API e o site.
// ------------------------------------------------------------------
function obterPaginaPorRecurso(recurso) {
    return Object.keys(MAPA_PAGINAS).find(
        k => MAPA_PAGINAS[k] === recurso
    );
}



// ------------------------------------------------------------------
// Dropdown de sugestões conforme usuário DIGITA
// ------------------------------------------------------------------
async function mostrarDropdown(termo) {

    const box = document.getElementById("dropdownSugestoes");
    if (!box) return;

    // Menos de 2 letras → não mostrar nada
    if (termo.length < 2) {
        box.innerHTML = "";
        box.classList.remove("open");
        return;
    }

    const resultados = await buscarGlobal(termo);

    if (resultados.length === 0) {
        box.innerHTML = "<div class='dropdown-item text-white'>Nada encontrado</div>";
        box.classList.add("open");
        return;
    }

    // Gera HTML das sugestões
    box.innerHTML = resultados.map(r => `
        <div class="dropdown-item sugestao"
             data-pagina="${r.pagina}"
             data-nome="${r.nome}">
            ${r.nome} <small class="text-secondary">(${r.recurso})</small>
        </div>
    `).join("");

    box.classList.add("open");

    // Clique na sugestão → redireciona
    document.querySelectorAll(".sugestao").forEach(item => {
        item.addEventListener("click", () => {
            window.location.href = `${item.dataset.pagina}?busca=${item.dataset.nome}`;
        });
    });
}



// ------------------------------------------------------------------
// Listener principal da barra de busca global
// Cria dropdown automaticamente se não existe
// ------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {

    const input = document.getElementById("input-busca-global");
    if (!input) return;

    // Se o dropdown ainda não existe, cria dinamicamente
    if (!document.getElementById("dropdownSugestoes")) {
        const b = document.createElement("div");
        b.id = "dropdownSugestoes";
        b.className = "dropdown-busca";
        input.parentElement.appendChild(b);
    }

    // Atualiza sugestões conforme digita
    input.addEventListener("input", e => {
        mostrarDropdown(e.target.value);
    });

    // Ao clicar fora vai fechar dropdown
    document.addEventListener("click", e => {
        if (!e.target.closest(".dropdown-busca") &&
            !e.target.closest("#input-busca-global")) {
            document.getElementById("dropdownSugestoes").classList.remove("open");
        }
    });
});



// ------------------------------------------------------------------
// Inicialização geral da página
// 1. Detecta página (ex.: filmes.html)
// 2. Carrega o recurso correspondente
// 3. Aplica filtro (se houver ?busca=)
// 4. Gera os cards dinamicamente
// ------------------------------------------------------------------
async function iniciar() {

    const pagina = obterPaginaAtual();
    const recurso = MAPA_PAGINAS[pagina];

    if (!recurso) return;

    const dados = await carregarDadosSWAPI(recurso);

    const filtrados = filtrarLista(dados);

    const container = document.getElementById("lista");
    container.innerHTML = "";

    filtrados.forEach(item => criarCard(item, container, recurso));
}

iniciar();
