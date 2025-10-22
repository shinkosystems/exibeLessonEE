// modules/extra_audios.js (VERSÃO COMPLETA FINAL E ATUALIZADA)

import { supabase } from '../supabase_client.js'; 
import { generateSupabaseUrl, getFiltrosDaUrl, limparStringResposta, showFeedback } from '../main.js'; 

let listaDePerguntas = []; 
let indiceAtual = 0;
let subQuestoesCache = {}; // Cache: {idpergunta: [subquestoes]}

// ATUALIZADO: Armazena o estado de acerto/erro das sub-questões
// Formato: { idpergunta: { numeroquestao: { status: 'acertou' | 'errou', respostaSelecionada: 'Texto da Alt' } } }
let estadoRespostas = {}; 

let subQuestaoAtual = null; 
let respostasSubQuestao = null; 

// -------------------------------------------------------------
// FUNÇÕES DE BUSCA
// -------------------------------------------------------------

async function carregarDadosExtraAudios(filtros) {
    const tituloElement = document.getElementById('titulo-modulo');
    
    console.log("--- DEBUG DE FILTROS BRUTOS (início da função) ---");
    console.log(`Filtro Original URL: ${JSON.stringify(filtros)}`);
    
    try {
        const fkbooksStr = String(filtros.fkbooks || '');
        const fkunidadesStr = String(filtros.fkunidades || '');
        const subunidadesStr = String(filtros.subunidades || ''); 

        const fkbooksInt = parseInt(fkbooksStr);
        const fkunidadesInt = parseInt(fkunidadesStr);
        
        console.log("--- DEBUG DE FILTROS CONVERTIDOS ---");
        console.log(`String FKBOOKS: ${fkbooksStr}, Convertido (INT): ${fkbooksInt}`);
        console.log(`String FKUNIDADES: ${fkunidadesStr}, Convertido (INT): ${fkunidadesInt}`);
        console.log(`String SUBUNIDADES: ${subunidadesStr}, Formatado (UPPER): ${subunidadesStr.toUpperCase()}`);
        console.log("------------------------------------");
        
        if (isNaN(fkbooksInt) || isNaN(fkunidadesInt) || subunidadesStr === '') {
             console.error("Filtros de URL inválidos detectados (NaN ou string vazia).");
             tituloElement.innerText = "Erro: Parâmetros de filtro na URL estão incorretos.";
             return false;
        }

        let query = supabase
            .from('extraaudiostable')
            .select('*');

        query = query.eq('fkbooks', fkbooksInt); 
        query = query.eq('fkunidades', fkunidadesInt); 
        query = query.ilike('subunidades', subunidadesStr.toUpperCase()); 

        const { data, error } = await query
            .order('id', { ascending: true }); 
        
        console.log("--- DEBUG DE RESULTADO SUPABASE ---");

        if (error) {
            console.error(`ERRO SUPABASE (VERIFIQUE RLS):`, error);
            tituloElement.innerText = `Erro de BD (Verifique RLS/Permissão): ${error.message}`;
            return false;
        }

        if (data) {
            console.log(`DADOS RETORNADOS (Length): ${data.length}`);
        }
        console.log("-----------------------------------");


        if (data && data.length > 0) {
            listaDePerguntas = data;
            indiceAtual = 0;
            return true;
        }

        tituloElement.innerText = `Nenhuma questão de áudio encontrada com os filtros.`;
        return false;
    } catch (e) {
        console.error('Erro geral na busca (Catch Block):', e);
        tituloElement.innerText = `Erro fatal (Verifique Console): ${e.message}`;
        return false;
    }
}


async function carregarSubQuestoes(idPerguntaPrincipal) {
    if (subQuestoesCache[idPerguntaPrincipal]) {
        return subQuestoesCache[idPerguntaPrincipal];
    }
    
    try {
        const { data, error } = await supabase
            .from('extraaudios')
            .select('*')
            .eq('idpergunta', idPerguntaPrincipal) 
            .order('numeroquestao', { ascending: true }); 

        if (error) {
            console.error(`Erro ao carregar sub-questões:`, error);
            return null;
        }
        if (data && data.length > 0) {
            subQuestoesCache[idPerguntaPrincipal] = data;
            return data;
        }
        return null;
    } catch (e) {
        console.error('Erro geral na busca de sub-questões:', e);
        return null;
    }
}

