const form = document.getElementById("loginForm");
const mensagem = document.getElementById("mensagem");
const botao = document.getElementById("btnLogin");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  mensagem.textContent = "";
  mensagem.className = "auth-message";

  const email = document.getElementById("email").value.trim().toLowerCase();
  const senha = document.getElementById("senha").value;

  if (!email || !senha) {
    mensagem.textContent = "Preencha o e-mail e a senha.";
    return;
  }

  botao.disabled = true;
  botao.textContent = "Entrando...";
  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      mensagem.textContent = data.erro || "E-mail ou senha inválidos.";
      return;
    }

    // A API retorna o usuário diretamente; não armazena senha no navegador.
    const usuario = data.usuario || data;
    localStorage.setItem("usuario", JSON.stringify({
      id: usuario.id ?? usuario.id_usuario,
      nome: usuario.nome,
      email: usuario.email
    }));
    mensagem.classList.add("success");
    mensagem.textContent = "Login realizado! Redirecionando...";
    setTimeout(() => { window.location.href = "/"; }, 500);
  } catch (error) {
    console.error("Falha no login:", error);
    mensagem.textContent = "Não foi possível conectar ao servidor. Verifique se ele está iniciado.";
  } finally {
    botao.disabled = false;
    botao.textContent = "Entrar";
  }
});
