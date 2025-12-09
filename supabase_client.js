// supabase_client.js - AJUSTADO com nomenclatura aprimorada e CORREÇÃO DE INICIALIZAÇÃO PARA WEBVIEW

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ** SUAS CHAVES **
const SUPABASE_URL = 'https://qazjyzqptdcnuezllbpr.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhemp5enFwdGRjbnVlemxsYnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NDY4NTQsImV4cCI6MjA2NDEyMjg1NH0.H6v1HUH-LkHDH-WaaLQyN8GMeNLk0V27VJzHuXHin9M'; 

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    // 🛑 BLOCO CRÍTICO: Desabilita o armazenamento de sessão para evitar o erro "TypeError: AuthClient" em WebViews/ambientes restritos.
    auth: {
        storage: null, 
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
    }
});

let listaDeQuestoes = [];
let indiceAtual = 0;
//comentario


export async function carregarTodasQuestoes(filtros) {
    try {
        listaDeQuestoes = [];
        indiceAtual = 0;

        let query = supabase
            .from('aulaplus')
            .select('*');

        query = query.eq('fkbooks', filtros.fkbooks);
        query = query.eq('fkunidades', filtros.fkunidades);
        query = query.eq('subunidades', filtros.subunidades);
        query = query.eq('lessons', filtros.lessons);

        const { data, error } = await query
            .order('id', { ascending: true }); 
            
        if (error) {
            console.error(`Erro Supabase ao carregar todas as questões:`, error.message);
            // IMPORTANTE: Se isso falhar, verifique a RLS (SELECT para 'anon') na tabela 'aulaplus'.
            return false;
        }

        if (data && data.length > 0) {
            listaDeQuestoes = data;
            return true;
        }

        return false;
    } catch (e) {
        console.error('Erro geral na busca:', e);
        return false;
    }
}

/**
 * Retorna o dado da questão no índice ATUAL. NÃO AVANÇA O ÍNDICE.
 * RENOMEADO de getProximaQuestao para CLAREZA.
 */
export function getQuestaoAtual() {
    if (indiceAtual < listaDeQuestoes.length) {
        return listaDeQuestoes[indiceAtual];
    }
    return null; 
}


/**
 * AVANÇA o índice para a próxima questão na lista. 
 */
export function avancarQuestaoNaLista() {
    if (indiceAtual < listaDeQuestoes.length) {
        indiceAtual++;
    }
}

/**
 * NOVO: Verifica se a questão atual é a última da lista.
 */
export function isLastQuestion() {
    // Se o índice atual for igual ao último índice válido (length - 1), é a última.
    return indiceAtual === listaDeQuestoes.length - 1;
}

// ** MANTIDO: Função para salvar a resposta na tabela questionario **
export async function salvarResposta(idaluno, idquestao, respostaAluno, pontuacao) {
    try {
        const { data, error } = await supabase
            .from('questionario')
            .insert([
                {
                    idaluno: idaluno,
                    idquestao: idquestao,
                    respostaaluno: respostaAluno,
                    pontuacao: pontuacao
                }
            ]);

        if (error) {
            console.error('Erro Supabase ao salvar resposta:', error.message);
            // ATENÇÃO: Verifique as políticas RLS (INSERT para 'anon' ou 'authenticated') na tabela 'questionario'
            return false;
        }
        console.log(`Resposta salva para idquestao: ${idquestao}, aluno: ${idaluno}`);
        return true;
    } catch (e) {
        console.error('Erro geral ao salvar resposta:', e);
        return false;
    }
}