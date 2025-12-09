// main.js - ROUTER E UTILITÁRIOS GLOBAIS (FINAL)

// CONFIGURAÇÕES GLOBAIS
const SUPABASE_BASE_URL = 'https://qazjyzqptdcnuezllbpr.supabase.co/storage/v1/object/public/connection/'; 
const ANIMATION_DURATION = 1500; 
window.currentPlayingAudio = null; 

// Mapeamento de Módulos para Arquivos E FUNÇÃO DE INICIALIZAÇÃO GLOBAL
const MODULOS_MAP = {
    'Picture Description': { path: './modules/picture_description.js', initFunc: 'iniciarModuloPictureDescription' },
    'Story Time': { path: './modules/story_time.js', initFunc: 'iniciarModuloStoryTime' },
    'Grammar Practice': { path: './modules/grammar_practice.js', initFunc: 'iniciarModuloGrammarPractice' },
    'Quiz': { path: './modules/quiz.js', initFunc: 'iniciarModuloQuiz' },
    'Extra Audios': { path: './modules/extra_audios.js', initFunc: 'iniciarModuloExtraAudios' }, 
};

// --- UTILS DE URL E STRINGS ---

function generateSupabaseUrl(caminhoArquivo) {
    caminhoArquivo = String(caminhoArquivo).trim();
    if (caminhoArquivo.startsWith('http')) {
        return caminhoArquivo;
    }
    return SUPABASE_BASE_URL + encodeURIComponent(caminhoArquivo);
}

function getFiltrosDaUrl() {
    const params = new URLSearchParams(window.location.search);
    return {
        fkbooks: params.get('fkbooks'),
        fkunidades: params.get('fkunidades'),
        subunidades: params.get('subunidades'),
        lessons: params.get('lessons'),
        uuid: params.get('uuid') 
    };
}

function limparStringResposta(str) {
    if (!str) return '';
    return String(str)
        .replace(/[\u00A0\s]/g, ' ') 
        .replace(/[.,;?!]/g, '')
        .trim()
        .toUpperCase();
}


// --- UTILS DE FEEDBACK E MODAL ---

function showExplanation(explanationText) {
    const modalOverlay = document.getElementById('explanation-modal-overlay');
    const modal = document.getElementById('explanation-modal');
    const explanationDiv = document.getElementById('explanation-text');
    
    if (explanationDiv) explanationDiv.innerText = explanationText;
    
    if (modalOverlay && modal) {
        modalOverlay.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    }
}

function hideExplanation() {
    const modalOverlay = document.getElementById('explanation-modal-overlay');
    const modal = document.getElementById('explanation-modal');

    if (modal) modal.classList.remove('show');
    
    setTimeout(() => {
        if (modalOverlay) modalOverlay.style.display = 'none';
    }, 300);
}

function pauseAllAudios() {
    const mainAudioPlayer = document.getElementById('audio-player');
    if (mainAudioPlayer && !mainAudioPlayer.paused) {
        mainAudioPlayer.pause();
    }

    if (window.currentPlayingAudio) {
        window.currentPlayingAudio.pause();
        const playBtn = document.querySelector(`button[data-audio-url="${window.currentPlayingAudio.src}"]`);
        if (playBtn) playBtn.innerHTML = '▶️';
        window.currentPlayingAudio = null;
    }
}

function showFeedback(acertou, questaoAtual) {
    const overlay = document.getElementById('feedback-overlay');
    const successBox = document.getElementById('feedback-success');
    const failureBox = document.getElementById('feedback-failure');

    if (!overlay || !successBox || !failureBox) return;

    successBox.classList.remove('show');
    failureBox.classList.remove('show');

    if (acertou) {
        failureBox.style.display = 'none'; 
        successBox.style.display = 'block'; 
    } else {
        successBox.style.display = 'none'; 
        failureBox.style.display = 'block'; 
    }

    overlay.style.display = 'flex';

    setTimeout(() => {
        if (acertou) {
            successBox.classList.add('show');
        } else {
            failureBox.classList.add('show');
        }
    }, 10); 

    setTimeout(() => {
        successBox.classList.remove('show');
        failureBox.classList.remove('show');

        setTimeout(() => {
            overlay.style.display = 'none';
        
            successBox.style.display = 'block';
            failureBox.style.display = 'block';

            if (!acertou && questaoAtual && questaoAtual.explanation) {
                const moduloAtual = questaoAtual.lessons;
                if (moduloAtual === 'Story Time' || moduloAtual === 'Grammar Practice') {
                    showExplanation(questaoAtual.explanation);
                }
            }
        }, 400); 

    }, ANIMATION_DURATION);
}


