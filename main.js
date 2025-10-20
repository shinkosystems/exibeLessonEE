// main.js - VERSÃO FINAL E COMPLETA PARA DEPLOY

import { carregarTodasQuestoes, getProximaQuestao, supabase } from './supabase_client.js';

// 1. Mapeamento de Módulos: Usa o valor da coluna 'lessons'
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

// 3. Função central para avançar e exibir a próxima questão
function exibirProximaQuestao() {
    // Esconde a imagem e áudio por padrão (usamos 'none' se a div existir)
    const imagemElement = document.getElementById('imagem-principal-bg');
    if (imagemElement) {
        imagemElement.style.display = 'none';
        imagemElement.style.backgroundImage = 'none'; // Limpa o background
    }
    
    const audioElement = document.getElementById('audio-player');
    if (audioElement) audioElement.style.display = 'none';
    
    const questao = getProximaQuestao();
    const containerAlternativas = document.getElementById('alternativas-container');
    containerAlternativas.innerHTML = ''; // Limpa as alternativas da questão anterior
    
    if (questao) {
        const moduloAtual = questao.lessons; 
        const renderFunction = MODULOS_RENDER[moduloAtual];
        
        if (renderFunction) {
            renderFunction(questao); // CHAMA a função específica para renderizar TUDO
            console.log(`Questão (lessons: ${moduloAtual}) carregada com sucesso. ID: ${questao.id}`);
        } else {
            document.getElementById('titulo-modulo').innerText = `Erro: Módulo '${moduloAtual}' não possui função de renderização definida.`;
        }
    } else {
        document.getElementById('app-container').innerHTML = '<h1>Módulo Concluído!</h1><p>Parabéns!</p>';
    }
} // FIM de exibirProximaQuestao

// 4. Função que será chamada ao responder, para avançar o quiz (window.avancarQuiz)
window.avancarQuiz = function(respostaUsuario, questaoAtual) {
    // 1. Tenta usar uma coluna de resposta específica (ex: 'pcresposta_correta') ou a genérica ('resposta_correta')
    const respostaCorreta = questaoAtual.pcresposta_correta || questaoAtual.resposta_correta; 
    const acertou = respostaUsuario === respostaCorreta;
    
    console.log(`Resposta: ${respostaUsuario}, Correta: ${respostaCorreta}, Acertou: ${acertou}`);
    
    // 2. AQUI VOCÊ IMPLEMENTARÁ A COMUNICAÇÃO COM O FLUTTERFLOW
    // ...
    
    // 3. Avançar para a próxima questão na tela
    exibirProximaQuestao();
}

// 5. FUNÇÃO DE INICIALIZAÇÃO DA PÁGINA (Executada no carregamento)
window.onload = async function() {
    const filtros = getFiltrosDaUrl();
    const tituloElement = document.getElementById('titulo-modulo');
    
    // Verificação mínima dos filtros
    if (!filtros.lessons || !filtros.fkbooks) {
        tituloElement.innerText = "Erro: Parâmetros FKBOOKS e LESSONS são obrigatórios na URL.";
        console.error("Faltam filtros na URL: http://.../index.html?fkbooks=VALOR&lessons=VALOR...");
        return;
    }
    
    tituloElement.innerText = `Carregando lição ${filtros.lessons}...`;
    
    // Carrega todas as questões com base nos filtros
    const carregadoComSucesso = await carregarTodasQuestoes(filtros);
    
    if (carregadoComSucesso) {
        exibirProximaQuestao();
    } else {
        tituloElement.innerText = `Nenhuma questão encontrada com os filtros: ${filtros.lessons} (${filtros.fkbooks}, etc.).`;
    }
};


// 6. FUNÇÕES DE RENDERIZAÇÃO ESPECÍFICAS DE CADA MÓDULO