// -------------------------------------------------------------
// LÓGICA DE INTERAÇÃO E RENDERIZAÇÃO
// -------------------------------------------------------------

function getPerguntaPrincipalAtual() {
    if (indiceAtual < listaDePerguntas.length) {
        return listaDePerguntas[indiceAtual];
    }
    return null; 
}

function avancarPerguntaPrincipal() {
    if (indiceAtual < listaDePerguntas.length) {
        indiceAtual++;
    }
}

function avancarQuiz() {
    avancarPerguntaPrincipal();
    exibirQuestaoAtual();
}

/**
 * Função para retornar à tela de seleção dos 4 botões de pergunta.
 */
function voltarParaPerguntasPrincipais() {
    
    // Re-renderiza a tela do áudio principal (que mostra os 4 botões)
    const perguntaPrincipal = getPerguntaPrincipalAtual();
    if (perguntaPrincipal) {
        carregarExtraAudios(perguntaPrincipal);
    } else {
         exibirQuestaoAtual();
    }
}

/**
 * Função que renderiza a sub-questão e as alternativas.
 */
async function selecionarSubQuestao(questaoIndex) {
    const perguntaPrincipal = getPerguntaPrincipalAtual();
    if (!perguntaPrincipal) return;

    const subQuestoes = await carregarSubQuestoes(perguntaPrincipal.id);
    
    if (!subQuestoes || subQuestoes.length <= questaoIndex) {
        console.error("Dados da sub-questão não encontrados ou índice inválido.");
        return;
    }

    subQuestaoAtual = subQuestoes[questaoIndex];
    
    const alternativasContainer = document.getElementById('alternativas-container');
    const btnProxima = document.getElementById('btn-proxima-questao');
    
    // Oculta botões e mostra alternativas
    document.getElementById('extra-audios-questions-container').style.display = 'none';
    
    // Configura o contêiner de alternativas para layout vertical
    alternativasContainer.style.display = 'flex'; 
    alternativasContainer.style.flexDirection = 'column'; 
    alternativasContainer.style.gap = '10px';
    alternativasContainer.innerHTML = ''; 
    alternativasContainer.classList.remove('alternativas-bloqueadas');

    const opcoesRaw = subQuestaoAtual.alternativas || []; 
    const respostaCorreta = subQuestaoAtual.resposta;
    const perguntaTexto = subQuestaoAtual.pergunta || `Responda a Questão ${subQuestaoAtual.numeroquestao}:`; 
    
    respostasSubQuestao = { correta: respostaCorreta};
    document.getElementById('texto-enunciado').innerText = perguntaTexto;
    
    // Lógica robusta de parsing de alternativas
    let opcoesValidas = [];
    try {
        if (Array.isArray(opcoesRaw)) {
            opcoesValidas = opcoesRaw;
        } else if (typeof opcoesRaw === 'string') {
            opcoesValidas = JSON.parse(opcoesRaw);
        }
    } catch (e) {
        console.error("Erro ao fazer parse das alternativas (JSON inválido):", e);
    }
    
    let opcoesParaRenderizar = Array.from(new Set([...opcoesValidas, respostaCorreta]));
    opcoesParaRenderizar.sort(() => Math.random() - 0.5); 
    
    // Verifica o estado atual de resposta
    const idPrincipal = perguntaPrincipal.id;
    const numQuestao = subQuestaoAtual.numeroquestao;
    
    // ATUALIZADO: Carrega o objeto completo de estado
    const estadoRespostaObjeto = estadoRespostas[idPrincipal]?.[numQuestao];
    let jaRespondida = !!estadoRespostaObjeto;
    const statusResposta = estadoRespostaObjeto?.status;
    const respostaSelecionada = estadoRespostaObjeto?.respostaSelecionada; 

    // 2. Renderiza os botões de alternativa
    opcoesParaRenderizar.forEach(textoOpcao => {
        const button = document.createElement('button');
        button.className = 'alternativa-btn audio-option-wrapper'; 
        const texto = String(textoOpcao).trim(); 
        button.innerText = texto; 
        button.setAttribute('data-value', texto); 
        
        // ----------------------------------------------------
        // ** BLOQUEIO E MARCAÇÃO DE ALTERNATIVA JÁ RESPONDIDA (CORREÇÃO) **
        // ----------------------------------------------------
        if (jaRespondida) {
            button.disabled = true; // Bloqueia o clique
            alternativasContainer.classList.add('alternativas-bloqueadas');
            
            const textoLimpo = limparStringResposta(texto);
            const respostaCorretaLimpa = limparStringResposta(respostaCorreta);
            const selecionadaLimpa = limparStringResposta(respostaSelecionada);
            
            if (statusResposta === 'acertou' && textoLimpo === respostaCorretaLimpa) {
                // Se acertou, marca a correta
                button.classList.add('acertou');
            } else if (statusResposta === 'errou') {
                 // 1. Marca a correta com 'correta' (verde, se errou)
                 if (textoLimpo === respostaCorretaLimpa) {
                     button.classList.add('correta');
                 }
                 // 2. Marca a que o usuário clicou com 'errou' (vermelho)
                 if (textoLimpo === selecionadaLimpa) { 
                     button.classList.add('errou');
                 }
            }
        }
        // ----------------------------------------------------

        // Lógica de clique (só será executada se o botão não estiver disabled)
        button.onclick = () => {
            const acertou = limparStringResposta(texto) === limparStringResposta(respostaCorreta);
            
            alternativasContainer.classList.add('alternativas-bloqueadas');

            // ----------------------------------------------------
            // ** ATUALIZAÇÃO DO ESTADO DE RESPOSTA (Correção 1) **
            // ----------------------------------------------------
            if (!estadoRespostas[idPrincipal]) {
                estadoRespostas[idPrincipal] = {};
            }
            estadoRespostas[idPrincipal][numQuestao] = {
                status: acertou ? 'acertou' : 'errou',
                respostaSelecionada: texto // ARMAZENA O TEXTO SELECIONADO
            };
            // ----------------------------------------------------

            if (acertou) {
                 button.classList.add('acertou');
                 showFeedback(true, perguntaPrincipal); 
            } else {
                 button.classList.add('errou');
                 // Marca a correta para feedback visual
                 document.querySelectorAll('.alternativa-btn').forEach(btn => {
                     if (limparStringResposta(btn.getAttribute('data-value')) === limparStringResposta(respostaCorreta)) {
                         btn.classList.add('correta');
                     }
                 });
                 showFeedback(false, perguntaPrincipal);
            }
            
            // HABILITA o botão para voltar, após responder
            btnProxima.disabled = false;
        };
        alternativasContainer.appendChild(button);
    });
    
    // Configura o botão de volta. Deve estar habilitado se já respondida.
    btnProxima.disabled = !jaRespondida; // Desabilita se for a primeira vez
    btnProxima.innerText = 'Back to the questions page';
    btnProxima.onclick = voltarParaPerguntasPrincipais; 
}


