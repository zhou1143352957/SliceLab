# 15 Vue 组合式 API 实践

## 适用范围

- 在 uni-app Vue3 项目中使用 `setup`、`ref/reactive`、`computed/watch`、组合函数时使用。

## 规则

- 组合式 API 逻辑统一放 `setup` 或 `script setup`，避免与 Options API 在同组件中无序混用。
- `setup` 中不使用 `this`，组件状态与方法通过返回值或模板自动暴露。
- 基础类型优先 `ref`，对象结构优先 `reactive`；对外暴露时注意解构后的响应性保持。
- 派生状态优先 `computed`，副作用监听使用 `watch/watchEffect`，避免职责交叉。
- `watch` 仅监听必要源并处理清理逻辑，避免深监听滥用导致性能问题。
- 生命周期钩子在组合式 API 中通过 `onMounted/onUnmounted` 等显式声明，副作用必须可回收。
- 通用业务逻辑提取为 `composables/useXxx`，页面层只做编排与参数传递。
- 异步流程统一暴露 `loading/error/data` 三态，避免 UI 无反馈。

## 示例

- `ref` 管理表单输入，`computed` 生成提交按钮可用态。
- `watch` 监听查询条件变化后触发请求，并在下一次请求前取消旧副作用。
- `useImageSlice` 组合函数封装切片参数校验、执行状态和错误信息。

## 反例

- 在 `setup` 中写 `this.xxx` 访问实例，导致运行时异常。
- 直接解构 `reactive` 对象后在模板中使用，状态更新不同步。
- 在 `watchEffect` 内执行重请求且无清理，造成重复请求与资源泄漏。
- 业务页面把所有逻辑堆在单组件，不提取可复用组合函数。

## 检查项

- 组件是否清晰区分响应式状态、派生状态与副作用监听。
- `ref/reactive` 使用是否符合数据结构与响应性要求。
- 监听逻辑是否存在清理与性能控制。
- 可复用逻辑是否提取到 `composables` 并具备明确输入输出。
- 异步流程是否具备 `loading/error/data` 可观测状态。

## 来源

- 官方教程（2026-02-11 查阅）：https://uniapp.dcloud.net.cn/tutorial/vue-composition-api.html
