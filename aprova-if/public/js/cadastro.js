const form = document.getElementById("cadastroForm");
const mensagem = document.getElementById("mensagem");
const botao = document.getElementById("btnCadastro");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  mensagem.textContent = "";
  mensagem.className = "auth-message";

  const nome = document.getElementById("nome").value.trim();
  const email = document.getElementById("email").value.trim().toLowerCase();
  const senha = document.getElementById("senha").value;
  const confirmarSenha = document.getElementById("confirmarSenha").value;

  if (nome.length < 2) {
    mensagem.textContent = "Informe seu nome (mínimo de 2 caracteres).";
    document.getElementById("nome").focus();
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    mensagem.textContent = "Informe um e-mail válido.";
    document.getElementById("email").focus();
    return;
  }
  if (senha.length < 8) {
    mensagem.textContent = "A senha deve ter pelo menos 8 caracteres.";
    document.getElementById("senha").focus();
    return;
  }
  if (senha !== confirmarSenha) {
    mensagem.textContent = "As senhas não coincidem.";
    document.getElementById("confirmarSenha").focus();
    return;
  }

  botao.disabled = true;
  botao.textContent = "Criando conta...";
  try {
    const response = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email, senha })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      mensagem.textContent = data.erro || "Não foi possível criar a conta.";
      return;
    }
    mensagem.classList.add("success");
    mensagem.textContent = "Conta criada com sucesso! Redirecionando para o login...";
    form.reset();
    setTimeout(() => { window.location.href = "/login"; }, 900);
  } catch (error) {
    console.error("Falha no cadastro:", error);
    mensagem.textContent = "Não foi possível conectar ao servidor. Verifique se ele está iniciado.";
  } finally {
    botao.disabled = false;
    botao.textContent = "Criar conta";
  }
});