// MÓDULO EXTRA AUDIOS (Renderiza o Audio e os 4 Botões da Pergunta Principal)
async function carregarExtraAudios(questaoPrincipal) {
    
    // 1. Limpa e esconde contêineres de resposta
    const alternativasContainer = document.getElementById('alternativas-container');
    if (alternativasContainer) {
        alternativasContainer.innerHTML = '';
        alternativasContainer.style.display = 'none'; 
        alternativasContainer.style.flexDirection = 'row'; 
        alternativasContainer.style.gap = '0';
    }
    
    const extraAudiosContainer = document.getElementById('extra-audios-questions-container');
    if (!extraAudiosContainer) {
        document.getElementById('texto-enunciado').innerText = 'Erro: Contêiner "extra-audios-questions-container" não encontrado no HTML.';
        return;
    }

    document.getElementById('texto-enunciado').innerText = 'Listen and select the question you want to answer:';

    // 2. Renderiza o Áudio Principal
    const audioElement = document.getElementById('audio-player');
    if (questaoPrincipal.audio && audioElement) {
        audioElement.src = generateSupabaseUrl(questaoPrincipal.audio);
        audioElement.style.display = 'block';
    } else {
        audioElement.style.display = 'none';
    }

    // 3. Renderiza os 4 Botões
    extraAudiosContainer.style.display = 'flex'; 
    extraAudiosContainer.innerHTML = ''; 

    const subQuestoes = await carregarSubQuestoes(questaoPrincipal.id);
    const numSubQuestoes = subQuestoes ? subQuestoes.length : 0; 
    
    if (numSubQuestoes === 0) {
        extraAudiosContainer.innerHTML = '<p style="color: red;">Nenhuma sub-questão encontrada. Verifique a tabela `extraaudios` e a coluna `idpergunta`.</p>';
        return;
    }
    
    const idPrincipal = questaoPrincipal.id;
    const estado = estadoRespostas[idPrincipal] || {}; // Carrega o estado de acerto/erro desta pergunta principal

    for (let i = 0; i < numSubQuestoes; i++) {
        if (i >= 4) break; 
        
        const button = document.createElement('button');
        button.className = 'extra-audio-question-btn alternativa-btn audio-option-wrapper'; 
        button.innerText = `Question ${i + 1}`; 
        
        // ----------------------------------------------------
        // ** APLICAÇÃO DO ESTILO DE FEEDBACK NOS BOTÕES (Correção 1) **
        // ----------------------------------------------------
        const numQuestao = subQuestoes[i].numeroquestao;
        const resultado = estado[numQuestao]?.status; // Pega apenas o status
        
        if (resultado === 'acertou') {
             button.classList.add('acertou');
        } else if (resultado === 'errou') {
             button.classList.add('errou');
        }
        // ----------------------------------------------------
        
        button.onclick = () => selecionarSubQuestao(i);
        
        extraAudiosContainer.appendChild(button);
    }
    
    const btnProxima = document.getElementById('btn-proxima-questao');
    // Verifica se TODAS as sub-questões foram respondidas para liberar o "Next Question"
    const todasRespondidas = numSubQuestoes > 0 && numSubQuestoes === Object.keys(estado).length;

    if (btnProxima) {
         // ATUALIZADO: Texto mais amigável
         btnProxima.disabled = !todasRespondidas;
         btnProxima.innerText = todasRespondidas ? 'Next Question' : 'Answer all questions to proceed'; 
         btnProxima.onclick = avancarQuiz;
    }
}


