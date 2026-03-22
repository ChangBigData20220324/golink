# Changelog / 更新日誌

All notable changes to this project will be documented in this file.
本項目的所有重要變更都將記錄在此文件中。

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added / 新增
畫面只顯示標示該回合以前的局面、進度bar可移動到想看的局面

### Changed / 修改
- Improved visual clarity for link count badges
  - 改進鏈接計數徽章的視覺清晰度

### Performance / 性能
- Optimized file search algorithm for faster link resolution
  - 優化文件搜索算法以加快鏈接解析速度

## [1.1.0] - 2026-03-22

### Added / 新增
- Link statistics badge on stones showing internal link count
  - 棋子上的鏈接統計徽章，顯示內部鏈接數量
- Stone panel with note-taking capability (localStorage persistence)
  - 帶有筆記功能的棋子面板（本地存儲持久化）
- Wiki link click-through support from stone panel
  - 石子面板支援 Wiki 鏈接點擊跳轉

### Fixed / 修復
- Fixed hover effect not properly disabled when stone panel pinned
  - 修復棋子面板 pin 住時 hover 效果未正確禁用
- Fixed multiple hover effects appearing when clicking different stones without closing panel
  - 修復未關閉面板直接點選其他棋子時出現多個 hover 效果
- Fixed stone hover state persisting after closing panel
  - 修復關閉面板後棋子 hover 狀態持續存在

## [1.0.0] - 2026-03-19

### Added / 新增
- SGF-based thinking dashboard for personal knowledge management
  - 基於 SGF 的思維儀表板，用於個人知識管理
- 9x9 board as visual thinking canvas
  - 9x9 棋盤作為視覺化思考畫布
- Black and white stones to represent thought nodes and branches
  - 黑白棋子代表思維節點和分支
- Obsidian wiki link integration for contextual connections
  - Obsidian wiki 鏈接集成，建立脈絡連接
- Interactive stone hover with scaling effect for focus
  - 交互式棋子 hover 效果，縮放動畫便於聚焦
- Stone panel for adding notes and exploring related links
  - 棋子面板用於添加筆記和探索相關鏈接
- Board coordinate labels for position reference
  - 棋盤坐標標籤便於位置參考
- Star point indicators for visual anchoring
  - 星位指示器用於視覺定位