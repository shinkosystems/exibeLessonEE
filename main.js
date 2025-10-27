// main.js - ROUTER E UTILITÁRIOS EXPORTÁVEIS

// CONFIGURAÇÕES GLOBAIS
export const SUPABASE_BASE_URL = 'https://qazjyzqptdcnuezllbpr.supabase.co/storage/v1/object/public/connection/'; 
export const ANIMATION_DURATION = 1500; 
window.currentPlayingAudio = null; // Rastreia o áudio ativo para controle de UX

// --- UTILS DE URL E STRINGS ---

export function generateSupabaseUrl(caminhoArquivo) {
    caminhoArquivo = String(caminhoArquivo).trim();
    if (caminhoArquivo.startsWith('http')) {
        return caminhoArquivo;
    }
    return SUPABASE_BASE_URL + encodeURIComponent(caminhoArquivo);
}

export function getFiltrosDaUrl() {
    const params = new URLSearchParams(window.location.search);
    return {
        fkbooks: params.get('fkbooks'),
        fkunidades: params.get('fkunidades'),
        subunidades: params.get('subunidades'),
        lessons: params.get('lessons'),
        // ** ADIÇÃO DO UUID **
        uuid: params.get('uuid') 
    };
}

// CRÍTICO: Função de Limpeza (com a correção do 160)
export function limparStringResposta(str) {
    if (!str) return '';
    // ATENÇÃO: Corrigido para garantir a remoção do caractere 160 (\u00A0)
    return String(str)
        .replace(/[\u00A0\s]/g, ' ') 
        .replace(/[.,;?!]/g, '')
        .trim()
        .toUpperCase();
}


// --- UTILS DE FEEDBACK E MODAL ---

export function showExplanation(explanationText) {
    const modalOverlay = document.getElementById('explanation-modal-overlay');
    const modal = document.getElementById('explanation-modal');
    const explanationDiv = document.getElementById('explanation-text');
    
    if (explanationDiv) explanationDiv.innerText = explanationText;
    
    if (modalOverlay && modal) {
        modalOverlay.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    }
}

export function hideExplanation() {
    const modalOverlay = document.getElementById('explanation-modal-overlay');
    const modal = document.getElementById('explanation-modal');

    if (modal) modal.classList.remove('show');
    
    setTimeout(() => {
        if (modalOverlay) modalOverlay.style.display = 'none';
    }, 300);
}

// ** NOVA FUNÇÃO: Pausa todos os áudios ativos **
export function pauseAllAudios() {
    // 1. Pausa o player principal
    const mainAudioPlayer = document.getElementById('audio-player');
    if (mainAudioPlayer && !mainAudioPlayer.paused) {
        mainAudioPlayer.pause();
    }

    // 2. Pausa o áudio rastreado (de uma alternativa)
    if (window.currentPlayingAudio) {
        window.currentPlayingAudio.pause();
        // Reseta o ícone de qualquer botão de play de alternativa que possa estar ativo
        const playBtn = document.querySelector(`button[data-audio-url="${window.currentPlayingAudio.src}"]`);
        if (playBtn) playBtn.innerHTML = '▶️';
        window.currentPlayingAudio = null;
    }
}

