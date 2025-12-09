// modules/story_time.js - CORRIGIDO (Removido 'import' e usando funções globais)

// Funções agora são acessadas como variáveis globais:
// getQuestaoAtual, avancarQuestaoNaLista, isLastQuestion, generateSupabaseUrl, 
// getFiltrosDaUrl, selecionarAlternativaGenerica, hideExplanation, carregarTodasQuestoes

let questaoAtual = null;

function carregarStoryTime(questao) {
    document.getElementById('texto-enunciado').innerText = questao.sttitulo || "Conteúdo da história não encontrado.";

    const imgElement = document.getElementById('imagem-principal-bg');
    if (questao.stimagem && imgElement) {
        imgElement.src = generateSupabaseUrl(questao.stimagem);
        imgElement.style.display = 'block';
    } else {
        imgElement.style.display = 'none'; 
    }

    const audioElement = document.getElementById('audio-player');
    if (questao.staudio && audioElement) {
        audioElement.src = generateSupabaseUrl(questao.staudio);
        audioElement.style.display = 'block';
    } else {
        audioElement.style.display = 'none';
    }

    const containerAlternativas = document.getElementById('alternativas-container');
    containerAlternativas.innerHTML = ''; // Limpeza adicional
    
    // CRÍTICO: Sugestão de correção para JSON string (Se necessário, você pode implementar o try/catch de JSON.parse aqui)
    let opcoes = questao.opcoes;
    if (typeof opcoes === 'string') {
        try { opcoes = JSON.parse(opcoes); } catch (e) { opcoes = null; }
    }
    
    if (opcoes && Array.isArray(opcoes)) { 
        opcoes.forEach((texto) => {
            const button = document.createElement('button');
            button.className = 'alternativa-btn audio-option-wrapper';
            const textoOpcao = texto.trim(); 
            button.innerText = textoOpcao; 
            
            button.setAttribute('data-value', textoOpcao); 
            // Usando a função global
            button.onclick = () => selecionarAlternativaGenerica(textoOpcao, questaoAtual); 
            containerAlternativas.appendChild(button);
        });
    } else {
        containerAlternativas.innerHTML = '<p style="color: red;">Erro: Formato da coluna OPCOES inválido ou vazio.</p>';
    }
}

function avancarQuiz() {
    hideExplanation();
    avancarQuestaoNaLista();
    exibirQuestaoAtual();
}

function exibirQuestaoAtual() {
    const btnProxima = document.getElementById('btn-proxima-questao');
    if (btnProxima) {
        btnProxima.disabled = true; 
        btnProxima.style.display = 'block'; 
        btnProxima.onclick = avancarQuiz; 
    }
    
    // CORREÇÃO VISUAL: Limpar extra-audios-questions-container ao entrar no módulo
    document.getElementById('extra-audios-questions-container').style.display = 'none';
    document.getElementById('imagem-principal-bg').style.display = 'none';
    document.getElementById('audio-player').style.display = 'none';
    const containerAlternativas = document.getElementById('alternativas-container');
    containerAlternativas.innerHTML = ''; 
    containerAlternativas.classList.remove('alternativas-bloqueadas'); 

    questaoAtual = getQuestaoAtual(); 
    
    if (questaoAtual) {
        const isLast = isLastQuestion();
        if (btnProxima) {
            btnProxima.innerText = isLast ? 'Finish Questionnaire' : 'Next Question';
        }
        document.getElementById('titulo-modulo').innerText = questaoAtual.lessons; 
        carregarStoryTime(questaoAtual); 
    } else {
        document.getElementById('app-container').innerHTML = '<h1>Module Completed!</h1><p>Congratulations!</p>';
        if (btnProxima) btnProxima.style.display = 'none';
    }
}

/**
 * Ponto de entrada para o Router (main.js)
 * Agora é definido como uma função global para ser chamado pelo main.js (import dinâmico).
 */
window.iniciarModuloStoryTime = async function() {
    const closeBtn = document.getElementById('close-explanation-btn');
    if (closeBtn) {
        closeBtn.onclick = hideExplanation;
    }

    const filtros = getFiltrosDaUrl();
    const tituloElement = document.getElementById('titulo-modulo');
    
    if (!filtros.lessons || !filtros.fkbooks || !filtros.fkunidades || !filtros.subunidades) {
        tituloElement.innerText = "Erro: Parâmetros obrigatórios incompletos na URL.";
        return;
    }
    
    tituloElement.innerText = `Carregando lição ${filtros.lessons}...`;
    
    const carregadoComSucesso = await carregarTodasQuestoes(filtros);
    
    if (carregadoComSucesso) {
        exibirQuestaoAtual();
    } else {
        tituloElement.innerText = `Nenhuma questão encontrada com os filtros.`;
    }
}