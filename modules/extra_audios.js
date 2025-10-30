// modules/extra_audios.js (Versão FINAL com Corrigida do Estado)

import { supabase } from '../supabase_client.js'; 
import { generateSupabaseUrl, getFiltrosDaUrl, limparStringResposta, showFeedback } from '../main.js'; 

let listaDePerguntas = []; 
let indiceAtual = 0;
let subQuestoesCache = {}; 

let estadoRespostas = {}; // Usa idpergunta -> idsubquestao -> { status, respostaSelecionada }

let subQuestaoAtual = null; 
let respostasSubQuestao = null; 

// -------------------------------------------------------------
// FUNÇÃO LOCAL PARA SALVAR RESPOSTA DO EXTRA AUDIOS
// -------------------------------------------------------------
async function salvarRespostaExtraAudios(idaluno, idquestao, respostaAluno, pontuacao, lessonName) {
    // CORREÇÃO CRÍTICA DO NOME DA TABELA: 'quetionarioextraaudios'
    const nomeTabelaFinal = 'quetionarioextraaudios'; 

    try {
        const { data, error } = await supabase
            .from(nomeTabelaFinal) 
            .insert([
                {
                    idaluno: idaluno,
                    idquestao: idquestao,
                    // Nome da coluna corrigido anteriormente: resposta_aluno -> respostaaluno
                    respostaaluno: respostaAluno, 
                    pontuacao: pontuacao,
                    lesson: lessonName
                }
            ]);

        if (error) {
            console.error(
                'SUPABASE ERRO/SUCESSO: Erro Supabase ao salvar resposta (Extra Audios):', 
                error
            );
            if (error.details) {
                 console.error('Detalhes do Erro Supabase (Restrições/Tipos):', error.details);
            }
            return false;
        }
        console.log(`SUPABASE SUCESSO: Resposta Extra Audios salva com sucesso para idquestao: ${idquestao}, aluno: ${idaluno}`);
        return true;
    } catch (e) {
        console.error('Erro geral ao salvar resposta (Extra Audios) no bloco catch:', e);
        return false;
    }
}


// -------------------------------------------------------------
// FUNÇÕES DE BUSCA
// -------------------------------------------------------------