// --- FUNÇÃO CENTRAL DE SELEÇÃO DE ALTERNATIVA ---
function selecionarAlternativaGenerica(textoAlternativa, questaoAtual) {
    
    const containerAlternativas = document.getElementById('alternativas-container');
    if (containerAlternativas.classList.contains('alternativas-bloqueadas')) {
        return;
    }

    pauseAllAudios();
    
    let respostaParaComparar;
    
    const altIsMedia = String(textoAlternativa).toLowerCase().endsWith('.mp3') || String(textoAlternativa).startsWith('http');
    
    if (altIsMedia) {
        respostaParaComparar = String(textoAlternativa).trim().toUpperCase();
    } else {
        respostaParaComparar = limparStringResposta(textoAlternativa);
    }
    
    containerAlternativas.classList.add('alternativas-bloqueadas'); 

    if (!questaoAtual) return; 

    const respostaCorretaRaw = questaoAtual.resposta; 
    
    let respostaCorreta;
    const respIsMedia = String(respostaCorretaRaw).toLowerCase().endsWith('.mp3') || String(respostaCorretaRaw).startsWith('http');
    
    if (respIsMedia) {
        respostaCorreta = String(respostaCorretaRaw).trim().toUpperCase(); 
    } else {
        respostaCorreta = limparStringResposta(respostaCorretaRaw);
    }
    
    const acertou = respostaParaComparar === respostaCorreta; 

    const filtros = getFiltrosDaUrl();
    const idAluno = filtros.uuid;
    const idQuestao = questaoAtual.id; 
    const pontuacaoMaxima = questaoAtual.pontuacao || 0; 
    const pontuacaoFinal = acertou ? pontuacaoMaxima : 0;
    
    if (idAluno && idQuestao) {
        // Chamada para a função global
        window.salvarResposta(idAluno, idQuestao, textoAlternativa, pontuacaoFinal);
    } else {
        console.warn("Não foi possível salvar a resposta: ID do Aluno ou ID da Questão ausente.");
    }

    document.querySelectorAll('.alternativa-btn').forEach(btn => {
        
        const btnValueRaw = btn.getAttribute('data-value');
        if (!btnValueRaw) return; 

        let btnTextoLimpo;
        
        const btnIsMedia = String(btnValueRaw).toLowerCase().endsWith('.mp3') || String(btnValueRaw).startsWith('http');
        
        if (btnIsMedia) {
             btnTextoLimpo = String(btnValueRaw).trim().toUpperCase();
        } else {
            btnTextoLimpo = limparStringResposta(btnValueRaw);
        }

        btn.classList.remove('acertou', 'errou', 'correta');
        
        if (btnTextoLimpo === respostaParaComparar) { 
            if (acertou) {
                btn.classList.add('acertou');
            } else {
                btn.classList.add('errou');
            }
        }
        
        if (!acertou && btnTextoLimpo === respostaCorreta) {
            btn.classList.add('correta'); 
        }
    });
    
    showFeedback(acertou, questaoAtual);

    document.getElementById('btn-proxima-questao').disabled = false;
}


// --- LÓGICA DO ROUTER (INIT) ---

// FUNÇÃO DE INICIALIZAÇÃO DA PÁGINA (ROUTER)
window.onload = async function() {
    
    const closeBtn = document.getElementById('close-explanation-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', hideExplanation);
    }
    
    const filtros = getFiltrosDaUrl();
    const lesson = filtros.lessons;
    const tituloElement = document.getElementById('titulo-modulo');
    
    if (!lesson) {
        tituloElement.innerText = "Erro: Parâmetro 'lessons' não encontrado na URL.";
        console.error("Faltam filtros obrigatórios na URL.");
        return;
    }

    const moduloInfo = MODULOS_MAP[lesson]; // 🛑 Agora usa o mapa completo com path e nome da função
    
    if (moduloInfo) {
        tituloElement.innerText = `Carregando lição: ${lesson}...`;
        
        try {
            // A importação dinâmica continua sendo usada para carregar o script
            const module = await import(moduloInfo.path);
            
            // CRÍTICO: CHAMA A FUNÇÃO GLOBAL PELO NOME DEFINIDO NO MAPA
            const initFunction = window[moduloInfo.initFunc]; 

            if (typeof initFunction === 'function') {
                initFunction(); // Chama a função global correta
            } else {
                tituloElement.innerText = `Erro: Função de inicialização '${moduloInfo.initFunc}' não encontrada no escopo global.`;
                console.error(`Erro: Função de inicialização '${moduloInfo.initFunc}' não encontrada.`);
            }
            
        } catch (e) {
            tituloElement.innerText = `Erro ao carregar o script do módulo '${lesson}'.`;
            console.error(`Falha ao importar ${moduloInfo.path}:`, e);
        }
        
    } else {
        tituloElement.innerText = `Erro: Módulo '${lesson}' desconhecido.`;
    }
};

// CRÍTICO: Torna as funções de utilidade globais para que os módulos possam usá-las.
window.generateSupabaseUrl = generateSupabaseUrl;
window.getFiltrosDaUrl = getFiltrosDaUrl;
window.limparStringResposta = limparStringResposta;
window.showExplanation = showExplanation;
window.hideExplanation = hideExplanation;
window.pauseAllAudios = pauseAllAudios;
window.showFeedback = showFeedback;
window.selecionarAlternativaGenerica = selecionarAlternativaGenerica;