// ** FUNÇÃO REVISADA PARA ANIMAÇÃO CENTRALIZADA E CORRETA **
export function showFeedback(acertou, questaoAtual) {
    const overlay = document.getElementById('feedback-overlay');
    const successBox = document.getElementById('feedback-success');
    const failureBox = document.getElementById('feedback-failure');

    if (!overlay || !successBox || !failureBox) return;

    // 1. Garante que os boxes não tenham a classe de animação inicialmente
    successBox.classList.remove('show');
    failureBox.classList.remove('show');

    // CRÍTICO PARA CENTRALIZAÇÃO: ESCONDE o box que NÃO será usado.
    if (acertou) {
        failureBox.style.display = 'none'; // Esconde a caixa de erro
        successBox.style.display = 'block'; // Garante que a caixa de sucesso esteja visível
    } else {
        successBox.style.display = 'none'; // Esconde a caixa de sucesso
        failureBox.style.display = 'block'; // Garante que a caixa de erro esteja visível
    }

    // 2. Mostra o overlay usando 'flex'
    overlay.style.display = 'flex';

    // 3. Adiciona a classe 'show' no box correto após um pequeno delay para que a transição funcione.
    setTimeout(() => {
        if (acertou) {
            successBox.classList.add('show');
        } else {
            failureBox.classList.add('show');
        }
    }, 10); // Atraso mínimo de 10ms

    // 4. Oculta o feedback após a duração da animação
    setTimeout(() => {
        // Primeiro remove a classe 'show' para acionar a animação de saída (scale(1) -> scale(0))
        successBox.classList.remove('show');
        failureBox.classList.remove('show');

        // Segundo: Esconde o overlay DEPOIS que a transição de saída (0.4s) tiver tempo de rodar.
        setTimeout(() => {
            overlay.style.display = 'none';
        
            // Reseta o display de ambos para 'block' (estado original)
            successBox.style.display = 'block';
            failureBox.style.display = 'block';

            // Chama o popup de explicação APÓS o feedback de erro sumir
            if (!acertou && questaoAtual && questaoAtual.explanation) {
                const moduloAtual = questaoAtual.lessons;
                if (moduloAtual === 'Story Time' || moduloAtual === 'Grammar Practice') {
                    showExplanation(questaoAtual.explanation);
                }
            }
        }, 400); // O 400ms deve ser igual ao 'transition: all 0.4s...' no style.css

    }, ANIMATION_DURATION);
}


// --- FUNÇÃO CENTRAL DE SELEÇÃO DE ALTERNATIVA ---
export function selecionarAlternativaGenerica(textoAlternativa, questaoAtual) {
    
    const containerAlternativas = document.getElementById('alternativas-container');
    if (containerAlternativas.classList.contains('alternativas-bloqueadas')) {
        return;
    }

    // CRÍTICO: Usa a nova função unificada de pausa
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

    // Lógica de feedback visual
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
        
        // 1. Marca a seleção do usuário
        if (btnTextoLimpo === respostaParaComparar) { 
            if (acertou) {
                btn.classList.add('acertou');
            } else {
                btn.classList.add('errou');
            }
        }
        
        // 2. Se errou, marca a correta
        if (!acertou && btnTextoLimpo === respostaCorreta) {
            btn.classList.add('correta'); 
        }
    });
    
    showFeedback(acertou, questaoAtual);

    document.getElementById('btn-proxima-questao').disabled = false;
}

// --- LÓGICA DO ROUTER (INIT) ---

// Mapeamento de Módulos para Arquivos
const MODULOS_MAP = {
    'Picture Description': './modules/picture_description.js',
    'Story Time': './modules/story_time.js',
    'Grammar Practice': './modules/grammar_practice.js',
    'Quiz': './modules/quiz.js',
    'Extra Audios': './modules/extra_audios.js', 
};

// FUNÇÃO DE INICIALIZAÇÃO DA PÁGINA (ROUTER)
window.onload = async function() {
    
    // Adiciona o listener para fechar o modal de explicação
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

    const scriptPath = MODULOS_MAP[lesson];
    
    if (scriptPath) {
        tituloElement.innerText = `Carregando lição: ${lesson}...`;
        
        try {
            // Importação dinâmica (o navegador faz o download e executa)
            const module = await import(scriptPath);
            
            if (typeof module.iniciarModulo === 'function') {
                module.iniciarModulo();
            } else {
                tituloElement.innerText = `Erro: Módulo '${lesson}' (${scriptPath}) não exporta 'iniciarModulo'.`;
            }
            
        } catch (e) {
            tituloElement.innerText = `Erro ao carregar o script do módulo '${lesson}'.`;
            console.error(`Falha ao importar ${scriptPath}:`, e);
        }
        
    } else {
        tituloElement.innerText = `Erro: Módulo '${lesson}' desconhecido.`;
    }
};