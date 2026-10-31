FROM alpine:3.22 AS frontend
ARG TTYD_VERSION=1.7.7-r0
RUN apk add --no-cache "ttyd=${TTYD_VERSION}" python3
WORKDIR /build
COPY web/ ./web/
COPY scripts/build_frontend.py ./scripts/build_frontend.py
RUN python3 scripts/build_frontend.py --output /build/index.html

FROM alpine:3.22
ARG TTYD_VERSION=1.7.7-r0
RUN apk add --no-cache \
        "ttyd=${TTYD_VERSION}" bash openssh-client tmux ncurses-terminfo-base \
        iputils curl ca-certificates tzdata tini \
    && mkdir -p /root/.ssh /share \
    && chmod 700 /root/.ssh

COPY --from=frontend /build/index.html /usr/share/nas-webterm/index.html
COPY --chmod=755 entrypoint.sh healthcheck.sh /usr/local/bin/
COPY LICENSE /usr/share/licenses/nas-webterm/LICENSE
COPY THIRD_PARTY_NOTICES.md /usr/share/licenses/nas-webterm/THIRD_PARTY_NOTICES.md
ENV LANG=C.UTF-8 TZ=UTC TERM=xterm-256color
EXPOSE 7681
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/entrypoint.sh"]
