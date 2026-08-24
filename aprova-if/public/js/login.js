const form = document.getElementById("loginForm");
const mensagem = document.getElementById("mensagem");

form.addEventListener("submit", async (event) => {

    event.preventDefault();

    const email =
        document.getElementById("email").value.trim();

    const senha =
        document.getElementById("senha").value;


    try {

        const response = await fetch(
            "/api/login",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email,
                    senha
                })
            }
        );


        const data = await response.json();


        if (!response.ok) {

            mensagem.textContent =
                data.erro || "Erro ao fazer login.";

            return;
        }


        /*
         * Guarda temporariamente os dados
         * do usuário no navegador.
         */
        localStorage.setItem(
            "usuario",
            JSON.stringify(data.usuario)
        );


        mensagem.textContent =
            "Login realizado com sucesso!";


        setTimeout(() => {

            window.location.href = "/";

        }, 500);


    } catch (error) {

        console.error(error);

        mensagem.textContent =
            "Não foi possível conectar ao servidor.";
    }

});