async function carregarDadosExtraAudios(filtros) {
    const tituloElement = document.getElementById('titulo-modulo');
    
    try {
        const fkbooksStr = String(filtros.fkbooks || '');
        const fkunidadesStr = String(filtros.fkunidades || '');
        const subunidadesStr = String(filtros.subunidades || ''); 

        const fkbooksInt = parseInt(fkbooksStr);
        const fkunidadesInt = parseInt(fkunidadesStr);
        
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
        
        if (error) {
            console.error(`ERRO SUPABASE (VERIFIQUE RLS):`, error);
            tituloElement.innerText = `Erro de BD (Verifique RLS/Permissão): ${error.message}`;
            return false;
        }

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
    
    // CORREÇÃO #1: Limpeza de classes de feedback para evitar vazamento visual
    document.querySelectorAll('.alternativa-btn').forEach(btn => {
        btn.classList.remove('acertou', 'errou', 'correta');
        btn.disabled = false;
    });

    document.getElementById('extra-audios-questions-container').style.display = 'none';
    
    alternativasContainer.style.display = 'flex'; 
    alternativasContainer.style.flexDirection = 'column'; 
    alternativasContainer.style.gap = '10px';
    alternativasContainer.innerHTML = ''; 
    alternativasContainer.classList.remove('alternativas-bloqueadas');

    const opcoesRaw = subQuestaoAtual.alternativas || []; 
    const pontuacaoQuestao = subQuestaoAtual.pontuacao || 0; 
    const respostaCorreta = subQuestaoAtual.resposta;
    const perguntaTexto = subQuestaoAtual.pergunta || `Responda a Questão ${subQuestaoAtual.numeroquestao}:`; 
    
    respostasSubQuestao = { correta: respostaCorreta};
    document.getElementById('texto-enunciado').innerText = perguntaTexto;
    
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
    
    const idPrincipal = perguntaPrincipal.id;
    
    // CORREÇÃO #2: Usar o ID único da sub-questão para mapear o estado
    const idSubQuestao = subQuestaoAtual.id; 
    
    const estadoRespostaObjeto = estadoRespostas[idPrincipal]?.[idSubQuestao];
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
        
        // Lógica de bloqueio e marcação 
        if (jaRespondida) {
            button.disabled = true; 
            alternativasContainer.classList.add('alternativas-bloqueadas');
            
            const textoLimpo = limparStringResposta(texto);
            const respostaCorretaLimpa = limparStringResposta(respostaCorreta);
            const selecionadaLimpa = limparStringResposta(respostaSelecionada);
            
            if (statusResposta === 'acertou' && textoLimpo === respostaCorretaLimpa) {
                button.classList.add('acertou');
            } else if (statusResposta === 'errou') {
                 if (textoLimpo === respostaCorretaLimpa) {
                     button.classList.add('correta');
                 }
                 if (textoLimpo === selecionadaLimpa) { 
                     button.classList.add('errou');
                 }
            }
        }
        
        // Lógica de clique
        button.onclick = () => {
            const acertou = limparStringResposta(texto) === limparStringResposta(respostaCorreta);
            
            alternativasContainer.classList.add('alternativas-bloqueadas');

            // Atualização do estado local (USANDO ID ÚNICO)
            if (!estadoRespostas[idPrincipal]) {
                estadoRespostas[idPrincipal] = {};
            }
            estadoRespostas[idPrincipal][idSubQuestao] = { 
                status: acertou ? 'acertou' : 'errou',
                respostaSelecionada: texto
            };
            
            // ** LÓGICA DE CADASTRO NO QUESTIONARIO EXTRA AUDIOS **
            const filtros = getFiltrosDaUrl();
            const idAluno = filtros.uuid;
            const idQuestao = subQuestaoAtual.id; 
            const pontuacaoFinal = acertou ? pontuacaoQuestao : 0; 
            const lessonName = 'Extra Audios';
            
            if (idAluno && idQuestao) {
                // Log #2: Verifica os dados de input ANTES de chamar o Supabase
                console.log("DADOS P/ SALVAR:", {
                    idaluno: idAluno, 
                    idquestao: idQuestao, 
                    resposta_aluno: texto, 
                    pontuacao: pontuacaoFinal, 
                    lesson: lessonName
                });
                
                // Chamada da função de salvamento
                salvarRespostaExtraAudios(idAluno, idQuestao, texto, pontuacaoFinal, lessonName); 
            } else {
                console.warn("Não foi possível salvar a resposta do Extra Audio: ID do Aluno ou ID da Questão ausente.");
            }
            // ** FIM DA LÓGICA DE CADASTRO **

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
    
    // Configura o botão de volta
    btnProxima.disabled = !jaRespondida;
    btnProxima.innerText = 'Back to the questions page';
    btnProxima.onclick = voltarParaPerguntasPrincipais; 
}


// MÓDULO EXTRA AUDIOS (Renderiza o Audio e os 4 Botões da Pergunta Principal)
async function carregarExtraAudios(questaoPrincipal) {
    
    const alternativasContainer = document.getElementById('alternativas-container');
    const extraAudiosContainer = document.getElementById('extra-audios-questions-container');

    // Garante que a tela de alternativas suma ao voltar para a principal
    if (alternativasContainer) {
        alternativasContainer.innerHTML = '';
        alternativasContainer.style.display = 'none'; 
    }
    
    if (!extraAudiosContainer) {
        document.getElementById('texto-enunciado').innerText = 'Erro: Contêiner "extra-audios-questions-container" não encontrado no HTML.';
        return;
    }

    document.getElementById('texto-enunciado').innerText = 'Listen and select the question you want to answer:';

    // 2. Renderiza o Áudio Principal
    const audioElement = document.getElementById('audio-player');
    if (questaoPrincipal.audio && audioElement) {
        // Log #1: Loga o valor do caminho do áudio antes de codificar/usar
        console.log("DEBUG AUDIO RAW (do DB):", questaoPrincipal.audio);
        
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
    const estado = estadoRespostas[idPrincipal] || {}; 
    let contadorRespondidas = 0; // Para a verificação do botão "Next Question"

    for (let i = 0; i < numSubQuestoes; i++) {
        if (i >= 4) break; 
        
        const button = document.createElement('button');
        button.className = 'extra-audio-question-btn alternativa-btn audio-option-wrapper'; 
        button.innerText = `Question ${i + 1}`; 
        
        // CORREÇÃO #3: Usar o ID único da sub-questão para verificar o estado
        const idSubQuestao = subQuestoes[i].id;
        const resultado = estado[idSubQuestao]?.status;
        
        if (resultado === 'acertou') {
             button.classList.add('acertou');
             contadorRespondidas++;
        } else if (resultado === 'errou') {
             button.classList.add('errou');
             contadorRespondidas++;
        }
        
        button.onclick = () => selecionarSubQuestao(i);
        
        extraAudiosContainer.appendChild(button);
    }
    
    const btnProxima = document.getElementById('btn-proxima-questao');
    const todasRespondidas = numSubQuestoes > 0 && contadorRespondidas === numSubQuestoes;

    if (btnProxima) {
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
        document.getElementById('app-container').innerHTML = '<h1>Module Completed!</h1><p>Congratulations!</p>';
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