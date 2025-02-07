# [Choice] Node.js version (use -bookworm, or -bullseye variants on local arm64/Apple Silicon): 22, 20, 18, 22-bookworm, 20-bookworm, 18-bookworm, 22-bullseye, 20-bullseye, 18-bullseye
ARG VARIANT=22-bookworm
FROM mcr.microsoft.com/devcontainers/typescript-node:1-${VARIANT}

ARG SOLC_VERSION=0.8.28
ARG SLITHER_VERSION=0.10.4

ENV PIPX_HOME="/usr/local/share/pipx"
ENV PIPX_BIN_DIR="/usr/local/bin"

# [Optional] Uncomment this section to install additional OS packages.
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends pipx \
    && pipx ensurepath \
    && rm -rf /var/lib/apt/lists/*

# [Optional] Uncomment if you want to install an additional version of node using nvm
# ARG EXTRA_NODE_VERSION=10
# RUN su node -c "source /usr/local/share/nvm/nvm.sh && nvm install ${EXTRA_NODE_VERSION}"

# [Optional] Uncomment if you want to install more global node packages
# RUN su node -c "npm install -g <your-package-list-here>"

ENV PATH="/home/vscode/.local/bin:${PATH}"

# Set the default solc version: https://github.com/crytic/solc-select#usage
ENV SOLC_VERSION="${SOLC_VERSION}"

ENV SOLC_INSTALL_DIR="/usr/local/sbin"
ENV SOLC_PATH="${SOLC_INSTALL_DIR}/solc-v${SOLC_VERSION}"

# Install solc (required by Slither)
# https://docs.soliditylang.org/en/latest/installing-solidity.html#linux-packages
# https://github.com/crytic/solc-select
RUN if test "aarch64" = "$(lscpu | awk -F ':[ ]*' '/Architecture/ { print $2; }')"; then \
        curl -s -f -L "https://github.com/nikitastupin/solc/raw/main/linux/aarch64/solc-v${SOLC_VERSION}" -o "${SOLC_PATH}" \
        && chmod +x "${SOLC_PATH}" \
        && ln -fs ${SOLC_PATH} ${SOLC_INSTALL_DIR}/solc; \
    else \
        pipx install solc-select \
        && solc-select install "${SOLC_VERSION}"; \
    fi

# Install Slither: https://github.com/crytic/slither#how-to-install
RUN pipx install slither-analyzer=="${SLITHER_VERSION}"

RUN solc --version \
    && slither --version
