# SliceLab

SliceLab 是一个基于 `uni-app + Vue3 + TypeScript` 的图片网格切片工具。  
支持多图批量切片、`gap` 间距参数、切片预览与多端导出。

## 功能特性

- 多图选择与批量切片（按选择顺序串行处理）
- 自定义切片参数：`rows`、`cols`、`gap`
- 切片规则：剩余像素归并到最后一行/列
- H5 导出全部：打包为单个 `zip` 下载
- 微信小程序 / App：保存到系统相册（含权限处理）
- 大图保护：批量切片前做像素阈值校验，降低内存风险

## 技术栈

- `uni-app` 3.x
- `Vue 3`（`<script setup>`）
- `TypeScript`
- `Vite`

## 目录说明

```text
src/
  pages/index/index.vue      # 页面：参数收集、流程编排、结果展示
  utils/image.ts             # 切片核心算法与参数校验
  utils/exporter.ts          # 导出能力（H5 zip / 小程序&App相册）
  utils/image-picker.ts      # 图片选择与信息读取
  utils/zip.ts               # 轻量 zip 生成（H5）
docs/
  START.md                   # AI/开发执行入口
  TODO.md                    # 当前任务与验证记录
  business/10-slice-module.md # Slice 模块业务规则
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动 H5 开发

```bash
npm run dev:h5
```

### 3. 类型检查

```bash
npm run type-check
```

## 多端运行命令

```bash
# 微信小程序
npm run dev:mp-weixin

# Android / iOS（uni-app 自定义平台）
npm run dev:custom -- app-plus

# H5 构建
npm run build:h5
```

## 开发规范（必须遵守）

- 页面层仅做参数收集与流程编排，切片核心逻辑统一放在 `src/utils/image.ts`
- 导出逻辑统一放在 `src/utils/exporter.ts`
- 新增业务能力需同步更新：
  - `docs/business/10-slice-module.md`
  - `docs/TODO.md`
- 优先使用 `@/` 导入路径，避免深层相对路径

## 当前业务规则（摘要）

- 支持参数：`rows > 0`、`cols > 0`、`gap >= 0`，均为整数
- 批量切片共用同一组参数
- 批量像素阈值：
  - 单张不超过 `24,000,000` 像素
  - 总量不超过 `80,000,000` 像素
- H5 批量导出 zip 目录规则：
  - `image-{n}/slice-r{row}-c{col}-{index}.png`

## 参考文档

- `docs/START.md`
- `docs/TODO.md`
- `docs/business/10-slice-module.md`
- `docs/06-多端差异处理.md`

## 后续建议

- 完成 H5 / 微信 / Android / iOS 主链路实机回归
- 补充大图场景性能基线与对比数据
