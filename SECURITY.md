# 安全说明 / Security policy

nas-webterm 是单用户共享文件环境中的 Web 终端，不提供生产级鉴权、多用户隔离或安全托管服务承诺。拥有 Web 终端访问权的人能以容器内 root 身份执行命令，并能访问容器可见的文件及网络。

## 部署边界 / Deployment boundaries

- 默认监听 `127.0.0.1:7681`。改为 NAS 局域网 IP 或 `0.0.0.0` 会扩大暴露面，需自行限制防火墙、路由与访问来源。不要直接暴露公网。
- HTTP Basic auth 不是加密。**HTTP 会泄漏密码和终端内容，长期使用必须采用 HTTPS 或可信 VPN。** 配置反向代理时还需正确保护 WebSocket 终端连接。
- `TTYD_USER` 默认 `terminal`；`TTYD_PASS` 必填且没有默认值，经 `.env` 设置。使用独立强密码，不要将 `.env`、认证头或含凭据的日志提交到仓库。
- 容器以 root 运行，但默认不挂载 Docker socket、不启用 `privileged`、不挂载 NAS 存储卷。这些限制不保证绝对隔离；更新宿主机、Docker 和镜像，并只授予必要的目录与网络权限。
- 默认挂载仅为 `./data/ssh:/root/.ssh` 和 `./data/share:/share`。SSH 认证材料和共享文件可能被任何有终端访问权的人读取或修改。
- 挂载可写存储会允许容器修改或删除宿主机相应文件。避免挂载宿主机根目录、Docker socket 或无关敏感目录；备份重要数据。
- 容器 shell 不等于宿主机 shell。SSH 到局域网目标需要目标启用服务并提供合法认证。应在容器内创建专用密钥，不得复制电脑私钥；连接前核对主机身份，不要关闭主机密钥校验。
- `tmux` 只用于浏览器断开后的会话延续，不保证容器重启后保留会话，也不是安全隔离机制。

## 漏洞报告 / Reporting a vulnerability

请优先使用仓库 **Security → Report a vulnerability**（如果维护者已启用私密报告）。不要在公开 Issue、Pull Request、日志或截图中提交可利用的敏感细节。

若私密报告入口尚未启用，可创建不含漏洞细节和敏感信息的 Issue，请维护者提供私密沟通渠道；不要猜测联系邮箱。报告请提供受影响版本或镜像标签、已脱敏的最小复现、预期与实际行为、影响及可行的缓解措施。

**请勿提供用户信息、真实设备地址、NAS 目录、电脑名、主机指纹、密码、令牌或任何 SSH 密钥。** 使用虚构占位符替换全部敏感信息。

安全修复优先面向最新发布版本；旧版本不保证获得回补。本项目不承诺响应或修复时限。发现风险时，请先限制访问或停用服务，更新镜像，并按实际暴露情况轮换密码与专用密钥。

## English summary

This is a single-user shared terminal, not an isolated multi-user service. HTTP exposes credentials and terminal data: use HTTPS or a trusted VPN. Keep the service off the public internet, limit mounts, and never copy a computer's private SSH keys into the container. Report vulnerabilities privately through GitHub's reporting feature when available, with sanitized reproduction steps and no secrets. Security fixes prioritize the latest release; no response-time or backport guarantee is provided.
