// main.js - VERSÃO FINAL: Feedback CSS, Lógica de Imagem Corrigida

// IMPORTAÇÃO CORRIGIDA: Inclui a função isLastQuestion
import { carregarTodasQuestoes, getProximaQuestao, avancarQuestaoNaLista, supabase, isLastQuestion } from './supabase_client.js';

let respostaSelecionada = null;
let questaoAtual = null; 

// Duração da animação em milissegundos
const ANIMATION_DURATION = 1500; 

// 1. Mapeamento de Módulos
const MODULOS_RENDER = {
    'Picture Description': carregarPictureDescription,
    'Story Time': carregarStoryTime,
    'Grammar Practice': carregarGrammarPractice,
    'Quiz': carregarQuiz,
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

// ** Funções de Feedback (Lógica CSS Simples) **
function showFeedback(acertou) {
    const overlay = document.getElementById('feedback-overlay');
    const successBox = document.getElementById('feedback-success');
    const failureBox = document.getElementById('feedback-failure');

    if (!overlay || !successBox || !failureBox) return;

    // Garante que a caixa anterior está limpa
    successBox.classList.remove('show');
    failureBox.classList.remove('show');

    // 1. Torna a sobreposição visível
    overlay.style.display = 'flex';

    // 2. Aciona a animação CSS
    if (acertou) {
        successBox.classList.add('show');
    } else {
        failureBox.classList.add('show');
    }
    
    // 3. Esconde tudo após a duração
    setTimeout(() => {
        overlay.style.display = 'none';
        successBox.classList.remove('show');
        failureBox.classList.remove('show');
    }, ANIMATION_DURATION);
}


// ** Função para selecionar, verificar e dar feedback AUTOMATICAMENTE **
window.selecionarAlternativa = function(textoAlternativa) {
    // 1. Bloqueio Imediato: Se a resposta já foi dada, ignora o clique.
    if (respostaSelecionada !== null) {
        return;
    }
    
    // Armazena a seleção como o TEXTO DA ALTERNATIVA (ex: "water.)
    // Limpeza agressiva do texto selecionado (remove pontuação, espaços, padroniza para maiúscula)
    respostaSelecionada = String(textoAlternativa)
        .replace(/[.,;]/g, '')
        .replace(/\s/g, ' ') 
        .trim()
        .toUpperCase();
    
    const containerAlternativas = document.getElementById('alternativas-container');
    containerAlternativas.classList.add('alternativas-bloqueadas'); 

    // 2. Lógica de Acerto/Erro e Feedback
    if (!questaoAtual) return; 

    // BUSCA NA COLUNA 'resposta'
    const respostaCorretaRaw = questaoAtual.resposta; 
    
    // Limpeza Agressiva do valor do Supabase (remove pontuação, espaços, padroniza para maiúscula)
    const respostaCorreta = String(respostaCorretaRaw)
        .replace(/[.,;]/g, '') 
        .replace(/\s/g, ' ') 
        .trim()     
        .toUpperCase();     
    
    // A comparação agora é feita entre os TEXTOS das opções LIMPOS e MAIÚSCULOS
    const acertou = respostaSelecionada === respostaCorreta; 

    document.querySelectorAll('.alternativa-btn').forEach(btn => {
        // Pega o texto completo do botão (ex: "water.")
        const btnTextoCompleto = btn.innerText; 
        
        // Limpa o texto do botão para comparação com a resposta correta
        const btnTextoLimpo = String(btnTextoCompleto)
            .replace(/[.,;]/g, '')
            .replace(/\s/g, ' ')
            .trim()
            .toUpperCase();
        
        // Remove qualquer estado de seleção anterior
        btn.classList.remove('selected', 'acertou', 'errou', 'correta');
        
        if (btnTextoCompleto === textoAlternativa) { 
            // Alternativa que o usuário clicou.
            if (acertou) {
                btn.classList.add('acertou');
            } else {
                btn.classList.add('errou');
            }
        }
        
        // Se errou, marca a correta
        if (!acertou && btnTextoLimpo === respostaCorreta) {
            btn.classList.add('correta'); // Marca a resposta correta de verde
        }
    });

    console.log("------------------- DEBUG CRÍTICO DE RESPOSTA -------------------");
    console.log(`Resposta Selecionada (Texto Limpo/Upper): '${respostaSelecionada}'`);
    console.log(`Resposta Correta do Supabase (Texto Limpo/Upper): '${respostaCorreta}'`);
    console.log(`ACERTOU: ${acertou}`);
    console.log("-----------------------------------------------------------------");
    
    // NOVO: Aciona o feedback CSS
    showFeedback(acertou);

    // 3. Habilitar o botão de avançar
    document.getElementById('btn-proxima-questao').disabled = false;
}


// 3. Função central para exibir a questão ATUAL (NÃO AVANÇA O ÍNDICE)
function exibirQuestaoAtual() {
    // Resetar estado
    respostaSelecionada = null;
    
    const btnProxima = document.getElementById('btn-proxima-questao');
    if (btnProxima) {
        btnProxima.disabled = true; // Botão desabilitado no início
        btnProxima.style.display = 'block'; 
        btnProxima.onclick = window.avancarQuiz; 
    }

    const imagemElement = document.getElementById('imagem-principal-bg');
    if (imagemElement) {
        imagemElement.style.display = 'none';
        imagemElement.style.backgroundImage = 'none';
    }
    
    const audioElement = document.getElementById('audio-player');
    if (audioElement) audioElement.style.display = 'none';
    
    // LÊ a questão atual SEM avançar o índice
    questaoAtual = getProximaQuestao(); 
    
    const containerAlternativas = document.getElementById('alternativas-container');
    containerAlternativas.innerHTML = ''; 
    containerAlternativas.classList.remove('alternativas-bloqueadas'); // Desbloqueia as alternativas

    // NOVO: Garante que a sobreposição de feedback está escondida
    const overlay = document.getElementById('feedback-overlay');
    if (overlay) overlay.style.display = 'none';


    if (questaoAtual) {
        
        // Define o texto do botão com base se é a última questão
        let isLast = false;
        if (typeof isLastQuestion === 'function') {
            isLast = isLastQuestion();
        }

        if (btnProxima) {
            // Define o texto solicitado: "Finish Questionnaire" ou "Next Question"
            btnProxima.innerText = isLast ? 'Finish Questionnaire' : 'Next Question';
        }
        
        const moduloAtual = questaoAtual.lessons; 
        const renderFunction = MODULOS_RENDER[moduloAtual];
        
        if (renderFunction) {
            renderFunction(questaoAtual); 
            document.getElementById('titulo-modulo').innerText = questaoAtual.lessons; 
            console.log(`Questão (lessons: ${moduloAtual}) carregada com sucesso. ID: ${questaoAtual.id}`);
        } else {
            document.getElementById('titulo-modulo').innerText = `Erro: Módulo '${moduloAtual}' não possui função de renderização definida.`;
        }
    } else {
        document.getElementById('app-container').innerHTML = '<h1>Módulo Concluído!</h1><p>Parabéns!</p>';
        if (btnProxima) btnProxima.style.display = 'none';
    }
} 


// ** Função para AVANÇAR o Quiz (Chamada APENAS pelo clique do botão) **
window.avancarQuiz = function() {
    // 1. AVANÇA O ÍNDICE
    if (typeof avancarQuestaoNaLista === 'function') {
        avancarQuestaoNaLista();
    }
    
    // 2. Exibe a próxima questão (que agora é a atual)
    exibirQuestaoAtual();
}

// 5. FUNÇÃO DE INICIALIZAÇÃO DA PÁGINA
window.onload = async function() {
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

// MÓDULO: Picture Description
function carregarPictureDescription(questao) {
    
    document.getElementById('texto-enunciado').innerText = questao.pctitulo || "Enunciado não encontrado.";

    // Lógica da Imagem (usando a coluna 'pcimagem')
    const imgElement = document.getElementById('imagem-principal-bg');
    
    if (questao.pcimagem && imgElement) {
        // *** CORREÇÃO APLICADA AQUI: Removemos o .replace(/\s/g, '') ***
        // Apenas limpa espaços nas bordas. O Supabase.storage.getPublicUrl lida com espaços internos.
        let nomeArquivoRaw = String(questao.pcimagem).trim(); 
        
        const { data: publicUrl } = supabase.storage.from('connection').getPublicUrl(nomeArquivoRaw);
        const finalUrl = publicUrl.publicUrl;
        
        imgElement.style.backgroundImage = `url('${finalUrl}')`;
        imgElement.style.display = 'block';
        console.log(`URL da Imagem Carregada: ${finalUrl}`); // DEBUG

    } else if(imgElement) {
        imgElement.style.display = 'none';
        console.log("A coluna 'pcimagem' está vazia ou não existe.");
    }

    // Renderização das Alternativas (usando a coluna 'opcoes')
    const containerAlternativas = document.getElementById('alternativas-container');
    
    if (questao.opcoes && Array.isArray(questao.opcoes)) { 
        const alternativas = questao.opcoes; 
        
        alternativas.forEach((texto, index) => {
            const button = document.createElement('button');
            button.className = 'alternativa-btn';
            
            // Atribui APENAS o texto da opção, SEM a letra (A, B, C)
            const textoOpcao = texto.trim(); 
            button.innerText = textoOpcao; 
            
            // O clique agora passa o TEXTO da opção para a função de verificação
            button.onclick = (event) => window.selecionarAlternativa(textoOpcao); 
            containerAlternativas.appendChild(button);
        });
    } else {
        containerAlternativas.innerHTML = '<p style="color: red;">Erro: Formato da coluna OPCOES inválido ou vazio.</p>';
    }
}

// MÓDULO: Story Time (Exemplo)
function carregarStoryTime(questao) {
    document.getElementById('texto-enunciado').innerText = questao.sttitulo || "Conteúdo da história não encontrado.";
    const audioPlayer = document.getElementById('audio-player');
    if (questao.staudio) {
        const { data: publicUrl } = supabase.storage.from('connection').getPublicUrl(String(questao.staudio).trim());
        audioPlayer.src = publicUrl.publicUrl;
        audioPlayer.style.display = 'block';
    } else {
        audioPlayer.style.display = 'none';
    }
}

function carregarGrammarPractice(questao) {
    document.getElementById('texto-enunciado').innerText = questao.gmtitulo || "Conteúdo de gramática não encontrado.";
}

function carregarQuiz(questao) {
    document.getElementById('texto-enunciado').innerText = questao.qztitulo || "Conteúdo do quiz não encontrado.";
}