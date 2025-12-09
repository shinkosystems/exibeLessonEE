// supabase_client.js - NOVO FORMATO SEM MÓDULOS

// ** SUAS CHAVES **
const SUPABASE_URL = 'https://qazjyzqptdcnuezllbpr.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhemp5enFwdGRjbnVlemxsYnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NDY4NTQsImV4cCI6MjA2NDEyMjg1NH0.H6v1HUH-LkHDH-WaaLQyN8GMeNLk0V27VJzHuXHin9M'; 

// CRÍTICO: Usa a variável global 'supabase' (fornecida pela CDN) para criar o cliente.
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    // Mantém as configurações para desabilitar o Auth e evitar o TypeError em Webviews.
    auth: {
        storage: null, 
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
    }
});

// CRÍTICO: Torna o cliente Supabase e as variáveis/funções globais (acessíveis em main.js e módulos).
window.supabaseClient = supabaseClient;
let listaDeQuestoes = [];
let indiceAtual = 0;


// --- FUNÇÕES GLOBAIS ---

window.carregarTodasQuestoes = async function(filtros) {
    try {
        listaDeQuestoes = [];
        indiceAtual = 0;

        let query = window.supabaseClient 
            .from('aulaplus')
            .select('*');

        query = query.eq('fkbooks', filtros.fkbooks);
        query = query.eq('fkunidades', filtros.fkunidades);
        query = query.eq('subunidades', filtros.subunidades);
        query = query.eq('lessons', filtros.lessons);

        const { data, error } = await query
            .order('id', { ascending: true }); 
            
        if (error) {
            console.error(`Erro Supabase ao carregar todas as questões (RLS?):`, error.message);
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

window.getQuestaoAtual = function() {
    if (indiceAtual < listaDeQuestoes.length) {
        return listaDeQuestoes[indiceAtual];
    }
    return null; 
}

window.avancarQuestaoNaLista = function() {
    if (indiceAtual < listaDeQuestoes.length) {
        indiceAtual++;
    }
}

window.isLastQuestion = function() {
    return indiceAtual === listaDeQuestoes.length - 1;
}

window.salvarResposta = async function(idaluno, idquestao, respostaAluno, pontuacao) {
    try {
        const { data, error } = await window.supabaseClient
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
            console.error('Erro Supabase ao salvar resposta (questionario):', error.message);
            return false;
        }
        console.log(`Resposta salva para idquestao: ${idquestao}, aluno: ${idaluno}`);
        return true;
    } catch (e) {
        console.error('Erro geral ao salvar resposta:', e);
        return false;
    }
}