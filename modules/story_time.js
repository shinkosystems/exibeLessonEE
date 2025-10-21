// modules/story_time.js

import { carregarTodasQuestoes, getQuestaoAtual, avancarQuestaoNaLista, isLastQuestion } from '../supabase_client.js'; 
import { generateSupabaseUrl, getFiltrosDaUrl, selecionarAlternativaGenerica, hideExplanation } from '../main.js'; 

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
    
    if (questao.opcoes && Array.isArray(questao.opcoes)) { 
        questao.opcoes.forEach((texto) => {
            const button = document.createElement('button');
            button.className = 'alternativa-btn audio-option-wrapper';
            const textoOpcao = texto.trim(); 
            button.innerText = textoOpcao; 
            
            button.setAttribute('data-value', textoOpcao); 
            button.onclick = () => selecionarAlternativaGenerica(textoOpcao, questaoAtual); 
            containerAlternativas.appendChild(button);
        });
    } else {
        containerAlternativas.innerHTML = '<p style="color: red;">Erro: Formato da coluna OPCOES inválido ou vazio.</p>';
    }
}

// Lógica de navegação
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
        document.getElementById('app-container').innerHTML = '<h1>Módulo Concluído!</h1><p>Parabéns!</p>';
        if (btnProxima) btnProxima.style.display = 'none';
    }
}

/**
 * Ponto de entrada para o Router (main.js)
 */
export async function iniciarModulo() {
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