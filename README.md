# dsh-subagent-model-freedom

让 DSH 子代理可以自由选择模型路由的插件。

## 解决什么问题

DSH 的 `subagent` 工具默认**不暴露** `provider` / `model` 参数——子代理只能继承父会话的模型路由。要让子代理能用别的模型（比如 WorkBuddy 的免费 hy3），标准做法是开 `subagent-model-selection-settings` 的 `enabled` 并配 `allowedModels`，但：

- 那是 Host 级设置，要在 GUI 里点（或手写 patch），且**只对新会话生效**；
- `allowedModels` 要逐条手填。

本插件把它简化成**一个插件条目**：装上后，每个新创建的顶层会话自动被注入一个 `subagent/model-selection-policy` 事件，授权配置里的 routes。子代理工具随之暴露 `provider`/`model`/`reasoning_effort` 参数，AI 就能说「派个小弟，用 workbuddy/hy3」。

**默认配置就授权 WorkBuddy 的两个免费模型**（`hy3` ×0.00 限时免费、`step-5-preview` ×0.00 独家限免），装上即用、不烧积分。

## 安装

### 方式 A：本地目录（开发/试用）

在 web profile 的 `cordis.patch.yml`（`C:\Users\<你>\.dsh\profiles\web\cordis.patch.yml`）末尾追加：

```yaml
- insert:
    - id: subagent-model-freedom
      name: dsh-subagent-model-freedom
      config:
        routes:
          - provider: workbuddy
            model: hy3
          - provider: workbuddy
            model: step-5-preview
        injectIntoSubagentSessions: false
```

然后让 DSH 能 resolve 这个包。最简单：把本目录软链或拷进 profile 的 `node_modules`：

```bash
# Windows (PowerShell，管理员)
New-Item -ItemType SymbolicLink -Path "C:\Users\<你>\.dsh\profiles\web\node_modules\dsh-subagent-model-freedom" -Target "C:\Users\<你>\Documents\deepseek-harness\default-workspace\dsh-subagent-model-freedom"
```

或在 profile 的 `package.json` 里加 `"dsh-subagent-model-freedom": "file:../default-workspace/dsh-subagent-model-freedom"` 后 `pnpm install`。

### 方式 B：npm 发布后

```bash
dsh plugin --profile web add dsh-subagent-model-freedom
```

## 验证

装好后**新建一个对话**（插件只对新会话生效）。在新会话里：

- `list_subagent_models` 工具应出现在 AI 工具表里；
- `subagent` 工具应多出 `provider` / `model` / `reasoning_effort` 参数；
- 派子代理时可以指定 `provider: "workbuddy", model: "hy3"`，小弟跑在免费模型上。

## 配置

| 字段 | 默认 | 说明 |
|---|---|---|
| `routes` | `[{workbuddy,hy3},{workbuddy,step-5-preview}]` | 授权的 provider/model 路由列表 |
| `injectIntoSubagentSessions` | `false` | 是否也给子代理会话注入策略（默认 false，让继承链自然工作） |

想加更多模型就往 `routes` 里加，比如：

```yaml
routes:
  - provider: workbuddy
    model: hy3
  - provider: workbuddy
    model: glm-5.3      # 想烧积分的话
  - provider: deepseek-official
    model: deepseek-flash
```

## 机制

- 监听 `session/created`（时序早于 `agent/created`）；
- 对新顶层会话 `session.append('subagent/model-selection-policy', { allowedModels: routes })`；
- `tool-subagent` 在 `agent/created` 的 `selectForSession` 里读 `subagentModelSelectionPolicy` projection，策略事件存在 → 安装带参数的 subagent 工具定义；
- projection 由 `tool-subagent` 注册（`subagentModelSelectionProjectionDefinition`），本插件只负责 append 事件，不碰 projection。

## 与 cost-meter 对账的关系

这个插件**不修** cost-meter 把 WorkBuddy token 当人民币折算的问题（那是 cost-meter 的 `pricing.js` auto 兜底模糊匹配 bug，详见 [dsh-cost-meter](https://github.com/Han-1413141/dsh-cost-meter)）。它只让子代理能用 WorkBuddy 模型。要修 cost-meter 的误算，见 cost-meter 的修复方向（给 `workbuddy` provider 加计费守卫）。

## License

MIT
