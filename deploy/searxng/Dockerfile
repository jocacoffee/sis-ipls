# SearXNG do iPLS: metabuscador usado pelo agente do chat (ferramenta buscar_internet).
# Fica só na rede interna dos contêineres (sem porta publicada); o iPLS o acessa em http://searxng:8080.
# Para atualizar, troque a versão abaixo (https://hub.docker.com/r/searxng/searxng/tags).
FROM searxng/searxng:2026.11.26-b5605b8f2
# Fora de /etc/searxng, que a imagem base declara como volume (lá a configuração antiga persistiria
# entre atualizações); assim cada deploy usa sempre o settings.yml do repositório.
COPY settings.yml /usr/local/searxng/ipls-settings.yml
ENV SEARXNG_SETTINGS_PATH=/usr/local/searxng/ipls-settings.yml