function exibirQuestaoAtual() {
    const perguntaPrincipal = getPerguntaPrincipalAtual(); 
    
    if (perguntaPrincipal) {
        document.getElementById('titulo-modulo').innerText = 'Extra Audios'; 
        carregarExtraAudios(perguntaPrincipal); 
    } else {
        document.getElementById('app-container').innerHTML = '<h1>Módulo Concluído!</h1><p>Parabéns!</p>';
        const btnProxima = document.getElementById('btn-proxima-questao');
        if (btnProxima) btnProxima.style.display = 'none';
    }
}

export async function iniciarModulo() {
    const filtros = getFiltrosDaUrl();
    const tituloElement = document.getElementById('titulo-modulo');
    
    if (!filtros.fkbooks || !filtros.fkunidades || !filtros.subunidades) {
        tituloElement.innerText = "Erro: Parâmetros obrigatórios incompletos na URL (fkbooks, fkunidades, subunidades).";
        return;
    }
    
    tituloElement.innerText = `Carregando lição Extra Audios...`;
    
    const carregadoComSucesso = await carregarDadosExtraAudios(filtros);
    
    if (carregadoComSucesso) {
        exibirQuestaoAtual();
    } else {
        console.error("Módulo falhou ao carregar. Verifique o console para mais detalhes do Supabase.");
    }
}