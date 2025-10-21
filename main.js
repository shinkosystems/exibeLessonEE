// main.js - VERSÃO FINAL: Feedback CSS, Imagem Corrigida (Duplicação de URL e Tag IMG)

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


// ** Função para selecionar, verificar e dar feedback AUTOMATICAMENTE **
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
        const btnTextoCompleto = btn.innerText; 
        
        const btnTextoLimpo = String(btnTextoCompleto)
            .replace(/[.,;]/g, '')
            .replace(/\s/g, ' ')
            .trim()
            .toUpperCase();
        
        btn.classList.remove('selected', 'acertou', 'errou', 'correta');
        
        if (btnTextoCompleto === textoAlternativa) { 
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

    console.log("------------------- DEBUG CRÍTICO DE RESPOSTA -------------------");
    console.log(`Resposta Selecionada (Texto Limpo/Upper): '${respostaSelecionada}'`);
    console.log(`Resposta Correta do Supabase (Texto Limpo/Upper): '${respostaCorreta}'`);
    console.log(`ACERTOU: ${acertou}`);
    console.log("-----------------------------------------------------------------");
    
    showFeedback(acertou);

    document.getElementById('btn-proxima-questao').disabled = false;
}


// 3. Função central para exibir a questão ATUAL (NÃO AVANÇA O ÍNDICE)
function exibirQuestaoAtual() {
    respostaSelecionada = null;
    
    const btnProxima = document.getElementById('btn-proxima-questao');
    if (btnProxima) {
        btnProxima.disabled = true; 
        btnProxima.style.display = 'block'; 
        btnProxima.onclick = window.avancarQuiz; 
    }

    const imagemElement = document.getElementById('imagem-principal-bg');
    if (imagemElement) {
        imagemElement.style.display = 'none';
        // CRÍTICO: Limpa a imagem anterior, já que não é background-image
        imagemElement.src = ''; 
    }
    
    const audioElement = document.getElementById('audio-player');
    if (audioElement) audioElement.style.display = 'none';
    
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
            console.log(`Questão (lessons: ${moduloAtual}) carregada com sucesso. ID: ${questaoAtual.id}`);
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

// MÓDULO: Picture Description (AGORA USA img.src)
function carregarPictureDescription(questao) {
    
    document.getElementById('texto-enunciado').innerText = questao.pctitulo || "Enunciado não encontrado.";

    // Lógica da Imagem (usando a coluna 'pcimagem')
    const imgElement = document.getElementById('imagem-principal-bg');
    
    if (questao.pcimagem && imgElement) {
        let nomeArquivoRaw = String(questao.pcimagem).trim(); 
        let finalUrl;

        // Verifica se é um URL completo ou apenas o nome do arquivo (Correção da duplicação de URL)
        if (nomeArquivoRaw.startsWith('http')) {
            finalUrl = nomeArquivoRaw;
        } else {
            const { data: publicUrl } = supabase.storage.from('connection').getPublicUrl(nomeArquivoRaw);
            finalUrl = publicUrl.publicUrl;
        }
        
        // *** CRÍTICO: Usa .src para a tag IMG ***
        imgElement.src = finalUrl; 
        imgElement.style.display = 'block';

        console.log(`URL da Imagem Carregada (FINAL): ${finalUrl}`); 

    } else if(imgElement) {
        imgElement.style.display = 'none';
        imgElement.src = ''; 
        console.log("A coluna 'pcimagem' está vazia ou não existe.");
    }

    // Renderização das Alternativas (usando a coluna 'opcoes')
    const containerAlternativas = document.getElementById('alternativas-container');
    
    if (questao.opcoes && Array.isArray(questao.opcoes)) { 
        const alternativas = questao.opcoes; 
        
        alternativas.forEach((texto, index) => {
            const button = document.createElement('button');
            button.className = 'alternativa-btn';
            
            const textoOpcao = texto.trim(); 
            button.innerText = textoOpcao; 
            
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