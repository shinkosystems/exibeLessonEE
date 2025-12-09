// modules/quiz.js - CORRIGIDO (Removido 'import' e usando funções globais)

let questaoAtual = null;

function carregarQuiz(questao) {
    document.getElementById('texto-enunciado').innerText = questao.qztitulo || questao.titulo || "";

    const imgElement = document.getElementById('imagem-principal-bg');
    if (questao.qzimagem && imgElement) { 
        imgElement.src = generateSupabaseUrl(questao.qzimagem);
        imgElement.style.display = 'block'; 
    } else if (imgElement) {
        imgElement.style.display = 'none'; 
    }

    const audioElementPergunta = document.getElementById('audio-player');
    if (questao.qzaudiopergunta && audioElementPergunta) {
        audioElementPergunta.src = generateSupabaseUrl(questao.qzaudiopergunta);
        audioElementPergunta.style.display = 'block'; 
    } else if (audioElementPergunta) {
        audioElementPergunta.style.display = 'none';
    }

    const containerAlternativas = document.getElementById('alternativas-container');
    containerAlternativas.innerHTML = ''; // Limpeza adicional

    // CRÍTICO: Sugestão de correção para JSON string na coluna OPCOES
    let alternativas = questao.opcoes;
    let titulos = questao.titulosaudios;

    if (typeof alternativas === 'string') {
        try { alternativas = JSON.parse(alternativas); } catch (e) { alternativas = null; }
    }
    if (typeof titulos === 'string') {
        try { titulos = JSON.parse(titulos); } catch (e) { titulos = null; }
    }
    
    if (alternativas && Array.isArray(alternativas)) { 
        const titulosValidos = (titulos && Array.isArray(titulos)) ? titulos : [];
        
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
                // Alternativa de Áudio
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

                // Botão de Seleção
                const selectButton = document.createElement('button');
                selectButton.className = 'audio-select-btn'; 
                const tituloExibido = (titulosValidos[index] && titulosValidos[index].trim() !== '') ? titulosValidos[index].trim() : textoOpcao;
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
    
    // CORREÇÃO VISUAL
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
        
        carregarQuiz(questaoAtual); 

    } else {
        document.getElementById('app-container').innerHTML = '<h1>Module Completed!</h1><p>Congratulations!</p>';
        if (btnProxima) btnProxima.style.display = 'none';
    }
}

/**
 * Ponto de entrada para o Router (main.js)
 */
window.iniciarModuloQuiz = async function() {
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