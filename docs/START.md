# SliceLab AI 执行入口

## 执行顺序

1. 先读 `docs/00-index.md` 了解工程规范切片。
2. 再读 `docs/business/10-slice-module.md` 对齐当前业务目标。
3. 然后按 `docs/TODO.md` 从上到下执行任务。

## 当前目标

- 当前阶段：MVP。
- 当前模块：图片网格切片（Canvas）。
- 当前平台：H5 + MP-WEIXIN + APP-ANDROID + APP-IOS。
- 目标链路：上传 -> 参数校验 -> 切片 -> 预览 -> 下载。

## 强约束

- 所有实现优先复用并遵守 `docs/` 规范，不跳过切片规则。
- 页面层不写复杂切图逻辑，核心逻辑统一封装在 `src/utils/image.ts`。
- 涉及多端行为必须按 `docs/06-多端差异处理.md` 执行并回归。
- 新增业务变更需同步更新 `docs/business/10-slice-module.md` 与 `docs/TODO.md`。

## 非目标

- 暂不做批量图片、gap、Zip 下载、后端切图服务。

## 交付要求

- 每完成一项 TODO，补充最小验证记录（平台、结果、问题）。
- 任务完成后执行一次主链路回归：H5 + 微信小程序 + Android App + iOS App。
