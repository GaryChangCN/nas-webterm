# AGENTS.md — 开发与维护约定

本文件面向维护本仓库的开发者与自动化编码代理，不是普通用户的部署入口。用户安装与使用说明放在 [README.md](<README.md>)；贡献流程见 [CONTRIBUTING.md](<CONTRIBUTING.md>)。

## 项目定位

- 单用户、可信网络环境下的轻量浏览器终端，提供容器 shell、SSH 客户端与 tmux。
- 官方公共镜像：`ghcr.io/garychangcn/nas-webterm`，支持 `linux/amd64` 和 `linux/arm64`。普通用户直接使用发布镜像，不应被要求 fork、配置 Actions、发布 GHCR 包或本地构建。
- 容器 shell 不是 NAS 宿主机 shell。容器以 root 运行，不提供多租户隔离或生产级身份平台。
- 不改变现有用户的部署、密码、存储挂载、端口绑定或反代配置，除非用户明确授权；不能把维护某台设备的配置写进公共项目。

## 文件与职责

- [Dockerfile](<Dockerfile>)：Alpine 3.22 多阶段镜像；构建阶段提取并增强 ttyd 页面，运行阶段不安装 Node.js 或 Python。
- [entrypoint.sh](<entrypoint.sh>)：校验认证配置，启动 writable ttyd，并保留 Origin 检查。
- [healthcheck.sh](<healthcheck.sh>)：未认证 HTTP 请求必须返回 401；不能把不需要登录当成健康。
- [web/keys.js](<web/keys.js>)：纯按键编码，不访问 DOM、凭据或网络。
- [web/controls.js](<web/controls.js>)、[web/controls.css](<web/controls.css>)：终端辅助栏、移动布局与工具栏粘贴预览。
- [scripts/build_frontend.py](<scripts/build_frontend.py>)：从实际安装的 ttyd 导出 self-contained HTML，校验后注入本地 CSS/JS，不直接修改上游 minified bundle。
- [compose.yaml](<compose.yaml>)、[.env.example](<.env.example>)：可选的仓库部署模板；[compose.build.yaml](<compose.build.yaml>) 仅供开发者本地构建。
- [tests](<tests/>) 与 [playwright.config.cjs](<playwright.config.cjs>)：按键、认证、真实 PTY 和响应式界面的测试。
- [.github/workflows/image.yml](<.github/workflows/image.yml>)：原生双架构构建、验证和发布。
- [SECURITY.md](<SECURITY.md>)、[THIRD_PARTY_NOTICES.md](<THIRD_PARTY_NOTICES.md>)：安全边界及第三方许可。

## 隐私与发布边界

只提交通用实现与虚构示例。禁止提交或记录：

- 真实设备 IP、主机名、公网入口、账户名、家目录、设备卷路径、网络拓扑或库存清单；公开仓库及其镜像的固有身份除外。
- 密码、访问令牌、SSH 公私钥、主机指纹、真实 `.env`、解析后的真实 Compose、容器环境变量全集。
- 用户终端输入、shell 历史、未经脱敏的日志、生产截图或浏览器 trace。
- 设备专用部署/回退脚本、配置备份、测试生成页面与本地依赖目录。

读取设备配置时仅输出必要且经过筛选的字段，不打印认证材料。测试应使用独立临时容器和明确标为测试的凭据，不能复用用户密码或挂载真实用户数据。不能为方便调试而弱化宿主机权限或把私有文件放入公共构建上下文。

## 必须保留的安全语义

1. `TTYD_PASS` 必填且没有默认密码；`TTYD_USER` 默认 `terminal` 且不得包含冒号。不要硬编码凭据。
2. 保留 `--writable`、`--check-origin`、连接数限制、`tini` 及健康检查。不通过关闭 Origin 检查来掩盖反代配置错误。
3. 不默认挂载宿主机根目录、Docker socket 或存储卷，不启用 `privileged`。默认只持久化 SSH 专用目录和共享目录。
4. 保留 `no-new-privileges` 和进程数限制。容器 root 不等于绝对安全隔离。
5. HTTP Basic 认证不加密传输。文档必须建议 HTTPS 或可信 VPN；监听所有接口不代表启用了 TLS。
6. 目标设备必须自行开启 SSH 并提供合法认证。建议在容器内生成专用密钥，核验主机指纹，不复制电脑私钥、不禁用主机密钥校验。
7. tmux 只能帮助任务跨浏览器断开存活，不能让进程跨容器停止、重启或重建存活。不要把目录持久化表述成进程持久化。

## ttyd / xterm 前端集成

