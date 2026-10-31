# 贡献指南 / Contributing

欢迎通过 Issue 或 Pull Request 改进 nas-webterm。请保持变更小而清晰，先说明问题与预期行为；较大的功能或安全边界变更请先讨论。

## 隐私与安全 / Privacy and security

- 只提交通用代码、文档和虚构示例。不要提交用户信息、真实 NAS IP、NAS 目录、电脑名、私有项目名称、主机指纹、密码、令牌、SSH 公钥或私钥。
- 不要提交 `.env`、数据目录、真实运行日志、终端历史或未经脱敏的截图；示例变量写在 [.env.example](.env.example)，且不得包含可用凭据或默认密码。
- 主机存储挂载示例统一使用 `/your/storage/path:/mnt/storage:rw`，不得使用实际设备路径。
- 安全漏洞请遵循 [SECURITY.md](SECURITY.md)，不要在公开讨论中披露利用细节或敏感材料。

## 保持设计边界 / Design boundaries

- Alpine 3.22；组件为 `ttyd`、`bash`、`openssh-client`、`tmux`、`curl`、`tini`。
- 容器内以 root 运行，但不得默认加入 Docker socket、`privileged` 或 NAS 存储卷。默认挂载仅为 `./data/ssh:/root/.ssh` 和 `./data/share:/share`。
- 默认绑定 `127.0.0.1:7681`，由 `WEB_BIND_IP` 显式调整。`WEBTERM_IMAGE` 必填；网页登录使用 Basic auth，`TTYD_USER` 默认 `terminal`，`TTYD_PASS` 必填且无默认密码，经 `.env` 配置。
- 不弱化 HTTP 风险提示；长期部署必须使用 HTTPS 或可信 VPN。不宣称具备生产级鉴权或多用户隔离。
- 保留容器与宿主机 shell 的区别说明。SSH 需目标服务与认证；密钥在容器内专门创建，不复制电脑私钥。
- `tmux` 可以延续浏览器断开后的会话，但不在容器重启后保留进程。

## 提交前检查 / Before submitting

1. 使用已脱敏配置验证标准部署：复制 [.env.example](.env.example) 为 `.env`，填写镜像、密码与绑定地址，再执行 `docker compose pull && docker compose up -d`。
2. 涉及镜像或启动逻辑时，验证 `docker compose -f compose.build.yaml up -d --build`，并注明实际测试的平台和限制；未测试的平台不要声称已验证。
3. 检查空密码被拒绝、默认监听地址、登录、SSH 客户端、共享目录和 `tmux` 的断线行为；会话在容器重启后不保留是预期限制。
4. 发布配置使用 `ghcr.io/<owner>/nas-webterm`。ARM64 使用原生 `ubuntu-24.04-arm` runner；AMD64 使用原生 `ubuntu-24.04` runner，两者均包含在默认构建矩阵中。首次发布需确认 GHCR 包已设为 Public。
5. 同步更新 [README.md](README.md) 与相关安全说明，使用公共仓库相对链接。不要加入本地绝对路径、未经验证的兼容性承诺或非官方代理可靠性承诺。
6. 在 Pull Request 中简述变更、验证步骤、结果及已知限制；提交前再次检查新增内容没有敏感信息。

## 许可 / License

提交贡献即表示你有权提供该内容，并同意贡献按本项目 [MIT 许可证](LICENSE) 发布。请保留必要的许可证与版权声明。

Contributions are welcome through issues and pull requests. Keep changes focused, sanitize all examples, document what you actually tested, and preserve the project's single-user security boundaries. Never submit credentials, SSH keys, private paths, identifying host details, or real deployment data. Contributions are provided under the MIT license.
