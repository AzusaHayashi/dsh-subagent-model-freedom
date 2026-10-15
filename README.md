# dsh-subagent-model-freedom

让 DSH 子代理可以自由选择模型路由的插件。

## 解决什么问题

DSH 的 `subagent` 工具默认**不暴露** `provider` / `model` 参数——子代理只能继承父会话的模型路由。要让子代理能用别的模型（比如 WorkBuddy 的免费 hy3），标准做法是开 `subagent-model-selection-settings` 的 `enabled` 并配 `allowedModels`，但：

- 那是 Host 级设置，要在 GUI 里点（或手写 patch），且**只对新会话生效**；
- `allowedModels` 要逐条手填。

本插件把它简化成**一个插件条目**：装上后，每个新创建的顶层会话自动被注入一个 `subagent/model-selection-policy` 事件，把授权的 routes 灌进 `allowedModels`。子代理工具随之暴露 `provider`/`model`/`reasoning_effort` 参数，AI 就能说「派个小弟，用 workbuddy/hy3」。

不写 `config:` 时走代码里的默认授权：**WorkBuddy 的两个免费模型**（`hy3` ×0.00 限时免费、`step-5-preview` ×0.00 独家限免），装上即用、不烧积分。

> **限免会过期，让子代理自己核对。** 这些免费标签（`限时免费` / `独家限免`）是上游 WorkBuddy 的促销，随时可能结束。好在 `list_subagent_models` 返回的模型名自带实时费率——`dsh-workbuddy-connect` 把 catalog 的 `credits` 和 `badges` 折进了 `model.name`。所以派小弟前让它先 `list_subagent_models` 一把，看到 `x0.00 credits` 再指定，看到 `x0.29 credits` 就换模型或别指定。默认 routes 只是省一次手动配置，**不是**永久免费承诺。

## 安装

### 方式 A：本地目录（开发/试用）

在 web profile 的 `cordis.patch.yml`（`C:\Users\<你>\.dsh\profiles\web\cordis.patch.yml`）末尾追加：

```yaml
- insert:
    - id: subagent-model-freedom
      name: dsh-subagent-model-freedom
```

就这样，不用写 `config:` —— 默认就授权 WorkBuddy 的免费模型。想自己指定模型列表才需要写 `config:`（见下方「配置」）。

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

派之前可以先让它自己核对费率，它会看到：

```
workbuddy/hy3 — Hy3 · x0.00 credits · 限时免费
workbuddy/step-5-preview — Step-5-Preview · x0.00 credits · 独家限免
```

## 配置

`config:` 整块都是**可选**的，不写就走默认。

| 字段 | 默认 | 说明 |
|---|---|---|
| `routes` | `[{workbuddy,hy3},{workbuddy,step-5-preview}]` | 授权的 provider/model 路由列表 |
| `injectIntoSubagentSessions` | `false` | 是否也给子代理会话注入策略（默认 false，让继承链自然工作） |

想自己指定模型列表才写 `config:`，比如：

```yaml
- insert:
    - id: subagent-model-freedom
      name: dsh-subagent-model-freedom
      config:
        routes:
          - provider: workbuddy
            model: hy3
          - provider: workbuddy
            model: glm-5.3      # 想烧积分的话
          - provider: deepseek-official
            model: deepseek-flash
```

把 `routes` 设成空数组则禁用（等价于不装本插件）。

## License

MIT
