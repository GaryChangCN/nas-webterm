FROM alpine:3.22

RUN apk add --no-cache \
        ttyd bash openssh-client tmux ncurses-terminfo-base \
        iputils curl ca-certificates tzdata tini \
    && mkdir -p /root/.ssh /share \
    && chmod 700 /root/.ssh

COPY --chmod=755 entrypoint.sh healthcheck.sh /usr/local/bin/
COPY LICENSE /usr/share/licenses/nas-webterm/LICENSE
ENV LANG=C.UTF-8 TZ=UTC TERM=xterm-256color
EXPOSE 7681
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/entrypoint.sh"]
