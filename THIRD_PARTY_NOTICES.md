# Third-party notices / 第三方声明

## 本项目辅助控件

本项目自行编写的辅助栏、按键编码与前端集成脚本按 [项目 MIT License](<LICENSE>) 提供：

> Copyright (c) 2026 nas-webterm contributors

本项目的许可不替代上游组件及其依赖各自的许可。下文保留 ttyd 与 stock 前端中 xterm.js 的上游版权及 MIT 许可原文；其他预装软件与 stock bundle 的其余依赖仍适用其各自许可，应同时保留发行包及上游随附的许可声明。

## 前端来源与集成边界

- 集成基线为 Alpine 包 `ttyd=1.7.7-r0`，对应 ttyd 上游 **1.7.7**。镜像构建时从镜像中实际安装的 ttyd 二进制通过本地 HTTP 提取其 stock 单文件 HTML，而不是使用另行拼装的终端客户端。
- 保留 stock 的 minified JavaScript bundle，不修改其内部实现；仅向 HTML 注入本项目的本地 CSS / JavaScript 与 viewport 配置。运行页面不加载 CDN 资源。终端仍通过原 ttyd 的认证与 WebSocket 通道通信；不新增鉴权或代理接口。
- 按键辅助栏依赖 stock 暴露的 `window.term`、xterm 的 `input()` 及 ttyd 附加的 `fit()`；`window.term.input()` 经 stock 的 `onData` 进入既有发送路径。这是已对固定版本复核的集成点，不是对未来版本稳定性的承诺。
- 升级 ttyd、Alpine 包或其 stock 前端时，必须重新复核这些接口、连接状态处理、单文件资源结构、路径与 WebSocket 协议，并重新测试辅助栏。不能仅替换版本号后假定仍然兼容。

## ttyd 1.7.7 — MIT

- 上游仓库：[tsl0922/ttyd](https://github.com/tsl0922/ttyd)
- 固定标签：[1.7.7](https://github.com/tsl0922/ttyd/tree/1.7.7)
- 上游许可：[LICENSE at 1.7.7](https://github.com/tsl0922/ttyd/blob/1.7.7/LICENSE)

以下为该标签的许可原文：

```text
MIT License

Copyright (c) 2016-2022 Shuanglei Tao <tsl0922@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## xterm.js / @xterm/xterm 5.4.0 — MIT

ttyd 1.7.7 的 stock 前端包含 xterm.js。其上游 [锁文件](https://github.com/tsl0922/ttyd/blob/1.7.7/html/yarn.lock#L1315-L1320) 将 `@xterm/xterm` 固定到 **5.4.0**；本项目复用该 stock bundle，不单独从 CDN 下载 xterm。

- 上游仓库：[xtermjs/xterm.js](https://github.com/xtermjs/xterm.js)
- 固定标签：[5.4.0](https://github.com/xtermjs/xterm.js/tree/5.4.0)
- 上游许可：[LICENSE at 5.4.0](https://github.com/xtermjs/xterm.js/blob/5.4.0/LICENSE)

以下为该标签的许可原文：

```text
Copyright (c) 2017-2019, The xterm.js authors (https://github.com/xtermjs/xterm.js)
Copyright (c) 2014-2016, SourceLair Private Company (https://www.sourcelair.com)
Copyright (c) 2012-2013, Christopher Jeffrey (https://github.com/chjj/)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```
