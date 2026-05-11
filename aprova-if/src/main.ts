import './styles/global.css'
import './pages/home/home.css'

const app = document.querySelector('#app')

app!.innerHTML = `

<div class="main-layout">

<header class="navbar">

  <div class="container navbar-container">

    <div class="logo-area">
      <div class="logo-box"></div>

      <div>
        <h1>Aprova IF</h1>
        <span>Simulados IFC</span>
      </div>
    </div>

    <nav class="nav-links">
      <a href="#">Início</a>
      <a href="#">Provas</a>
      <a href="#">Ranking</a>
      <a href="#">Estatísticas</a>
      <a href="#">Como funciona</a>
    </nav>

    <div class="nav-buttons">
      <button class="btn btn-outline">
        Entrar
      </button>

      <button class="btn btn-primary">
        Criar conta
      </button>
    </div>

  </div>

</header>

<main>

<section class="hero section">

  <div class="container hero-container">

    <div class="hero-content fade-in">

      <span class="hero-badge">
        Plataforma gratuita de simulados IFC
      </span>

      <h1>
        Prepare-se para conquistar seu futuro no IFC
      </h1>

      <p>
        Resolva simulados, acompanhe seu desempenho e estude com provas reais do Instituto Federal Catarinense.
      </p>

      <div class="hero-buttons">

      `
