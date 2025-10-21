// main.js - VERSÃO COMPLETA COM MÓDULO EXTRA AUDIOS E CORREÇÕES

// IMPORTAÇÃO CORRIGIDA: getProximaQuestao -> getQuestaoAtual
import { carregarTodasQuestoes, getQuestaoAtual, avancarQuestaoNaLista, supabase, isLastQuestion } from './supabase_client.js';

let respostaSelecionada = null;
let questaoAtual = null; 
// Variável global para rastrear o áudio que está tocando
window.currentPlayingAudio = null; 

const ANIMATION_DURATION = 1500; 

// URL BASE DO SUPABASE
const SUPABASE_BASE_URL = 'https://qazjyzqptdcnuezllbpr.supabase.co/storage/v1/object/public/connection/'; 

// FUNÇÃO UTILITÁRIA PARA GERAR O URL LIMPO
function generateSupabaseUrl(caminhoArquivo) {
    caminhoArquivo = String(caminhoArquivo).trim();
    if (caminhoArquivo.startsWith('http')) {
        return caminhoArquivo;
    }
    return SUPABASE_BASE_URL + encodeURIComponent(caminhoArquivo);
}

// 1. Mapeamento de Módulos (ATUALIZADO)
const MODULOS_RENDER = {
    'Picture Description': carregarPictureDescription,
    'Story Time': carregarStoryTime,
    'Grammar Practice': carregarGrammarPractice,
    'Quiz': carregarQuiz,
    'Extra Audios': gerarExtraAudios, // NOVO MÓDULO INTEGRADO
};

// 2. Função Utilitária para extrair TODOS os parâmetros de filtro da URL
function getFiltrosDaUrl() {
    const params = new URLSearchParams(window.location.search);
    return {
        fkbooks: params.get('fkbooks'),
        fkunidades: params.get('fkunidades'),
        subunidades: params.get('subunidades'),
        lessons: params.get('lessons') 
    };
}

// ** Funções de Feedback **
function showFeedback(acertou) {
    const overlay = document.getElementById('feedback-overlay');
    const successBox = document.getElementById('feedback-success');
    const failureBox = document.getElementById('feedback-failure');

    if (!overlay || !successBox || !failureBox) return;

    successBox.classList.remove('show');
    failureBox.classList.remove('show');

    overlay.style.display = 'flex';

    if (acertou) {
        successBox.classList.add('show');
    } else {
        failureBox.classList.add('show');
    }
    
    // Oculta o feedback após a animação
    setTimeout(() => {
        overlay.style.display = 'none';
        successBox.classList.remove('show');
        failureBox.classList.remove('show');
        
        // NOVO: Chama o popup de explicação APÓS o feedback de erro sumir
        if (!acertou) {
             const moduloAtual = questaoAtual ? questaoAtual.lessons : '';
             if (moduloAtual === 'Story Time' || moduloAtual === 'Grammar Practice') {
                 if (questaoAtual.explanation) {
                     showExplanation(questaoAtual.explanation);
                 }
             }
        }
    }, ANIMATION_DURATION);
}

// NOVO: Funções de Explicação
function showExplanation(explanationText) {
    const modalOverlay = document.getElementById('explanation-modal-overlay');
    const modal = document.getElementById('explanation-modal');
    const explanationDiv = document.getElementById('explanation-text');
    
    if (explanationDiv) explanationDiv.innerText = explanationText;
    
    if (modalOverlay && modal) {
        modalOverlay.style.display = 'flex';
        // Pequeno delay para garantir que a transição CSS de "show" seja aplicada
        setTimeout(() => modal.classList.add('show'), 10);
    }
}

function hideExplanation() {
    const modalOverlay = document.getElementById('explanation-modal-overlay');
    const modal = document.getElementById('explanation-modal');

    if (modal) modal.classList.remove('show');
    
    // Oculta o overlay após a animação de saída
    setTimeout(() => {
        if (modalOverlay) modalOverlay.style.display = 'none';
    }, 300); // 300ms para permitir que a transição CSS termine
}


// FUNÇÃO DE LIMPEZA UNIVERSAL
function limparStringResposta(str) {
    if (!str) return '';
    // Remove caracteres de pontuação e substitui TODOS os espaços em branco (incluindo &nbsp; / 160) por um único espaço
    return String(str)
        .replace(/[\u00A0\s]/g, ' ') 
        .replace(/[.,;?!]/g, '')
        .trim()
        .toUpperCase();
}