- 当前固定 `ttyd=1.7.7-r0`。已核验其前端暴露 `window.term`，并提供 `input(data, true)`、`fit()`、`paste()` 等接口。它不是承诺长期稳定的插件 API，升级前必须重新核验。
- 控制键通过 `window.term.input(sequence, true)` 进入原生 `onData → sendData → 已认证 WebSocket`。`write()` 只写显示内容，不能代替输入。不要假定存在 `window.terminal`、`term.socket` 或 `term.sendData`。
- 方向键根据 `term.modes.applicationCursorKeysMode` 选择 CSI 或 SS3；Ctrl/Alt 与方向键需要正确的修饰码。
- WebSocket 观察器只监听同源 ttyd 连接状态，不改写载荷或身份信息。连接未就绪或已断开时拒绝辅助输入，禁止缓冲危险命令后在重连时重放。
- ttyd 协议前缀是 ASCII `'0'`、`'1'`、`'2'`、`'3'`，不是 NUL 等数值控制字节。调用 `term.input()` 时不自行加协议前缀。
- CLI renderer 参数是 `rendererType`，取 `webgl`、`canvas`、`dom`；不要杜撰 `enableWebGL`。服务端 preferences 可能晚于 title 到达，保存字号须在 preferences 应用后重施。
- ttyd 的 `--index` 提供单个 HTML，不是静态文件目录；增强资源保持 inline，不依赖外部 CDN。反代仍需正确转发原有 token、WebSocket 与路径。

## 交互约定

- 桌面保留实体键盘与原生粘贴。移动基础键始终可见、触控目标尽量不小于 44px，不把方向键藏到横向滚动区。
- Ctrl/Alt 是显式辅助键组合：点选字母或方向键，发送后清除；不要为此拦截手机 IME 的正常合成输入。
- 辅助键的 `pointerdown` 不抢走终端 textarea 焦点。键盘按钮必须在用户手势内开关焦点，避免 focusout 与 click 的状态竞态。
- 结合 `visualViewport`、safe-area、横竖屏和 ResizeObserver 计算真实终端高度，再调用 `fit()`；不能只把工具栏盖在输出上。
- 工具栏粘贴通过 textarea 预览，使用 `term.paste()` 保留 bracketed-paste 语义。多行/部分控制字符要求确认；是否追加 Enter 必须明确。此确认不覆盖直接系统粘贴，也不是命令沙箱。
- 剪贴板 API 可能要求 HTTPS 或 localhost、用户手势和授权；失败时提供手动粘贴路径。
- `localStorage` 仅保存 10–28px 的字号偏好，不保存凭据、终端文本或剪贴板内容。
- 不把 Chromium 触控/尺寸模拟等同于实机 iPhone、Safari 或真实软键盘验证。说明实际测试覆盖和限制。

## 开发与验证

测试工具版本见 [package.json](<package.json>) 和 [pnpm-lock.yaml](<pnpm-lock.yaml>)；Node.js 只用于开发测试。

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm test
sh -n entrypoint.sh
bash -n tests/smoke.sh
python3 -m py_compile scripts/build_frontend.py
```

本地镜像测试：

```sh
docker build -t nas-webterm:dev .
TEST_IMAGE=nas-webterm:dev bash tests/smoke.sh
```

要连同真实容器运行浏览器测试，先安装 Playwright 所需浏览器及系统依赖，再执行：

```sh
pnpm exec playwright install --with-deps chromium
TEST_IMAGE=nas-webterm:dev RUN_BROWSER_TESTS=1 bash tests/smoke.sh
```

- 浏览器测试默认访问临时容器的 loopback 端口，测试凭据不是产品默认账号密码。
- 覆盖桌面、手机与 320px 小屏；验证常用键、应用光标模式、组合键、粘贴确认、字号和焦点。真实 PTY 测试还检查箭头字节与 Ctrl+C 中断。
- [tests/preview-server.cjs](<tests/preview-server.cjs>) 只是本机视觉预览，使用模拟 PTY，不能用其结果代替真实终端端到端测试。
- 预览、依赖、截图、trace、报告及 Python 缓存应保持被忽略。提交前运行 `git diff --check` 并检查新增文件是否含隐私。

## 发布与文档

- Actions 在原生 AMD64 与 ARM64 runner 上构建和测试。AMD64 还运行浏览器测试，通过后才发布架构镜像并合成多架构标签。
- 标准分发地址始终使用项目实际公开镜像，不在用户 README 中要求读者把 OWNER 替换成自己或自行发布镜像。
- `latest` 可变；复现部署推荐记录版本或不可变摘要。第三方国内代理不是官方服务，不承诺可用性，必要时校验与官方摘要一致。
- 新建或迁移维护者的发布仓库时，确认包的公开可见性和 Actions 写包权限；这是维护流程，不是普通用户安装步骤。
- 仅文档变更不应改变运行镜像、部署实例或用户配置。重写历史/force push 必须得到明确授权，并说明 GitHub 缓存、PR 引用和第三方克隆无法仅靠 force push 擦除。
- 更新组件时保留并核对 MIT 与第三方版权声明；不要删除许可来缩短页面。
