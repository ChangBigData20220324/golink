## 🎮 使用方法

### 第一步：創建 SGF 代碼塊

在 Obsidian 筆記中，使用 ` ​`sgf` ` 代碼塊包裹棋譜內容：

````markdown
## 經典對局分析

```sgf
(;GM[1]FF[4]CA[UTF-8]AP[Sabaki:0.52.1]KM[6.5]SZ[19]
;B[pd]C[Opening,Strategy]
;W[dp]
;B[pq]C[Classical,Technique]
;W[dd]C[Theory,Variation]
...)
```
````

### 第二步：在註解中添加鏈接

在棋譜註解 (`C` 標籤) 中添加你的 Obsidian 筆記名稱，用分隔符分開：

```sgf
;B[pd]C[Opening Theory,Classical Lines,Lee Sedol Strategy]
```

系統會自動查找以下文件：
- `Opening Theory.md`
- `Classical Lines.md`
- `Lee Sedol Strategy.md`

### 第三步：與筆記互動

1. **懸停棋石**：查看鏈接預覽和統計
2. **點擊棋石**：固定面板，編輯局部筆記
3. **點擊鏈接**：直接跳轉到 Obsidian 筆記