// ** Função para selecionar, verificar e dar feedback AUTOMATICAMENTE **
window.selecionarAlternativa = function(textoAlternativa) {
    if (respostaSelecionada !== null) {
        return;
    }
    
    // Pausa qualquer áudio que esteja tocando ao selecionar uma resposta
    if (window.currentPlayingAudio) {
        window.currentPlayingAudio.pause();
        const playBtn = document.querySelector(`button[data-audio-url="${window.currentPlayingAudio.src}"]`);
        if (playBtn) playBtn.innerHTML = '▶️';
        window.currentPlayingAudio = null;
    }
    
    let respostaParaComparar;
    
    // Lógica de limpeza para URL ou Texto
    if (String(textoAlternativa).toLowerCase().endsWith('.mp3') || String(textoAlternativa).startsWith('http')) {
        respostaParaComparar = String(textoAlternativa).trim().toUpperCase();
    } else {
        respostaParaComparar = limparStringResposta(textoAlternativa);
    }
    
    respostaSelecionada = respostaParaComparar; 
    
    const containerAlternativas = document.getElementById('alternativas-container');
    containerAlternativas.classList.add('alternativas-bloqueadas'); 

    if (!questaoAtual) return; 

    const respostaCorretaRaw = questaoAtual.resposta; 
    
    let respostaCorreta;
    if (String(respostaCorretaRaw).toLowerCase().endsWith('.mp3') || String(respostaCorretaRaw).startsWith('http')) {
        respostaCorreta = String(respostaCorretaRaw).trim().toUpperCase(); 
    } else {
        respostaCorreta = limparStringResposta(respostaCorretaRaw);
    }
    
    const acertou = respostaSelecionada === respostaCorreta; 

    document.querySelectorAll('.alternativa-btn').forEach(btn => {
        
        const btnValueRaw = btn.getAttribute('data-value');
        if (!btnValueRaw) return; 

        let btnTextoLimpo;
        
        if (String(btnValueRaw).toLowerCase().endsWith('.mp3') || String(btnValueRaw).startsWith('http')) {
             btnTextoLimpo = String(btnValueRaw).trim().toUpperCase();
        } else {
            btnTextoLimpo = limparStringResposta(btnValueRaw);
        }

        btn.classList.remove('selected', 'acertou', 'errou', 'correta');
        
        // 1. Marca a seleção do usuário
        if (btnTextoLimpo === respostaSelecionada) { 
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
    
    // showFeedback lida com a exibição do explanation, se necessário
    showFeedback(acertou);

    document.getElementById('btn-proxima-questao').disabled = false;
}

// 3. Função central para exibir a questão ATUAL
function exibirQuestaoAtual() {
    respostaSelecionada = null;
    
    const btnProxima = document.getElementById('btn-proxima-questao');
    if (btnProxima) {
        btnProxima.disabled = true; 
        btnProxima.style.display = 'block'; 
        btnProxima.onclick = window.avancarQuiz; 
    }

    // Resetar mídia
    const imagemElement = document.getElementById('imagem-principal-bg');
    if (imagemElement) {
        imagemElement.style.display = 'none';
        imagemElement.src = ''; 
    }
    
    const audioElement = document.getElementById('audio-player');
    if (audioElement) {
        audioElement.style.display = 'none';
        audioElement.src = '';
    }
    
    questaoAtual = getQuestaoAtual(); 
    
    const containerAlternativas = document.getElementById('alternativas-container');
    containerAlternativas.innerHTML = ''; 
    containerAlternativas.classList.remove('alternativas-bloqueadas'); 
    
    // NOVO: Ocultar o contêiner específico do Extra Audios se não for o módulo
    const extraAudiosContainer = document.getElementById('extra-audios-questions-container');
    if (extraAudiosContainer) {
        extraAudiosContainer.style.display = 'none';
    }

    const overlay = document.getElementById('feedback-overlay');
    if (overlay) overlay.style.display = 'none';


    if (questaoAtual) {
        
        let isLast = false;
        if (typeof isLastQuestion === 'function') {
            isLast = isLastQuestion();
        }

        if (btnProxima) {
            btnProxima.innerText = isLast ? 'Finish Questionnaire' : 'Next Question';
        }
        
        const moduloAtual = questaoAtual.lessons; 
        const renderFunction = MODULOS_RENDER[moduloAtual];
        
        if (renderFunction) {
            renderFunction(questaoAtual); 
            document.getElementById('titulo-modulo').innerText = questaoAtual.lessons; 
        } else {
            document.getElementById('titulo-modulo').innerText = `Erro: Módulo '${moduloAtual}' não possui função de renderização definida.`;
        }
    } else {
        document.getElementById('app-container').innerHTML = '<h1>Módulo Concluído!</h1><p>Parabéns!</p>';
        if (btnProxima) btnProxima.style.display = 'none';
    }
} 

// ** Função para AVANÇAR o Quiz **
window.avancarQuiz = function() {
    // Garante que o modal esteja fechado antes de avançar
    hideExplanation();
    if (typeof avancarQuestaoNaLista === 'function') {
        avancarQuestaoNaLista();
    }
    
    exibirQuestaoAtual();
}

// 5. FUNÇÃO DE INICIALIZAÇÃO DA PÁGINA 
window.onload = async function() {
    const btnProxima = document.getElementById('btn-proxima-questao');
    if (btnProxima) {
        btnProxima.onclick = window.avancarQuiz; 
    }
    
    // NOVO: Adiciona listener ao botão de fechar a explicação
    const closeBtn = document.getElementById('close-explanation-btn');
    if (closeBtn) {
        closeBtn.onclick = hideExplanation;
    }

    const filtros = getFiltrosDaUrl();
    const tituloElement = document.getElementById('titulo-modulo');
    
    if (!filtros.lessons || !filtros.fkbooks || !filtros.fkunidades || !filtros.subunidades) {
        tituloElement.innerText = "Erro: Parâmetros obrigatórios incompletos na URL.";
        console.error(`Faltam filtros na URL. Recebidos: ${JSON.stringify(filtros)}`);
        return;
    }
    
    tituloElement.innerText = `Carregando lição ${filtros.lessons}...`;
    
    const carregadoComSucesso = await carregarTodasQuestoes(filtros);
    
    if (carregadoComSucesso) {
        exibirQuestaoAtual();
    } else {
        tituloElement.innerText = `Nenhuma questão encontrada com os filtros: ${filtros.lessons} (${filtros.fkbooks}, etc.).`;
    }
};


// 6. FUNÇÕES DE RENDERIZAÇÃO ESPECÍFICAS DE CADA MÓDULO 

function carregarPictureDescription(questao) {
    
    document.getElementById('texto-enunciado').innerText = questao.pctitulo || "Enunciado não encontrado.";

    const imgElement = document.getElementById('imagem-principal-bg');
    if (questao.pcimagem && imgElement) {
        imgElement.src = generateSupabaseUrl(questao.pcimagem);
        imgElement.style.display = 'block';
    } else if(imgElement) {
        imgElement.style.display = 'none';
        imgElement.src = ''; 
    }

    const containerAlternativas = document.getElementById('alternativas-container');
    
    if (questao.opcoes && Array.isArray(questao.opcoes)) { 
        const alternativas = questao.opcoes; 
        
        alternativas.forEach((texto, index) => {
            const button = document.createElement('button');
            button.className = 'alternativa-btn audio-option-wrapper'; 
            
            const textoOpcao = texto.trim(); 
            button.innerText = textoOpcao; 
            
            button.setAttribute('data-value', textoOpcao); 
            button.onclick = (event) => window.selecionarAlternativa(textoOpcao); 
            containerAlternativas.appendChild(button);
        });
    } else {
        containerAlternativas.innerHTML = '<p style="color: red;">Erro: Formato da coluna OPCOES inválido ou vazio.</p>';
    }
}

function carregarStoryTime(questao) {
    document.getElementById('texto-enunciado').innerText = questao.sttitulo || "Conteúdo da história não encontrado.";

    const imgElement = document.getElementById('imagem-principal-bg');
    if (questao.stimagem && imgElement) {
        imgElement.src = generateSupabaseUrl(questao.stimagem);
        imgElement.style.display = 'block';
    } else if(imgElement) {
        imgElement.style.display = 'none';
        imgElement.src = ''; 
    }

    const audioElement = document.getElementById('audio-player');
    if (questao.staudio && audioElement) {
        audioElement.src = generateSupabaseUrl(questao.staudio);
        audioElement.style.display = 'block';
    } else {
        audioElement.style.display = 'none';
        audioElement.src = '';
    }

    const containerAlternativas = document.getElementById('alternativas-container');
    
    if (questao.opcoes && Array.isArray(questao.opcoes)) { 
        const alternativas = questao.opcoes; 
        
        alternativas.forEach((texto, index) => {
            const button = document.createElement('button');
            button.className = 'alternativa-btn audio-option-wrapper';
            
            const textoOpcao = texto.trim(); 
            button.innerText = textoOpcao; 
            
            button.setAttribute('data-value', textoOpcao); 
            button.onclick = (event) => window.selecionarAlternativa(textoOpcao); 
            containerAlternativas.appendChild(button);
        });
    } else {
        containerAlternativas.innerHTML = '<p style="color: red;">Erro: Formato da coluna OPCOES inválido ou vazio.</p>';
    }
}

function carregarGrammarPractice(questao) {
    document.getElementById('texto-enunciado').innerText = questao.titulo || "Conteúdo de gramática não encontrado.";

    const imgElement = document.getElementById('imagem-principal-bg');
    
    if (questao.gpimagem && imgElement) {
        imgElement.src = generateSupabaseUrl(questao.gpimagem);
        imgElement.style.display = 'block'; 
    } else if (imgElement) {
        imgElement.style.display = 'none'; 
        imgElement.src = ''; 
    }

    const audioElement = document.getElementById('audio-player');
    
    if (questao.gpaudio && audioElement) {
        audioElement.src = generateSupabaseUrl(questao.gpaudio);
        audioElement.style.display = 'block'; 
    } else if (audioElement) {
        audioElement.style.display = 'none';
        audioElement.src = ''; 
    }

    const containerAlternativas = document.getElementById('alternativas-container');
    
    if (questao.opcoes && Array.isArray(questao.opcoes)) { 
        const alternativas = questao.opcoes; 
        
        alternativas.forEach((texto, index) => {
            const button = document.createElement('button');
            button.className = 'alternativa-btn audio-option-wrapper';
            
            const textoOpcao = texto.trim(); 
            button.innerText = textoOpcao; 
            
            button.setAttribute('data-value', textoOpcao); 
            button.onclick = (event) => window.selecionarAlternativa(textoOpcao); 
            containerAlternativas.appendChild(button);
        });
    } else {
        containerAlternativas.innerHTML = '<p style="color: red;">Erro: Formato da coluna OPCOES inválido ou vazio.</p>';
    }
}


// ***************************************************************
// FUNÇÃO CRÍTICA DE QUIZ MODIFICADA PARA NOVO UX E DADOS
// ***************************************************************
function carregarQuiz(questao) {
    document.getElementById('texto-enunciado').innerText = questao.qztitulo || questao.titulo || "Conteúdo do quiz não encontrado.";

    // 1. Lógica da Imagem 
    const imgElement = document.getElementById('imagem-principal-bg');
    if (questao.qzimagem && imgElement) { 
        imgElement.src = generateSupabaseUrl(questao.qzimagem);
        imgElement.style.display = 'block'; 
    } else if (imgElement) {
        imgElement.style.display = 'none'; 
        imgElement.src = ''; 
    }

    // 2. Lógica do Áudio da Pergunta 
    const audioElementPergunta = document.getElementById('audio-player');
    if (questao.qzaudiopergunta && audioElementPergunta) {
        audioElementPergunta.src = generateSupabaseUrl(questao.qzaudiopergunta);
        audioElementPergunta.style.display = 'block'; 
    } else if (audioElementPergunta) {
        audioElementPergunta.style.display = 'none';
        audioElementPergunta.src = ''; 
    }

    // 3. Renderização das Alternativas
    const containerAlternativas = document.getElementById('alternativas-container');
    
    if (questao.opcoes && Array.isArray(questao.opcoes)) { 
        const alternativas = questao.opcoes; 
        
        // NOVO: Pega a coluna de títulos (usada como máscara)
        const titulos = (questao.titulosaudios && Array.isArray(questao.titulosaudios)) ? questao.titulosaudios : [];
        
        // Garantir que não haja áudio tocando ao carregar
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
            button.className = 'alternativa-btn';
            
            // CRÍTICO: data-value SEMPRE recebe a URL do áudio (ou texto da opção se não for áudio)
            button.setAttribute('data-value', textoOpcao); 

            if (isAudioOpcao) {
                // Alternativa de Áudio (Dois Botões na mesma row)
                
                button.classList.add('audio-row-container'); 

                const audioUrl = generateSupabaseUrl(textoOpcao);
                
                // Elemento de áudio real (oculto)
                const audioPlayer = document.createElement('audio');
                audioPlayer.src = audioUrl;
                audioPlayer.setAttribute('crossorigin', 'anonymous');
                audioPlayer.style.display = 'none'; 
                button.appendChild(audioPlayer);

                // --- 1. Botão de Play/Pause ---
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

                // --- 2. Botão de Seleção (Título, à direita) ---
                const selectButton = document.createElement('button');
                selectButton.className = 'audio-select-btn'; 
                
                // CRÍTICO: Usa o valor da coluna 'titulosaudios' para o texto exibido.
                const tituloExibido = (titulos[index] && titulos[index].trim() !== '') ? titulos[index].trim() : textoOpcao;
                selectButton.innerText = tituloExibido; 
                
                selectButton.onclick = (event) => {
                    event.stopPropagation();
                    // CRÍTICO: Passa o VALOR REAL DA RESPOSTA (URL/textoOpcao) para a função de seleção
                    window.selecionarAlternativa(textoOpcao); 
                };
                
                button.appendChild(selectButton);
                button.onclick = null; 

            } else {
                // Estrutura de Alternativa de Texto (Mantida)
                button.className = 'alternativa-btn audio-option-wrapper';
                button.innerText = textoOpcao; 
                button.onclick = (event) => window.selecionarAlternativa(textoOpcao); 
            }
            
            containerAlternativas.appendChild(button);
        });
    } else {
        containerAlternativas.innerHTML = '<p style="color: red;">Erro: Formato da coluna OPCOES inválido ou vazio.</p>';
    }
}

function gerarExtraAudios(questao) {
    // 1. Ocultar o contêiner de alternativas normais e garantir que o contêiner específico esteja disponível
    const alternativasContainer = document.getElementById('alternativas-container');
    if (alternativasContainer) {
        alternativasContainer.innerHTML = '';
        alternativasContainer.style.display = 'none'; // Oculta o contêiner padrão
    }

    const extraAudiosContainer = document.getElementById('extra-audios-questions-container');
    if (!extraAudiosContainer) {
        document.getElementById('texto-enunciado').innerText = 'Erro: Contêiner "extra-audios-questions-container" não encontrado no HTML.';
        return;
    }

    document.getElementById('texto-enunciado').innerText = 'Listen and select the question you want to answer:';

    // 2. Configurar Áudio Principal
    const audioElement = document.getElementById('audio-player');
    if (questao.audio && audioElement) {
        audioElement.src = generateSupabaseUrl(questao.audio);
        audioElement.style.display = 'block';
    } else {
        audioElement.style.display = 'none';
        audioElement.src = '';
    }

    // 3. Renderizar os 4 Botões
    extraAudiosContainer.style.display = 'flex'; // Torna visível
    extraAudiosContainer.innerHTML = ''; // Limpa conteúdo anterior

    const questions = [
        { index: 1, title: 'Question 1' },
        { index: 2, title: 'Question 2' },
        { index: 3, title: 'Question 3' },
        { index: 4, title: 'Question 4' },
    ];

    questions.forEach(q => {
        const button = document.createElement('button');
        button.className = 'extra-audio-question-btn'; 
        button.innerText = q.title; 
        
        // Função de manipulação para a sub-questão (a ser definida globalmente)
        button.onclick = () => window.selecionarSubQuestao(q.index);
        
        extraAudiosContainer.appendChild(button);
    });
    
    // 4. Desabilitar botão de Próxima Questão
    const btnProxima = document.getElementById('btn-proxima-questao');
    if (btnProxima) {
        btnProxima.disabled = true;
    }
}


// main.js - IMPLEMENTAÇÃO DA LÓGICA DE SUB-QUESTÃO

/**
 * Lógica para alternar a interface e exibir as alternativas para a sub-questão selecionada.
 * A questão atual (questaoAtual) é um registro da extraaudiostable, contendo todas as 4 respostas.
 * * @param {number} questaoIndex - O índice da sub-questão selecionada (1, 2, 3 ou 4).
 */
window.selecionarSubQuestao = function(questaoIndex) {
    if (!questaoAtual) {
        console.error("Erro: Nenhuma questão atual carregada.");
        return;
    }
    
    // 1. Ocultar o contêiner dos 4 botões e mostrar o contêiner de alternativas
    document.getElementById('extra-audios-questions-container').style.display = 'none';
    const alternativasContainer = document.getElementById('alternativas-container');
    alternativasContainer.style.display = 'flex'; // Torna o container padrão visível
    alternativasContainer.innerHTML = ''; // Limpa o conteúdo

    // 2. Determinar os dados da sub-questão
    const respostaCorretaKey = `q${questaoIndex}_resposta`;
    const explanationKey = `q${questaoIndex}_explanation`;
    
    const respostaCorreta = questaoAtual[respostaCorretaKey];
    const explanation = questaoAtual[explanationKey] || 'Nenhuma explicação disponível.';
    
    // Supondo que as opções de múltipla escolha para esta sub-questão
    // estão em uma coluna chamada `qX_opcoes` (Esta coluna precisaria existir na sua tabela)
    // Se não houver coluna de opções, vamos simular:
    // **NOTA CRÍTICA:** Se a coluna qX_opcoes não existir, você precisa defini-la no Supabase.
    // Usaremos as colunas 'opcoes_alternativas' da estrutura geral para simular,
    // mas o ideal é que a extraaudiostable tenha q1_opcoes, q2_opcoes, etc.
    
    // Exemplo Simulado: Assumindo que a resposta correta é a única opção por enquanto
    const opcoes = [
        respostaCorreta,
        "Opção Incorreta A",
        "Opção Incorreta B",
        "Opção Incorreta C"
    ];
    // Para simplificar, esta implementação assume que as 4 opções de resposta estão hardcoded ou disponíveis
    // fora da questão (o que não é o caso). O código real dependeria de qX_opcoes.
    
    // Apenas para demonstração, vamos apenas permitir a seleção da resposta correta
    // e setar a explicação para esta sub-questão, usando a resposta do banco de dados como a única opção.

    // ************* IMPLEMENTAÇÃO PROVISÓRIA *************
    document.getElementById('texto-enunciado').innerText = `Select the answer for Question ${questaoIndex}:`;
    
    // 3. Renderizar as Alternativas de Múltipla Escolha
    opcoes.sort(() => Math.random() - 0.5); // Embaralha as opções (simulado)

    opcoes.forEach(textoOpcao => {
        const button = document.createElement('button');
        button.className = 'alternativa-btn audio-option-wrapper';
        
        const texto = String(textoOpcao).trim(); 
        button.innerText = texto; 
        
        button.setAttribute('data-value', texto); 
        
        // Chamada adaptada à função de verificação existente (window.selecionarAlternativa)
        button.onclick = (event) => {
            // Simula a verificação de resposta, mas agora para a sub-questão.
            // Aqui você precisaria adaptar 'window.selecionarAlternativa' para usar a resposta da sub-questão,
            // ou criar uma nova função (selecionarSubAlternativa).

            // Para manter a compatibilidade com a estrutura, vamos simular:
            console.log(`Verificando resposta: ${texto} vs ${respostaCorreta}`);
            
            // Lógica de verificação **SIMPLIFICADA** (Você deve expandir window.selecionarAlternativa)
            const acertou = limparStringResposta(texto) === limparStringResposta(respostaCorreta);
            
            if (acertou) {
                 button.classList.add('acertou');
                 showFeedback(true);
            } else {
                 button.classList.add('errou');
                 // Marcar a correta (simulação)
                 document.querySelectorAll('.alternativa-btn').forEach(btn => {
                     if (limparStringResposta(btn.getAttribute('data-value')) === limparStringResposta(respostaCorreta)) {
                         btn.classList.add('correta');
                     }
                 });
                 showFeedback(false);
                 setTimeout(() => showExplanation(explanation), 2000); // Chama a explicação da sub-questão
            }
            
            // Bloquear os botões após a tentativa
            document.querySelectorAll('.alternativa-btn').forEach(btn => btn.disabled = true);
        };
        alternativasContainer.appendChild(button);
    });
    
    // O botão de próxima questão deve permanecer desabilitado até que todas as 4 sub-questões sejam resolvidas.
    document.getElementById('btn-proxima-questao').disabled = true;

    // Você precisará de uma nova função para voltar aos 4 botões após fechar a explicação.
    // Esta lógica é complexa e exige rastrear quais das 4 questões foram respondidas.
};