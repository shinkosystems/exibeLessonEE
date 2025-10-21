// main.js - VERSÃO FINAL 2.0: CORREÇÃO DE URL MANUAL PARA SUPABASE (BLOCKED_BY_ORB)

// IMPORTAÇÃO CORRIGIDA: Inclui a função isLastQuestion
// Mantemos 'supabase' na importação, mas o usaremos menos para URLs
import { carregarTodasQuestoes, getProximaQuestao, avancarQuestaoNaLista, supabase, isLastQuestion } from './supabase_client.js';

let respostaSelecionada = null;
let questaoAtual = null; 

const ANIMATION_DURATION = 1500; 

// URL BASE DO SUPABASE - É CRÍTICO QUE ESTE ESTEJA CORRETO
// Você pode obter esta base em: Settings > API > URL, e adicionar o resto manualmente.
const SUPABASE_BASE_URL = 'https://qazjyzqptdcnuezllbpr.supabase.co/storage/v1/object/public/connection/'; 

// FUNÇÃO UTILITÁRIA PARA GERAR O URL LIMPO
function generateSupabaseUrl(caminhoArquivo) {
    caminhoArquivo = String(caminhoArquivo).trim();
    if (caminhoArquivo.startsWith('http')) {
        // Se já for um URL completo (erro de BD), use-o.
        return caminhoArquivo;
    }
    
    // Constrói o URL Limpo e Seguro
    // Usamos encodeURIComponent para garantir que caminhos com espaços ou caracteres especiais funcionem
    return SUPABASE_BASE_URL + encodeURIComponent(caminhoArquivo);
}

// 1. Mapeamento de Módulos (MANTIDO)
const MODULOS_RENDER = {
    'Picture Description': carregarPictureDescription,
    'Story Time': carregarStoryTime,
    'Grammar Practice': carregarGrammarPractice,
    'Quiz': carregarQuiz,
};

// 2. Função Utilitária para extrair TODOS os parâmetros de filtro da URL (MANTIDO)
function getFiltrosDaUrl() {
    const params = new URLSearchParams(window.location.search);
    return {
        fkbooks: params.get('fkbooks'),
        fkunidades: params.get('fkunidades'),
        subunidades: params.get('subunidades'),
        lessons: params.get('lessons') 
    };
}

// ** Funções de Feedback (MANTIDO) **
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
    
    setTimeout(() => {
        overlay.style.display = 'none';
        successBox.classList.remove('show');
        failureBox.classList.remove('show');
    }, ANIMATION_DURATION);
}


// ** Função para selecionar, verificar e dar feedback AUTOMATICAMENTE (MANTIDO) **
window.selecionarAlternativa = function(textoAlternativa) {
    if (respostaSelecionada !== null) {
        return;
    }
    
    respostaSelecionada = String(textoAlternativa)
        .replace(/[.,;]/g, '')
        .replace(/\s/g, ' ') 
        .trim()
        .toUpperCase();
    
    const containerAlternativas = document.getElementById('alternativas-container');
    containerAlternativas.classList.add('alternativas-bloqueadas'); 

    if (!questaoAtual) return; 

    const respostaCorretaRaw = questaoAtual.resposta; 
    
    const respostaCorreta = String(respostaCorretaRaw)
        .replace(/[.,;]/g, '') 
        .replace(/\s/g, ' ') 
        .trim()     
        .toUpperCase();     
    
    const acertou = respostaSelecionada === respostaCorreta; 

    document.querySelectorAll('.alternativa-btn').forEach(btn => {
        // Para áudios, o btn.innerText não funciona; precisamos do textoOpcao.
        // Já limpamos o texto selecionado e o correto, então o código de feedback precisa 
        // ser um pouco mais flexível para o Quiz.
        
        // Pega o valor real da alternativa (texto ou caminho do arquivo)
        const btnValueRaw = btn.getAttribute('data-value');
        if (!btnValueRaw) return; // Se não tiver data-value, ignora

        const btnTextoLimpo = String(btnValueRaw)
            .replace(/[.,;]/g, '')
            .replace(/\s/g, ' ')
            .trim()
            .toUpperCase();
        
        btn.classList.remove('selected', 'acertou', 'errou', 'correta');
        
        // Marca a seleção do usuário
        if (btnTextoLimpo === respostaSelecionada) { 
            if (acertou) {
                btn.classList.add('acertou');
            } else {
                btn.classList.add('errou');
            }
        }
        
        // Se errou, marca a correta
        if (!acertou && btnTextoLimpo === respostaCorreta) {
            btn.classList.add('correta'); 
        }
    });

    console.log("------------------- DEBUG CRÍTICO DE RESPOSTA -------------------");
    console.log(`Resposta Selecionada (Texto Limpo/Upper): '${respostaSelecionada}'`);
    console.log(`Resposta Correta do Supabase (Texto Limpo/Upper): '${respostaCorreta}'`);
    console.log(`ACERTOU: ${acertou}`);
    console.log("-----------------------------------------------------------------");
    
    showFeedback(acertou);

    document.getElementById('btn-proxima-questao').disabled = false;
}

