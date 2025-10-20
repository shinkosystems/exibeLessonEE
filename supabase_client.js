// supabase_client.js

// 1. IMPORTAÇÃO NECESSÁRIA: Importa a função createClient da biblioteca Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ** 2. CONFIGURAÇÃO COM SUAS CHAVES (Já preenchidas) **
const SUPABASE_URL = 'https://qazjyzqptdcnuezllbpr.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhemp5enFwdGRjbnVlemxsYnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NDY4NTQsImV4cCI6MjA2NDEyMjg1NH0.H6v1HUH-LkHDH-WaaLQyN8GMeNLk0V27VJzHuXHin9M'; 

// 3. INICIALIZAÇÃO DO CLIENTE
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variável para armazenar a lista completa de dados do módulo
let listaDeQuestoes = [];
// Variável para rastrear a posição atual na lista
let indiceAtual = 0;


/**
 * Busca todas as questões com base em quatro filtros de chave e as armazena.
 * @param {object} filtros - Objeto contendo os valores de fkbooks, fkunidades, etc.
 */
export async function carregarTodasQuestoes(filtros) {
    try {
        let query = supabase
            .from('aulaplus')
            .select('*');

        // APLICAÇÃO DOS QUATRO FILTROS:
        query = query.eq('fkbooks', filtros.fkbooks);
        query = query.eq('fkunidades', filtros.fkunidades);
        query = query.eq('subunidades', filtros.subunidades);
        query = query.eq('lessons', filtros.lessons); // O Módulo/Lição

        // Garante a ordem sequencial
        const { data, error } = await query
            .order('id', { ascending: true }); 
            
        if (error) {
            console.error(`Erro Supabase ao carregar todas as questões com os filtros:`, error.message);
            // Se o erro for de RLS/Permissão, você verá aqui.
            return false;
        }

        if (data && data.length > 0) {
            listaDeQuestoes = data; // Armazena a lista
            indiceAtual = 0;        // Começa na primeira questão
            return true;
        }

        return false; // Nenhuma questão encontrada
    } catch (e) {
        console.error('Erro geral na busca:', e);
        return false;
    }
}

/**
 * Retorna o dado da questão atual e avança o índice para a próxima.
 */
export function getProximaQuestao() {
    if (indiceAtual < listaDeQuestoes.length) {
        const questao = listaDeQuestoes[indiceAtual];
        indiceAtual++; // Incrementa para a próxima vez
        return questao;
    }
    return null; // Sinaliza que não há mais questões
}

// Funções para exportar para que o main.js possa acessar o estado
export { listaDeQuestoes, indiceAtual };