# Book Hermes Agent 设计文档

## 目标

在当前工作区内规划并启动一个独立的 Book Hermes Agent 项目。

推荐方案是：
- 以 Hermes 作为宿主 Agent 框架
- 以 InkOS 作为书籍领域引擎
- 以 copy / vendor / adapter 为主，而不是跨语言重写
- 以本仓内 copy 后的本地实现为准，不依赖运行时对接上游 Hermes 或 InkOS 的安装体、服务或包分发
- 以最小可用的书籍 Agent 为第一阶段目标，不优先迁移 InkOS 的 Studio/TUI/UI 壳层

## 结论摘要

推荐采用双运行时、单产品架构：
- Python 宿主层承接 Hermes 的 Agent 循环、工具系统、插件装配、会话与记忆能力
- Node 引擎层承接 InkOS 的书籍领域核心能力，包括自然语言交互 runtime、写作流水线、状态文件、导出和短篇生产能力
- 两层之间通过一个明确的适配边界通信，而不是让 Hermes 直接吞并 InkOS 全部源码，也不是把 InkOS 全部重写成 Python

这是当前最符合“优先代码 copy 迁移融合、尽量减少开发工作量”的路径。
这里的“采用 Hermes / InkOS”指复用其源码结构、能力边界与关键实现切片，并在本仓内 vendor / adapt 成为本地实现，而不是在运行时去连接外部 Hermes 或 InkOS 系统。

## 硬约束

### 1. 许可约束

- Hermes 上游许可为 MIT
- InkOS 根仓库与 core/cli 包为 AGPL-3.0-only
- 在“源码 copy 融合”为主的前提下，新项目默认按 AGPL 约束处理
- 后续若要改变许可边界，需要额外法务判断，不应在技术方案中假定可规避

### 2. 技术约束

- Hermes 为 Python 3.11+ 项目
- InkOS 为 Node 20+ / pnpm / TypeScript monorepo
- 因此 copy 优先的融合不应以单运行时为第一目标
- 第一阶段优先保持双运行时边界，避免高成本重写

### 3. 范围约束

第一阶段只做“书籍 Agent 产品化”，不做完整 UI 合并：
- 不优先迁移 InkOS Studio
- 不优先迁移 InkOS TUI
- 不优先迁移 Hermes Gateway / ACP / Dashboard 等外围能力
- 优先完成对话、工具、书籍流水线、状态与导出

### 4. 前端约束

- 当前阶段不做 UI 主线开发
- 在完成核心 copy 和适配后，如需要恢复或建设可视化前端，优先统一到 antd v6
- 不应先在 antd v5 或多套 UI 方案上继续扩写，再回头迁移

## 推荐架构

## 总体结构

```text
book-agent/
  host-python/        # Hermes 宿主层
  engine-node/        # InkOS 书籍引擎层
  shared/             # 跨运行时契约、示例、文档
  projects/           # 书籍工作区
  docs/plans/         # 设计与实施计划
```

## 分层职责

### host-python

职责：
- 复用 Hermes 的主对话循环
- 复用 Hermes 的工具注册与插件装配机制
- 复用 Hermes 的会话、记忆、配置、技能体系
- 向上提供 Book Hermes Agent 的统一入口
- 向下调用 Node 书籍引擎

### engine-node

职责：
- 复用 InkOS 的书籍领域逻辑
- 提供建书、草案收敛、写下一章、修订、真相文件修改、导出、短篇生产等能力
- 对外暴露可被 Python 宿主调用的稳定接口

### shared

职责：
- 放置跨运行时数据契约
- 统一请求 / 响应 schema 命名
- 存放架构约束和集成协议文档

## 为什么选 Hermes 作为宿主

1. Hermes 已经具备成熟的 Agent 宿主能力：主循环、工具注册、插件系统、会话与记忆。
2. InkOS 的 CLI 自然语言入口本身很薄，核心价值在 packages/core，而不是在 CLI/TUI 壳层。
3. 把书籍能力注入 Hermes 插件体系，比把 Hermes 的通用 Agent 中台改写进 InkOS 成本更低。
4. 这条路径最利于先做出一个独立可用的 Book Hermes Agent，再逐步把 InkOS 里的领域逻辑深拷贝进来。

## InkOS 迁移优先级

## 第一优先级：直接可迁的领域核心

建议优先 copy / vendor：
- packages/core/src/interaction/
- packages/core/src/pipeline/
- packages/core/src/models/
- packages/core/src/state/
- packages/core/src/utils/ 中与书籍、路径安全、长度治理、导出、outline 路径相关的模块
- packages/core/src/agents/ 中与 planner、composer、writer、reviser、continuity、short-fiction 直接相关的模块

关键入口：
- processProjectInteractionInput
- processProjectInteractionRequest
- runInteractionRequest
- createInteractionToolsFromDeps
- PipelineRunner
- runShortFictionProduction
- generateShortFictionCover

## 第二优先级：可保留但首期不直连给用户的能力

