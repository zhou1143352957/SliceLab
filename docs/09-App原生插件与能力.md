# 09 App 原生插件与能力

## 适用范围

- 需要在 uni-app App 端调用原生能力（Android/iOS）时使用。
- 包含内置插件、本地原生插件、云端插件的接入与打包约束。

## 规则

- App 原生插件通过 `uni.requireNativePlugin` 调用，禁止在 H5/小程序端直接依赖该能力。
- 原生插件代码目录统一放 `nativeplugins/`，并在 `manifest.json` 中声明配置。
- 自定义基座仅用于调试验证；正式发布必须重新云打包，不能把调试基座当正式包。
- 内置插件优先，确需扩展再选本地插件或云端插件，减少维护成本。
- 插件调用必须有端能力判断与降级路径，避免非 App 端崩溃。
- 鸿蒙能力扩展不走 Android/iOS 原生语言插件链路，优先采用 UTS 与鸿蒙专题文档路线。

## 示例

- App 端在能力模块中封装 `uni.requireNativePlugin('plugin-id')`，页面层只调封装方法。
- 调试阶段使用自定义基座验证插件可用性，发布阶段改为云打包正式包。
- 非 App 端进入同流程时，返回“当前平台不支持该能力”的降级提示。

## 反例

- 在 H5 页面直接调用 `uni.requireNativePlugin`，导致运行时报错。
- 插件目录散落在业务模块中，`manifest.json` 无统一声明，后续无法稳定打包。
- 调试通过后直接分发自定义基座，造成正式环境能力不一致。
- 把鸿蒙扩展直接套用 Android/iOS 原生插件流程，导致实现路径错误。

## 检查项

- 插件能力是否仅在 App 平台触发。
- `nativeplugins` 与 `manifest.json` 配置是否一致且可追溯。
- 调试基座与正式发布包流程是否明确分离。
- 非 App 端是否存在可用降级路径。
- 鸿蒙扩展是否采用 UTS/鸿蒙路线而非 Android/iOS 插件路线。

## 来源

- 官方教程（2026-02-11 查阅）：https://uniapp.dcloud.net.cn/plugin/native-plugin.html
- 官方教程（2026-02-11 查阅）：https://uniapp.dcloud.net.cn/tutorial/harmony/native-api.html
- 官方教程（2026-02-11 查阅）：https://uniapp.dcloud.net.cn/tutorial/harmony/history.html
