/** 让 DSH 子代理可以自由选择模型路由的插件。 */
export interface AllowedRoute {
  provider: string
  model: string
}
export interface Config {
  routes: AllowedRoute[]
  injectIntoSubagentSessions: boolean
}
export declare class SubagentModelFreedom {
  constructor(ctx: unknown, config: Config)
  routes: readonly AllowedRoute[]
  injectIntoSubagentSessions: boolean
  injectPolicy(session: unknown): void
}
export declare function apply(ctx: unknown, config: Config): void
export declare const name: string
export default SubagentModelFreedom