建议延后接入：
- InkOS 的 agent 目录下基于 pi-agent 的会话层
- 与 TUI 强绑定的 session bridge
- Studio 专用配置与可视化控制逻辑

## 不推荐首期迁移

明确不要在第一阶段搬入：
- packages/studio/
- packages/cli/src/tui/
- InkOS 全套 UI 资产
- Hermes 的 gateway/
- Hermes 的 acp_adapter/
- Hermes 的 web/ 和 tui_gateway/

## 第一版仓库骨架

```text
book_agent/
  AGENTS.md
  DESIGN.md
  docs/
    plans/
      2026-05-26-book-hermes-agent-design.md
      2026-05-26-book-hermes-agent-migration-plan.md
  host-python/
    README.md
    plugins/
      book/
        README.md
    tests/
      README.md
  engine-node/
    README.md
    vendor/
      inkos-core/
        README.md
    src/
      adapters/
        README.md
  shared/
    contracts/
      README.md
  projects/
    README.md
  scripts/
    README.md
```

## 分阶段 copy 清单

## Batch 0：框架落位

目标：先把仓库结构和约束稳定下来。

要做：
- 建立 host-python / engine-node / shared / projects / docs/plans 目录
- 写 AGENTS.md、DESIGN.md、设计文档、迁移计划
- 确定 AGPL 作为当前默认许可前提

不要做：
- 不写 UI
- 不改 Hermes 上游主循环逻辑
- 不复制 InkOS 整个 monorepo

## Batch 1：薄桥接版本

目标：先跑通 Book Hermes 的主调用链。

要 copy / 接入：
- Hermes 的插件宿主和工具注册机制
- InkOS 的 CLI / JSON 交互入口语义
- 先通过 Node 适配器或 CLI bridge 提供以下工具：
  - develop_book
  - create_book
  - write_next
  - revise_chapter
  - rename_entity
  - update_author_intent
  - update_current_focus
  - edit_truth
  - export_book

不要做：
- 不迁 Studio
- 不迁 TUI
- 不迁 InkOS 的前端主题和组件

## Batch 2：从桥接切到内嵌 core

目标：减少 CLI 壳依赖，转向稳定的 Node 领域引擎。

要 copy / vendor：
- InkOS packages/core/src/interaction/
- InkOS packages/core/src/pipeline/
- InkOS packages/core/src/models/
- InkOS packages/core/src/state/
- 必需的 agents 与 llm/provider 支撑模块

对外接口收敛为：
- runInteraction
- writeNextChapter
- reviseDraft
- exportBook
- shortFictionRun
- generateCover

不要做：
- 不保留与 InkOS CLI 展示层强耦合的逻辑
- 不把 pi-agent 会话层作为 Book Hermes 的主对话框架

## Batch 3：领域增强与稳定性

目标：补足记忆、错误恢复、持久化和观测。

要做：
- 将 Hermes 会话信息与书籍工作区绑定
- 统一工具错误模型
- 补导出、恢复、trace、审计结果结构化输出
- 增加契约测试与端到端 smoke 路径

## Batch 4：可视化层统一

目标：核心 copy 完成后再谈 UI。

要做：
- 如果需要管理界面，优先按 antd v6 重新组织
- 先统一设计 token、导航模型和书籍域页面，再考虑吸收 InkOS Studio 的具体交互

不要做：
- 不在核心未稳定时提前投入 Studio 迁移
- 不同时维护多套 UI 框架

## 首版接口边界

Python 宿主对 Node 引擎只暴露有限接口：
- run_interaction
- create_book
- develop_book
- write_next
- revise_chapter
- rename_entity
- update_author_intent
- update_current_focus
- edit_truth_file
- export_book
- short_fiction_run
- generate_cover

这些接口之外的实现细节都留在 Node 引擎内部，不泄漏 InkOS 全量内部结构到宿主层。

## 首版命令范围

保留为产品能力的命令语义：
- interact
- create book
- continue / write next
- revise chapter
- rename entity
- edit truth
- export
- short run

不要直接暴露的命令：
- InkOS Studio 启动命令
- InkOS TUI 启动命令
- InkOS 原始调试 / analytics / eval / radar / detect 全量命令
- Hermes 的 gateway / acp / dashboard / messaging 平台命令

## 风险与应对

### 风险 1：双运行时复杂度

应对：
- 先把跨运行时协议收窄到少量稳定接口
- 所有请求和响应做契约化

### 风险 2：InkOS 复制范围失控

应对：
- 只允许按批次 vendor 必要目录
- 每次 vendor 都要记录来源、裁剪原因和替代策略

### 风险 3：UI 过早分散注意力

应对：
- 第一阶段禁止 UI 主线开发
- 等核心 copy 完成后再进入 antd v6 统一改造

## 成功标准

满足以下条件即可视为第一阶段方向正确：
- 通过 Hermes 宿主对外提供一个可工作的 Book Agent
- 可以完成建书、续写、修订、改名、真相文件修改、导出至少 6 类核心动作
- InkOS 核心复用比例明显高于重写比例
- 首版不依赖 InkOS Studio/TUI 仍然可以独立使用