// MÓDULO: Picture Description
function carregarPictureDescription(questao) {
    document.getElementById('titulo-modulo').innerText = questao.lessons; 
    
    document.getElementById('texto-enunciado').innerText = questao.pctitulo || "Título da imagem não encontrado.";

    // Lógica da Imagem (usando a coluna 'pcimagem')
    const imgElement = document.getElementById('imagem-principal-bg');
    
    if (questao.pcimagem && imgElement) {
        // CORREÇÃO FINAL: Limpeza agressiva e encoding do nome do arquivo (principal causa do erro 400)
        let nomeArquivoLimpo = String(questao.pcimagem).replace(/\s/g, '').trim(); 
        
        // Uso de encodeURIComponent para garantir que caracteres especiais sejam tratados corretamente
        const nomeArquivoEncoded = encodeURIComponent(nomeArquivoLimpo); 
        
        const { data: publicUrl } = supabase.storage.from('connection').getPublicUrl(nomeArquivoEncoded);
        const finalUrl = publicUrl.publicUrl;
        
        console.log("Caminho na Coluna pcimagem:", questao.pcimagem);
        console.log("Nome Limpo e Codificado:", nomeArquivoEncoded); 
        console.log("URL Pública Gerada (FINAL):", finalUrl);
        
        // Aplica a URL como background-image
        imgElement.style.backgroundImage = `url('${finalUrl}')`;
        imgElement.style.display = 'block';

    } else if(imgElement) {
        imgElement.style.display = 'none';
    }

    // Renderização das Alternativas (usando a coluna 'opcoes')
    const containerAlternativas = document.getElementById('alternativas-container');
    
    // CORREÇÃO DEFINITIVA PARA O TIPO text[] (ARRAY DE TEXTO)
    if (questao.opcoes && Array.isArray(questao.opcoes)) { 
        const alternativas = questao.opcoes; 
        
        alternativas.forEach((texto, index) => {
            const label = String.fromCharCode(65 + index); // A, B, C, D...
            const button = document.createElement('button');
            button.className = 'alternativa-btn';
            button.innerText = `${label}) ${texto.trim()}`;
            // Passamos a LETRA (A, B, C) como resposta do usuário
            button.onclick = () => window.avancarQuiz(label, questao); 
            containerAlternativas.appendChild(button);
        });
    } else {
        containerAlternativas.innerHTML = '<p style="color: red;">Erro: Formato da coluna OPCOES inválido ou vazio.</p>';
    }
}

// MÓDULO: Story Time (Exemplo)
function carregarStoryTime(questao) {
    document.getElementById('titulo-modulo').innerText = questao.lessons;
    document.getElementById('texto-enunciado').innerText = questao.sttitulo || "Conteúdo da história não encontrado.";

    // Lógica de Áudio (usando a coluna 'staudio')
    const audioPlayer = document.getElementById('audio-player');
    if (questao.staudio) {
        const { data: publicUrl } = supabase.storage.from('connection').getPublicUrl(String(questao.staudio).trim());
        audioPlayer.src = publicUrl.publicUrl;
        audioPlayer.style.display = 'block';
    } else {
        audioPlayer.style.display = 'none';
    }
    
    // ... Implemente as alternativas ou botões aqui ...
}

// MÓDULO: Grammar Practice (Exemplo)
function carregarGrammarPractice(questao) {
    document.getElementById('titulo-modulo').innerText = questao.lessons;
    document.getElementById('texto-enunciado').innerText = questao.gmtitulo || "Conteúdo de gramática não encontrado.";
    // ... Implemente a lógica de preencher lacunas ou seleção de múltipla escolha ...
}

// MÓDULO: Quiz (Exemplo)
function carregarQuiz(questao) {
    document.getElementById('titulo-modulo').innerText = questao.lessons;
    document.getElementById('texto-enunciado').innerText = questao.qztitulo || "Conteúdo do quiz não encontrado.";
    // ... Implemente a lógica de alternativas de quiz padrão ...
}