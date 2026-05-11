Bun.serve({
  port: 3000,

  async fetch(req) {

    const url = new URL(req.url)

    if (url.pathname === '/') {
      return new Response(
        await Bun.file('./index.html').text(),
        {
          headers: {
            'Content-Type': 'text/html',
          },
        },
      )
    }

    return new Response('Not Found', {
      status: 404,
    })
  },
})

console.log('Servidor rodando')