// 3. Função central para exibir a questão ATUAL (MANTIDO)
function exibirQuestaoAtual() {
    respostaSelecionada = null;
    
    const btnProxima = document.getElementById('btn-proxima-questao');
    if (btnProxima) {
        btnProxima.disabled = true; 
        btnProxima.style.display = 'block'; 
        btnProxima.onclick = window.avancarQuiz; 
    }

    // Resetar imagem
    const imagemElement = document.getElementById('imagem-principal-bg');
    if (imagemElement) {
        imagemElement.style.display = 'none';
        imagemElement.src = ''; 
    }
    
    // Resetar áudio (pergunta/enunciado)
    const audioElement = document.getElementById('audio-player');
    if (audioElement) {
        audioElement.style.display = 'none';
        audioElement.src = '';
    }
    
    questaoAtual = getProximaQuestao(); 
    
    const containerAlternativas = document.getElementById('alternativas-container');
    containerAlternativas.innerHTML = ''; 
    containerAlternativas.classList.remove('alternativas-bloqueadas'); 

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

// ** Função para AVANÇAR o Quiz ** (MANTIDO)
window.avancarQuiz = function() {
    if (typeof avancarQuestaoNaLista === 'function') {
        avancarQuestaoNaLista();
    }
    
    exibirQuestaoAtual();
}

// 5. FUNÇÃO DE INICIALIZAÇÃO DA PÁGINA (MANTIDO)
window.onload = async function() {
    // ... (restante da função onload) ...
    const btnProxima = document.getElementById('btn-proxima-questao');
    if (btnProxima) {
        btnProxima.onclick = window.avancarQuiz; 
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

// MÓDULO: Picture Description (APENAS URL CORRIGIDA)
function carregarPictureDescription(questao) {
    
    document.getElementById('texto-enunciado').innerText = questao.pctitulo || "Enunciado não encontrado.";

    const imgElement = document.getElementById('imagem-principal-bg');
    
    if (questao.pcimagem && imgElement) {
        // *** NOVO: Usa a função utilitária generateSupabaseUrl ***
        imgElement.src = generateSupabaseUrl(questao.pcimagem);
        imgElement.style.display = 'block';

    } else if(imgElement) {
        imgElement.style.display = 'none';
        imgElement.src = ''; 
    }

    // Renderização das Alternativas (MANTIDO - APENAS ADICIONANDO data-value)
    const containerAlternativas = document.getElementById('alternativas-container');
    
    if (questao.opcoes && Array.isArray(questao.opcoes)) { 
        const alternativas = questao.opcoes; 
        
        alternativas.forEach((texto, index) => {
            const button = document.createElement('button');
            button.className = 'alternativa-btn';
            
            const textoOpcao = texto.trim(); 
            button.innerText = textoOpcao; 
            
            button.setAttribute('data-value', textoOpcao); // NOVO: Para feedback
            button.onclick = (event) => window.selecionarAlternativa(textoOpcao); 
            containerAlternativas.appendChild(button);
        });
    } else {
        containerAlternativas.innerHTML = '<p style="color: red;">Erro: Formato da coluna OPCOES inválido ou vazio.</p>';
    }
}

// MÓDULO: Story Time (APENAS URL CORRIGIDA)
function carregarStoryTime(questao) {
    document.getElementById('texto-enunciado').innerText = questao.sttitulo || "Conteúdo da história não encontrado.";

    const imgElement = document.getElementById('imagem-principal-bg');
    if (questao.stimagem && imgElement) {
        // *** NOVO: Usa a função utilitária generateSupabaseUrl ***
        imgElement.src = generateSupabaseUrl(questao.stimagem);
        imgElement.style.display = 'block';

    } else if(imgElement) {
        imgElement.style.display = 'none';
        imgElement.src = ''; 
    }

    const audioElement = document.getElementById('audio-player');
    if (questao.staudio && audioElement) {
        // *** NOVO: Usa a função utilitária generateSupabaseUrl ***
        audioElement.src = generateSupabaseUrl(questao.staudio);
        audioElement.style.display = 'block';
    } else {
        audioElement.style.display = 'none';
        audioElement.src = '';
    }

    // Renderização das Alternativas (MANTIDO - APENAS ADICIONANDO data-value)
    const containerAlternativas = document.getElementById('alternativas-container');
    
    if (questao.opcoes && Array.isArray(questao.opcoes)) { 
        const alternativas = questao.opcoes; 
        
        alternativas.forEach((texto, index) => {
            const button = document.createElement('button');
            button.className = 'alternativa-btn';
            
            const textoOpcao = texto.trim(); 
            button.innerText = textoOpcao; 
            
            button.setAttribute('data-value', textoOpcao); // NOVO: Para feedback
            button.onclick = (event) => window.selecionarAlternativa(textoOpcao); 
            containerAlternativas.appendChild(button);
        });
    } else {
        containerAlternativas.innerHTML = '<p style="color: red;">Erro: Formato da coluna OPCOES inválido ou vazio.</p>';
    }
}

// MÓDULO: Grammar Practice (APENAS URL CORRIGIDA)
function carregarGrammarPractice(questao) {
    document.getElementById('texto-enunciado').innerText = questao.gmtitulo || "Conteúdo de gramática não encontrado.";

    const imgElement = document.getElementById('imagem-principal-bg');
    
    if (questao.gpimagem && imgElement) {
        // *** NOVO: Usa a função utilitária generateSupabaseUrl ***
        imgElement.src = generateSupabaseUrl(questao.gpimagem);
        imgElement.style.display = 'block'; 
    } else if (imgElement) {
        imgElement.style.display = 'none'; 
        imgElement.src = ''; 
    }

    const audioElement = document.getElementById('audio-player');
    
    if (questao.gpaudio && audioElement) {
        // *** NOVO: Usa a função utilitária generateSupabaseUrl ***
        audioElement.src = generateSupabaseUrl(questao.gpaudio);
        audioElement.style.display = 'block'; 
    } else if (audioElement) {
        audioElement.style.display = 'none';
        audioElement.src = ''; 
    }

    // Renderização das Alternativas (MANTIDO - APENAS ADICIONANDO data-value)
    const containerAlternativas = document.getElementById('alternativas-container');
    
    if (questao.opcoes && Array.isArray(questao.opcoes)) { 
        const alternativas = questao.opcoes; 
        
        alternativas.forEach((texto, index) => {
            const button = document.createElement('button');
            button.className = 'alternativa-btn';
            
            const textoOpcao = texto.trim(); 
            button.innerText = textoOpcao; 
            
            button.setAttribute('data-value', textoOpcao); // NOVO: Para feedback
            button.onclick = (event) => window.selecionarAlternativa(textoOpcao); 
            containerAlternativas.appendChild(button);
        });
    } else {
        containerAlternativas.innerHTML = '<p style="color: red;">Erro: Formato da coluna OPCOES inválido ou vazio.</p>';
    }
}


// MÓDULO: Quiz (APENAS URL CORRIGIDA E MELHORIA NO FEEDBACK)
function carregarQuiz(questao) {
    document.getElementById('texto-enunciado').innerText = questao.qztitulo || questao.titulo || "Conteúdo do quiz não encontrado.";

    // 1. Lógica da Imagem (Coluna 'qzimagem')
    const imgElement = document.getElementById('imagem-principal-bg');
    
    if (questao.qzimagem && imgElement) { 
        // *** NOVO: Usa a função utilitária generateSupabaseUrl ***
        imgElement.src = generateSupabaseUrl(questao.qzimagem);
        imgElement.style.display = 'block'; 
    } else if (imgElement) {
        imgElement.style.display = 'none'; 
        imgElement.src = ''; 
    }

    // 2. Lógica do Áudio da Pergunta (Coluna 'qzaudiopergunta')
    const audioElementPergunta = document.getElementById('audio-player');
    
    if (questao.qzaudiopergunta && audioElementPergunta) {
        // *** NOVO: Usa a função utilitária generateSupabaseUrl ***
        audioElementPergunta.src = generateSupabaseUrl(questao.qzaudiopergunta);
        audioElementPergunta.style.display = 'block'; 
    } else if (audioElementPergunta) {
        audioElementPergunta.style.display = 'none';
        audioElementPergunta.src = ''; 
    }

    // 3. Renderização das Alternativas (Colunas 'opcoes' e 'resposta')
    const containerAlternativas = document.getElementById('alternativas-container');
    
    if (questao.opcoes && Array.isArray(questao.opcoes)) { 
        const alternativas = questao.opcoes; 
        
        alternativas.forEach((texto, index) => {
            const textoOpcao = texto.trim(); 
            const isAudioOpcao = textoOpcao.toLowerCase().endsWith('.mp3');

            const button = document.createElement('button');
            button.className = 'alternativa-btn';
            
            // NOVO: Adiciona o valor da alternativa para uso no feedback e seleção
            button.setAttribute('data-value', textoOpcao); 

            if (isAudioOpcao) {
                // *** NOVO: Usa a função utilitária generateSupabaseUrl ***
                const audioUrl = generateSupabaseUrl(textoOpcao);

                // MANTIDO: Adiciona crossorigin="anonymous" (melhor prática de segurança)
                const playerHtml = `
                    <div class="audio-option-wrapper">
                        <audio controls src="${audioUrl}" crossorigin="anonymous" style="width: 100%;"></audio>
                        <span class="audio-filename-label" style="display: block; margin-top: 5px;">${textoOpcao}</span>
                    </div>
                `;
                button.innerHTML = playerHtml;
                
            } else {
                button.innerText = textoOpcao; 
            }
            
            button.onclick = (event) => {
                // Permite o clique APENAS no botão, ignorando o clique no player de áudio nativo
                if (event.target.tagName === 'AUDIO' || event.target.tagName === 'SOURCE' || event.target.closest('audio')) {
                    return; 
                }
                window.selecionarAlternativa(textoOpcao); 
            };
            
            containerAlternativas.appendChild(button);
        });
    } else {
        containerAlternativas.innerHTML = '<p style="color: red;">Erro: Formato da coluna OPCOES inválido ou vazio.</p>';
    }
}