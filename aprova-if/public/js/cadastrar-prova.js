const form = document.getElementById('provaForm');
const questions = document.getElementById('questions');
const typeSelect = document.getElementById('tipo');
const adminFields = document.getElementById('adminFields');
const message = document.getElementById('message');
const saveButton = document.getElementById('saveButton');
let questionCount = 0;

function syncAdminFields() {
  const official = typeSelect.value === 'oficial';
  adminFields.classList.toggle('hidden', !official);
  document.getElementById('adminEmail').required = official;
  document.getElementById('adminSenha').required = official;
}
typeSelect.addEventListener('change', syncAdminFields);
syncAdminFields();

function addQuestion() {
  questionCount++;
  const number = questionCount;
  const section = document.createElement('section');
  section.className = 'question';
  section.dataset.question = String(number);
  section.innerHTML = `
    <h3>Questão ${number}</h3>
    <div class="grid"><div class="form-group"><label>Matéria *</label><select class="subject" required><option value="">Selecione</option><option>Matemática</option><option>Português</option><option>História</option><option>Geografia</option><option>Ciências</option><option>Física</option><option>Química</option><option>Biologia</option><option>Outra</option></select></div>
    <div class="form-group"><label>Assunto</label><input class="topic" maxlength="120" placeholder="Assunto da questão"></div>
    <div class="form-group"><label>Dificuldade</label><select class="difficulty"><option value="1">Fácil</option><option value="2" selected>Média</option><option value="3">Difícil</option></select></div></div>
    <div class="form-group"><label>Enunciado *</label><textarea class="statement" required maxlength="10000" placeholder="Digite o enunciado"></textarea></div>
    <div class="form-group"><label>Imagem da questão (opcional)</label><input class="question-image" type="file" accept="image/png,image/jpeg,image/webp,image/gif"><p class="hint">PNG, JPG, WEBP ou GIF. Tamanho máximo: 5 MB.</p><img class="question-image-preview" alt="Prévia da imagem da questão"></div>
    <h4>Alternativas (marque a correta)</h4>
    ${['A','B','C','D'].map(letter => `<div class="answer"><div class="form-group"><label>Alternativa ${letter} *</label><input class="answer-${letter}" required maxlength="2000" placeholder="Texto da alternativa"></div><label><input type="radio" name="correct-${number}" value="${letter}" ${letter==='A'?'checked':''} required> Correta</label></div>`).join('')}
    <button type="button" class="btn btn-secondary remove-question">Remover questão</button>`;
  const imageInput = section.querySelector('.question-image');
  const preview = section.querySelector('.question-image-preview');
  let previewUrl = null;
  imageInput.addEventListener('change', () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const file = imageInput.files?.[0];
    if (!file) {
      preview.removeAttribute('src');
      preview.style.display = 'none';
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      imageInput.value = '';
      preview.removeAttribute('src');
      preview.style.display = 'none';
      message.className = 'message error';
      message.textContent = 'Escolha uma imagem PNG, JPG, WEBP ou GIF de até 5 MB.';
      return;
    }
    previewUrl = URL.createObjectURL(file);
    preview.src = previewUrl;
    preview.style.display = 'block';
    message.textContent = '';
    message.className = '';
  });
  section.querySelector('.remove-question').addEventListener('click', () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    section.remove();
  });
  questions.appendChild(section);
}
document.getElementById('addQuestion').addEventListener('click', addQuestion);
addQuestion();

async function api(url, body) {
  const response = await fetch(url, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.erro || `Falha na requisição (${response.status}).`);
  return data;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.className = '';
  message.textContent = '';
  const questionNodes = [...questions.querySelectorAll('.question')];
  if (!questionNodes.length) { message.className = 'message error'; message.textContent = 'Adicione pelo menos uma questão.'; return; }
  for (const node of questionNodes) {
    if (!node.querySelector(`input[name="correct-${node.dataset.question}"]:checked`)) {
      message.className = 'message error'; message.textContent = 'Marque a alternativa correta em cada questão.'; return;
    }
  }
  saveButton.disabled = true;
  saveButton.textContent = 'Salvando...';
  try {
    const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
    const proof = await api('/api/provas', {
      titulo: document.getElementById('titulo').value.trim(),
      ano: document.getElementById('ano').value ? Number(document.getElementById('ano').value) : null,
      curso: document.getElementById('curso').value.trim() || null,
      campus: document.getElementById('campus').value.trim() || null,
      tipo: typeSelect.value,
      criadorId: usuario?.id,
      adminEmail: document.getElementById('adminEmail').value.trim(),
      adminSenha: document.getElementById('adminSenha').value
    });
    for (let index = 0; index < questionNodes.length; index++) {
      const node = questionNodes[index];
      let imagem = null;
      const imageFile = node.querySelector('.question-image').files?.[0];
      if (imageFile) {
        const upload = new FormData();
        upload.append('imagem', imageFile);
        const uploadResponse = await fetch('/api/imagens-questao', { method: 'POST', body: upload });
        const uploadData = await uploadResponse.json().catch(() => ({}));
        if (!uploadResponse.ok) throw new Error(uploadData.erro || `Falha ao enviar imagem (${uploadResponse.status}).`);
        imagem = uploadData.url;
      }
      const q = await api('/api/questoes', {
        materia: node.querySelector('.subject').value,
        assunto: node.querySelector('.topic').value.trim() || null,
        texto: node.querySelector('.statement').value.trim(),
        dificuldade: Number(node.querySelector('.difficulty').value),
        tipo: 'multipla escolha',
        imagem
      });
      const correct = node.querySelector(`input[name="correct-${node.dataset.question}"]:checked`).value;
      for (const letter of ['A','B','C','D']) {
        await api(`/api/questoes/${q.id}/alternativas`, {
          letra: letter,
          texto: node.querySelector(`.answer-${letter}`).value.trim(),
          correta: letter === correct
        });
      }
      await api(`/api/provas/${proof.id}/questoes`, { questaoId: q.id, ordem: index + 1 });
    }
    message.className = 'message success';
    message.textContent = `Prova "${proof.titulo}" cadastrada com ${questionNodes.length} questão(ões)!`;
    form.reset(); questions.innerHTML = ''; questionCount = 0; addQuestion(); syncAdminFields();
    document.getElementById('adminSenha').value = '';
  } catch (error) {
    message.className = 'message error';
    message.textContent = error.message || 'Não foi possível cadastrar a prova.';
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = 'Salvar prova';
  }
});
