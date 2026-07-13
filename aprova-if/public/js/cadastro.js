const form = document.getElementById("cadastroForm");

form.addEventListener("submit", async (event) => {

    event.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;
    const confirmarSenha = document.getElementById("confirmarSenha").value;

    if (senha !== confirmarSenha) {

        alert("As senhas não coincidem.");

        return;
    }

    const resposta = await fetch("/api/usuarios", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({

            nome,
            email,
            senha

        })

    });

    const dados = await resposta.json();

    if (resposta.ok) {

        alert("Conta criada com sucesso!");

        window.location.href = "/login";

    } else {

        alert(dados.erro);

    }

});