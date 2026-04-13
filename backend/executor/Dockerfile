# backend/executor/Dockerfile
FROM ubuntu:22.04

# Avoid timezone prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install Node.js, Python and GCC
RUN apt-get update && \
    apt-get install -y curl python3 python3-pip g++ && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Create a non-root user for executing the code safely
RUN useradd -m -s /bin/bash runner

WORKDIR /code
RUN chown -R runner:runner /code
USER runner

CMD ["tail", "-f", "/dev/null"]