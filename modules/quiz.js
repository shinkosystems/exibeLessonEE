// modules/quiz.js (APENAS MÓDULO QUIZ PADRÃO)

import { carregarTodasQuestoes, getQuestaoAtual, avancarQuestaoNaLista, isLastQuestion } from '../supabase_client.js'; 
import { generateSupabaseUrl, getFiltrosDaUrl, selecionarAlternativaGenerica, hideExplanation } from '../main.js'; 

let questaoAtual = null;

// RENDERIZAÇÃO PRINCIPAL DO QUIZ PADRÃO
function carregarQuiz(questao) {
    document.getElementById('texto-enunciado').innerText = questao.qztitulo || questao.titulo || "";

    // 1. Lógica da Imagem 
    const imgElement = document.getElementById('imagem-principal-bg');
    if (questao.qzimagem && imgElement) { 
        imgElement.src = generateSupabaseUrl(questao.qzimagem);
        imgElement.style.display = 'block'; 
    } else if (imgElement) {
        imgElement.style.display = 'none'; 
    }

    // 2. Lógica do Áudio da Pergunta 
    const audioElementPergunta = document.getElementById('audio-player');
    if (questao.qzaudiopergunta && audioElementPergunta) {
        audioElementPergunta.src = generateSupabaseUrl(questao.qzaudiopergunta);
        audioElementPergunta.style.display = 'block'; 
    } else if (audioElementPergunta) {
        audioElementPergunta.style.display = 'none';
    }

    // 3. Renderização das Alternativas
    const containerAlternativas = document.getElementById('alternativas-container');
    
    if (questao.opcoes && Array.isArray(questao.opcoes)) { 
        const alternativas = questao.opcoes; 
        const titulos = (questao.titulosaudios && Array.isArray(questao.titulosaudios)) ? questao.titulosaudios : [];
        
        // Garante que não haja áudio tocando ao carregar
        if (window.currentPlayingAudio) {
            window.currentPlayingAudio.pause();
            const playBtn = document.querySelector(`button[data-audio-url="${window.currentPlayingAudio.src}"]`);
            if (playBtn) playBtn.innerHTML = '▶️';
            window.currentPlayingAudio = null;
        }

        alternativas.forEach((urlAudio, index) => {
            const textoOpcao = urlAudio.trim(); 
            const isAudioOpcao = textoOpcao.toLowerCase().endsWith('.mp3');

            const button = document.createElement('button');
            button.setAttribute('data-value', textoOpcao); 

            if (isAudioOpcao) {
                // Alternativa de Áudio (Dois Botões na mesma row)
                button.className = 'alternativa-btn audio-row-container'; 
                const audioUrl = generateSupabaseUrl(textoOpcao);
                const audioPlayer = document.createElement('audio');
                audioPlayer.src = audioUrl;
                audioPlayer.setAttribute('crossorigin', 'anonymous');
                audioPlayer.style.display = 'none'; 
                button.appendChild(audioPlayer);

                // Botão Play/Pause
                const playButton = document.createElement('button');
                playButton.className = 'audio-control-btn'; 
                playButton.innerHTML = '▶️'; 
                playButton.setAttribute('data-audio-url', audioPlayer.src); 
                
                playButton.onclick = (event) => {
                    event.stopPropagation();
                    if (audioPlayer.paused) {
                        if (window.currentPlayingAudio && window.currentPlayingAudio !== audioPlayer) {
                            window.currentPlayingAudio.pause();
                            const otherBtn = document.querySelector(`button[data-audio-url="${window.currentPlayingAudio.src}"]`);
                            if (otherBtn) otherBtn.innerHTML = '▶️';
                        }
                        audioPlayer.play();
                        playButton.innerHTML = '⏸️'; 
                        window.currentPlayingAudio = audioPlayer;
                    } else {
                        audioPlayer.pause();
                        playButton.innerHTML = '▶️'; 
                        window.currentPlayingAudio = null;
                    }
                };
                audioPlayer.onended = () => {
                    playButton.innerHTML = '▶️';
                    window.currentPlayingAudio = null;
                };
                button.appendChild(playButton); 

                // Botão de Seleção (Título)
                const selectButton = document.createElement('button');
                selectButton.className = 'audio-select-btn'; 
                const tituloExibido = (titulos[index] && titulos[index].trim() !== '') ? titulos[index].trim() : textoOpcao;
                selectButton.innerText = tituloExibido; 
                
                selectButton.onclick = (event) => {
                    event.stopPropagation();
                    selecionarAlternativaGenerica(textoOpcao, questaoAtual); 
                };
                button.appendChild(selectButton);
                button.onclick = null; 

            } else {
                // Alternativa de Texto
                button.className = 'alternativa-btn audio-option-wrapper';
                button.innerText = textoOpcao; 
                button.onclick = () => selecionarAlternativaGenerica(textoOpcao, questaoAtual); 
            }
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
    
    // Limpeza de componentes
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
        
        // Chamada AGORA é APENAS para o Quiz Padrão
        carregarQuiz(questaoAtual); 

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