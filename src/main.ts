import { Plugin } from 'obsidian';

export default class OneClickSgfPlugin extends Plugin {
    async onload() {
        console.log("🎯 SGF 插件載入中...");
        this.registerMarkdownCodeBlockProcessor("sgf", (source, el, ctx) => {
            el.empty();
            el.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100vw;
                height: 100vh;
                position: fixed;
                top: 0;
                left: 0;
                z-index: 999;
                background: rgba(15, 15, 25, 0.7);
                backdrop-filter: blur(3px);
            `;
            const container = el.createDiv("sgf-container");
            container.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
                height: 100%;
                gap: 30px;
            `;
            new SGFRenderer(container, source.trim(), this.app);
        });
    }
}

class SGFRenderer {
    private container: HTMLElement;
    private sgfInput: string;
    private stones: Map<string, 'black' | 'white'> = new Map();
    private boardSize: number = 9;
    private cellSize: number = 48;
    private app: any;
    private isWindowPinned: boolean = false;
    private linkStatsCache: Map<string, number> = new Map();

    constructor(container: HTMLElement, sgfContent: string, app?: any) {
        this.container = container;
        this.sgfInput = sgfContent;
        this.app = app;
        this.parseBoardSize();
        this.render();
    }

    private parseBoardSize(): void {
        const sizeMatch = this.sgfInput.match(/SZ\[(\d+)\]/);
        this.boardSize = sizeMatch && sizeMatch[1] ? parseInt(sizeMatch[1], 10) : 9;
    }

    private createBoardSkeleton(): HTMLElement {
        const boardWrapper = this.container.createDiv("sgf-board-wrapper");
        boardWrapper.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            padding: 32px 36px;
            background: rgba(20, 20, 35, 0.5);
            backdrop-filter: blur(8px);
            border-radius: 12px;
        `;

        const maxWidth = window.innerWidth - 100;
        const maxHeight = window.innerHeight - 100;
        const baseCellSize = 48;
        const scaleFactor = Math.min(
            maxWidth / (this.boardSize * baseCellSize),
            maxHeight / (this.boardSize * baseCellSize),
            3
        );
        
        this.cellSize = baseCellSize * scaleFactor;
        const boardPixelSize = (this.boardSize - 1) * this.cellSize + this.cellSize;

        const boardContainer = boardWrapper.createDiv("sgf-board-container");
        boardContainer.style.cssText = `
            position: relative;
            width: ${boardPixelSize}px;
            height: ${boardPixelSize}px;
        `;

        const canvas = boardContainer.createEl('canvas');
        canvas.width = boardPixelSize;
        canvas.height = boardPixelSize;
        canvas.style.cssText = `
            position: absolute; 
            top: 0; 
            left: 0; 
            pointer-events: none;
            filter: blur(0.8px);
        `;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.strokeStyle = 'rgba(150, 180, 220, 0.5)';
            ctx.lineWidth = 0.8;

            for (let i = 0; i < this.boardSize; i++) {
                const pos = i * this.cellSize + this.cellSize / 2;
                ctx.beginPath();
                ctx.moveTo(this.cellSize / 2, pos);
                ctx.lineTo(boardPixelSize - this.cellSize / 2, pos);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(pos, this.cellSize / 2);
                ctx.lineTo(pos, boardPixelSize - this.cellSize / 2);
                ctx.stroke();
            }

            const starPoints = this.getStarPoints();
            starPoints.forEach(([col, row]) => {
                const x = col * this.cellSize + this.cellSize / 2;
                const y = row * this.cellSize + this.cellSize / 2;
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(150, 180, 220, 0.25)';
                ctx.fill();
            });
        }

        const intersectionsContainer = boardContainer.createDiv("sgf-intersections");
        intersectionsContainer.style.cssText = "position: absolute; top: 0; left: 0; width: 100%; height: 100%;";

        const hitAreaSize = this.cellSize;

        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const coord = this.indexToCoord(col, row);
                const x = col * this.cellSize + this.cellSize / 2;
                const y = row * this.cellSize + this.cellSize / 2;

                const hitArea = intersectionsContainer.createDiv("sgf-intersection");
                if (coord) hitArea.dataset.coord = coord;
                hitArea.dataset.col = String(col);
                hitArea.dataset.row = String(row);

                hitArea.style.cssText = `
                    position: absolute;
                    width: ${hitAreaSize}px;
                    height: ${hitAreaSize}px;
                    left: ${x - hitAreaSize / 2}px;
                    top: ${y - hitAreaSize / 2}px;
                    cursor: pointer;
                    border-radius: 50%;
                `;

                hitArea.addEventListener('mouseenter', (e) => {
                    const hitBox = e.target as HTMLElement;
                    if (hitBox && !hitBox.querySelector('.sgf-stone')) {
                        hitBox.style.backgroundColor = 'rgba(212, 175, 55, 0.08)';
                    }
                });
                hitArea.addEventListener('mouseleave', (e) => {
                    const hitBox = e.target as HTMLElement;
                    if (hitBox && !hitBox.querySelector('.sgf-stone')) {
                        hitBox.style.backgroundColor = 'transparent';
                    }
                });

                intersectionsContainer.appendChild(hitArea);
            }
        }

        this.addCoordinateLabels(boardContainer, boardPixelSize, this.cellSize);
        return intersectionsContainer;
    }

    private getStarPoints(): [number, number][] {
        if (this.boardSize === 19) {
            return [[3,3],[9,3],[15,3],[3,9],[9,9],[15,9],[3,15],[9,15],[15,15]];
        } else if (this.boardSize === 13) {
            return [[3,3],[9,3],[6,6],[3,9],[9,9]];
        } else if (this.boardSize === 9) {
            return [[2,2],[6,2],[4,4],[2,6],[6,6]];
        }
        return [];
    }

    private addCoordinateLabels(boardContainer: HTMLElement, boardSize: number, cellSize: number): void {
        const topLabels = boardContainer.createDiv("sgf-top-labels");
        topLabels.style.cssText = `
            position: absolute;
            top: -${cellSize * 0.65}px;
            left: 0;
            width: 100%;
            display: flex;
            justify-content: flex-start;
        `;

        for (let i = 0; i < this.boardSize; i++) {
            const label = topLabels.createDiv();
            label.setText(String.fromCharCode('A'.charCodeAt(0) + (i >= 8 ? i + 1 : i)));
            label.style.cssText = `
                position: absolute;
                left: ${i * cellSize}px;
                width: ${cellSize}px;
                height: ${cellSize}px;
                text-align: center;
                font-size: ${cellSize * 0.22}px;
                font-weight: 700;
                color: rgba(150, 180, 220, 0.85);
                font-family: 'SF Mono', monospace;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
        }
        boardContainer.appendChild(topLabels);

        const leftLabels = boardContainer.createDiv("sgf-left-labels");
        leftLabels.style.cssText = `
            position: absolute;
            left: -${cellSize * 0.8}px;
            top: 0;
            display: flex;
            flex-direction: column;
        `;

        for (let i = 0; i < this.boardSize; i++) {
            const label = leftLabels.createDiv();
            label.setText(String(this.boardSize - i));
            label.style.cssText = `
                position: absolute;
                top: ${i * cellSize}px;
                width: ${cellSize * 0.6}px;
                height: ${cellSize}px;
                text-align: right;
                font-size: ${cellSize * 0.22}px;
                font-weight: 700;
                color: rgba(150, 180, 220, 0.85);
                font-family: 'SF Mono', monospace;
                display: flex;
                align-items: center;
                justify-content: flex-end;
                padding-right: ${cellSize * 0.1}px;
            `;
        }
        boardContainer.appendChild(leftLabels);
    }

    private activateStones(intersectionsContainer: HTMLElement): void {
        this.stones.clear();
        this.parseSGF(this.sgfInput);

        const intersections = intersectionsContainer.querySelectorAll('.sgf-intersection');

        intersections.forEach((hitArea: Element) => {
            const html = hitArea as HTMLElement;
            const coord = html.dataset.coord;
            if (!coord) return;

            const oldStone = html.querySelector('.sgf-stone');
            if (oldStone) oldStone.remove();

            if (this.stones.has(coord)) {
                this.createStoneButton(html, coord);
            }
        });
    }

    private createStoneButton(hitArea: HTMLElement, coord: string): void {
        const color = this.stones.get(coord);
        if (!color) return;

        const stone = hitArea.createDiv('sgf-stone');
        const stoneSize = this.cellSize * 0.85;

        if (color === 'black') {
            stone.style.cssText = `
                position: absolute;
                width: ${stoneSize}px;
                height: ${stoneSize}px;
                border-radius: 50%;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                cursor: pointer;
                transition: transform 0.12s ease, filter 0.12s ease, box-shadow 0.2s ease;
                z-index: 10;
                background: radial-gradient(circle at 38% 32%, #4a4a4a 0%, #1a1a1a 50%, #000000 100%);
                box-shadow:
                    0 0 0 ${this.cellSize * 0.06}px rgba(150, 180, 220, 0.6),
                    0 0 ${this.cellSize * 0.15}px ${this.cellSize * 0.02}px rgba(100, 150, 200, 0.25),
                    0 ${this.cellSize * 0.08}px ${this.cellSize * 0.2}px rgba(0, 0, 0, 0.9),
                    0 ${this.cellSize * 0.02}px ${this.cellSize * 0.06}px rgba(0, 0, 0, 0.95),
                    inset 0 ${this.cellSize * 0.02}px ${this.cellSize * 0.06}px rgba(255, 255, 255, 0.15);
                filter: drop-shadow(0 0 ${this.cellSize * 0.08}px rgba(150, 180, 220, 0.5)) blur(0.5px);
            `;
        } else {
            stone.style.cssText = `
                position: absolute;
                width: ${stoneSize}px;
                height: ${stoneSize}px;
                border-radius: 50%;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                cursor: pointer;
                transition: transform 0.12s ease, filter 0.12s ease, box-shadow 0.2s ease;
                z-index: 10;
                background: radial-gradient(circle at 36% 30%, #ffffff 0%, #f0f0f0 40%, #d8d8d8 100%);
                box-shadow:
                    0 0 0 ${this.cellSize * 0.06}px rgba(255, 255, 255, 0.8),
                    0 0 ${this.cellSize * 0.15}px ${this.cellSize * 0.03}px rgba(255, 255, 255, 0.4),
                    0 ${this.cellSize * 0.08}px ${this.cellSize * 0.2}px rgba(0, 0, 0, 0.7),
                    0 ${this.cellSize * 0.02}px ${this.cellSize * 0.06}px rgba(0, 0, 0, 0.5),
                    inset 0 ${this.cellSize * 0.02}px ${this.cellSize * 0.06}px rgba(255, 255, 255, 0.8),
                    inset 0 -${this.cellSize * 0.03}px ${this.cellSize * 0.05}px rgba(180, 180, 180, 0.4);
                filter: drop-shadow(0 0 ${this.cellSize * 0.08}px rgba(255, 255, 255, 0.6)) blur(0.5px);
            `;
        }

        this.addLinkBadge(hitArea, coord, color);

        hitArea.addEventListener('mouseenter', () => {
            this.applyHoverEffect(stone, color);
            if (!this.isWindowPinned) {
                this.showStonePanel(coord, color, false);
            }
        });

        hitArea.addEventListener('mouseleave', () => {
            if (!this.isWindowPinned) {
                this.removeHoverEffect(stone, color);
                const panel = this.container.querySelector('.sgf-stone-panel');
                if (panel) panel.remove();
            }
        });

        stone.addEventListener('click', (e) => {
            e.stopPropagation();
            this.isWindowPinned = true;
            this.applyHoverEffect(stone, color);
            this.showStonePanel(coord, color, true);
        });
    }

    private async addLinkBadge(hitArea: HTMLElement, coord: string, color: 'black' | 'white'): Promise<void> {
        const links = this.extractLinksFromComment(coord);
        if (links.length === 0) return;

        const linkStats = await this.getLinkStats(links);
        const totalCount = linkStats.reduce((sum, stat) => sum + stat.count, 0);

        const badge = hitArea.createDiv('sgf-link-badge');
        const badgeSize = this.cellSize * 0.32;

        let badgeColor: string;
        if (totalCount === 0) {
            badgeColor = 'rgba(239, 68, 68, 0.95)';
        } else if (totalCount <= 9) {
            badgeColor = 'rgba(34, 197, 94, 0.95)';
        } else {
            badgeColor = 'rgba(251, 191, 36, 0.95)';
        }

        badge.style.cssText = `
            position: absolute;
            top: -${badgeSize * 0.5}px;
            right: -${badgeSize * 0.5}px;
            width: ${badgeSize}px;
            height: ${badgeSize}px;
            border-radius: ${badgeSize * 0.25}px;
            background: ${badgeColor};
            border: 1.5px solid rgba(255, 255, 255, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${badgeSize * 0.5}px;
            font-weight: 700;
            color: white;
            z-index: 20;
            box-shadow: 0 2px 8px ${badgeColor.replace('0.95', '0.6')};
            font-family: 'SF Mono', monospace;
        `;
        badge.setText(totalCount.toString());
    }

    private applyHoverEffect(stone: HTMLElement, color: 'black' | 'white'): void {
        stone.style.transform = 'translate(-50%, -50%) scale(1.35)';
        
        if (color === 'black') {
            stone.style.boxShadow = `
                0 0 0 ${this.cellSize * 0.12}px rgba(239, 68, 68, 1),
                0 0 ${this.cellSize * 0.25}px ${this.cellSize * 0.08}px rgba(239, 68, 68, 0.7),
                0 ${this.cellSize * 0.15}px ${this.cellSize * 0.35}px rgba(0, 0, 0, 0.95),
                inset 0 ${this.cellSize * 0.02}px ${this.cellSize * 0.06}px rgba(255, 255, 255, 0.15)
            `;
        } else {
            stone.style.boxShadow = `
                0 0 0 ${this.cellSize * 0.12}px rgba(239, 68, 68, 1),
                0 0 ${this.cellSize * 0.25}px ${this.cellSize * 0.08}px rgba(239, 68, 68, 0.7),
                0 ${this.cellSize * 0.15}px ${this.cellSize * 0.35}px rgba(0, 0, 0, 0.8),
                inset 0 ${this.cellSize * 0.02}px ${this.cellSize * 0.06}px rgba(255, 255, 255, 0.8)
            `;
        }
    }

    private removeHoverEffect(stone: HTMLElement, color: 'black' | 'white'): void {
        stone.style.transform = 'translate(-50%, -50%) scale(1)';
        
        if (color === 'black') {
            stone.style.boxShadow = `
                0 0 0 ${this.cellSize * 0.06}px rgba(150, 180, 220, 0.6),
                0 0 ${this.cellSize * 0.15}px ${this.cellSize * 0.02}px rgba(100, 150, 200, 0.25),
                0 ${this.cellSize * 0.08}px ${this.cellSize * 0.2}px rgba(0, 0, 0, 0.9),
                0 ${this.cellSize * 0.02}px ${this.cellSize * 0.06}px rgba(0, 0, 0, 0.95),
                inset 0 ${this.cellSize * 0.02}px ${this.cellSize * 0.06}px rgba(255, 255, 255, 0.15)
            `;
        } else {
            stone.style.boxShadow = `
                0 0 0 ${this.cellSize * 0.06}px rgba(255, 255, 255, 0.8),
                0 0 ${this.cellSize * 0.15}px ${this.cellSize * 0.03}px rgba(255, 255, 255, 0.4),
                0 ${this.cellSize * 0.08}px ${this.cellSize * 0.2}px rgba(0, 0, 0, 0.7),
                0 ${this.cellSize * 0.02}px ${this.cellSize * 0.06}px rgba(0, 0, 0, 0.5),
                inset 0 ${this.cellSize * 0.02}px ${this.cellSize * 0.06}px rgba(255, 255, 255, 0.8),
                inset 0 -${this.cellSize * 0.03}px ${this.cellSize * 0.05}px rgba(180, 180, 180, 0.4)
            `;
        }
    }

    // ✅ 改进版：遍历所有文件，处理任意路径
    private async readFileContent(linkName: string): Promise<string> {
        try {
            const cleanLinkName = linkName.trim();
            
            if (!this.app?.vault) {
                console.warn(`❌ Obsidian vault 不可用`);
                return "";
            }

            console.log(`🔍 开始搜索文件: "${cleanLinkName}"`);

            // 方法 1: 直接路径尝试
            const directPaths = [
                `${cleanLinkName}.md`,
                `${cleanLinkName.toLowerCase()}.md`,
                `${cleanLinkName.toUpperCase()}.md`,
            ];

            for (const path of directPaths) {
                try {
                    const file = this.app.vault.getAbstractFileByPath(path);
                    if (file && file.extension === 'md') {
                        console.log(`✅ [直接路径] 找到: ${path}`);
                        const content = await this.app.vault.read(file);
                        console.log(`   读取成功: ${content.length} 字符`);
                        return content;
                    }
                } catch (e) {
                    // 继续下一个路径
                }
            }

            // 方法 2: 遍历所有文件，精确匹配
            console.log(`🔍 直接路径未找到，开始全库搜索...`);
            const allFiles = this.app.vault.getFiles();
            
            for (const file of allFiles) {
                const fileName = file.basename;
                const filePath = file.path;
                
                if (fileName === cleanLinkName || fileName === cleanLinkName.toLowerCase() || fileName === cleanLinkName.toUpperCase()) {
                    console.log(`✅ [全库搜索] 找到: ${filePath}`);
                    const content = await this.app.vault.read(file);
                    console.log(`   读取成功: ${content.length} 字符`);
                    return content;
                }
            }

            console.warn(`❌ 未找到文件: "${cleanLinkName}"`);
            return "";

        } catch (err) {
            console.error(`❌ 读取文件异常:`, err);
            return "";
        }
    }

    // ✅ 改进版：更强大的链接识别
    private countInternalLinks(content: string): number {
        if (!content || content.length === 0) {
            console.warn(`⚠️  内容为空`);
            return 0;
        }

        console.log(`📄 开始统计，内容: "${content.substring(0, 150)}..."`);

        const patterns = [
            /\[\[([^\[\]|#]+)(?:\|[^\[\]]*)?(?:#[^\[\]]*)?(?:\|[^\[\]]*)?(?:#[^\[\]]*)?]]\]/g,
            /\[\[([^\[\]]+?)]]/g,
        ];

        const allMatches = new Set<string>();

        for (const pattern of patterns) {
            const matches = content.match(pattern);
            if (matches && matches.length > 0) {
                console.log(`  📌 匹配到 ${matches.length} 个`);
                matches.forEach(match => allMatches.add(match));
            }
        }

        const uniqueMatches = Array.from(allMatches);
        console.log(`📊 总计: ${uniqueMatches.length} 个唯一链接`);
        
        if (uniqueMatches.length > 0) {
            console.log(`   链接列表:`, uniqueMatches);
        }

        return uniqueMatches.length;
    }

    private async getLinkStats(linkNames: string[]): Promise<{name: string, count: number}[]> {
        console.log(`\n🔄 开始统计 ${linkNames.length} 个连接...`);
        
        return Promise.all(
            linkNames.map(async (linkName) => {
                const cleanName = linkName.trim();
                
                if (this.linkStatsCache.has(cleanName)) {
                    const cachedCount = this.linkStatsCache.get(cleanName)!;
                    console.log(`📊 [缓存] "${cleanName}": ${cachedCount}`);
                    return { name: linkName, count: cachedCount };
                }
                
                console.log(`📥 读取: "${cleanName}"`);
                const content = await this.readFileContent(cleanName);
                const count = this.countInternalLinks(content);
                
                this.linkStatsCache.set(cleanName, count);
                return { name: linkName, count };
            })
        );
    }

    private extractLinksFromComment(coord: string): string[] {
        const pattern = new RegExp(`\\[${coord}\\]C\\[([^\\]]+)\\]`);
        const match = this.sgfInput.match(pattern);
        
        if (!match || !match[1]) {
            return [];
        }
        
        const commentText = match[1];
        const separators = [',', '、', ';', '|', '，'];
        let links: string[] = [];
        
        for (const sep of separators) {
            if (commentText.includes(sep)) {
                links = commentText
                    .split(sep)
                    .map(item => item.trim())
                    .filter(item => item.length > 0);
                break;
            }
        }
        
        if (links.length === 0 && commentText.trim().length > 0) {
            links = [commentText.trim()];
        }
        
        console.log(`📍 座标 ${coord}: ${links.length} 个链接 ->`, links);
        return links;
    }

    private async showStonePanel(coord: string, color: 'black' | 'white', isPinned: boolean = false): Promise<void> {
        const panelPlaceholder = this.container.querySelector('.sgf-panel-placeholder');
        if (!panelPlaceholder) return;

        const oldPanel = panelPlaceholder.querySelector('.sgf-stone-panel');
        if (oldPanel) oldPanel.remove();

        const panelContainer = panelPlaceholder.createDiv('sgf-stone-panel');
        if (!panelContainer) return;

        const colorName = color === 'black' ? '黑棋' : '白棋';
        const links = this.extractLinksFromComment(coord);

        panelContainer.style.cssText = `
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 300px;
            background: rgba(18, 18, 22, 0.92);
            backdrop-filter: blur(12px);
            border: 2px solid rgba(239, 68, 68, 0.8);
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(239, 68, 68, 0.3);
            z-index: 1000;
        `;

        const header = panelContainer.createDiv();
        header.style.cssText = "display: flex; align-items: center; gap: 12px; margin-bottom: 16px;";

        const stonePreview = header.createDiv();
        if (color === 'black') {
            stonePreview.style.cssText = `
                width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
                background: radial-gradient(circle at 38% 32%, #2a2a2a, #000);
                box-shadow: 0 0 0 1.5px rgba(255,255,255,0.2), 0 2px 6px rgba(0,0,0,0.8);
            `;
        } else {
            stonePreview.style.cssText = `
                width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
                background: radial-gradient(circle at 36% 30%, #ffffff, #d8d8d8);
                box-shadow: 0 0 0 1.5px rgba(255,255,255,0.9), 0 2px 6px rgba(0,0,0,0.6);
            `;
        }

        const titleDiv = header.createDiv();
        titleDiv.style.cssText = "font-size: 15px; font-weight: 600; color: rgba(212, 175, 55, 0.9); font-family: 'SF Mono', monospace;";
        titleDiv.setText(`${colorName} · ${coord.toUpperCase()}`);

        const noteBox = panelContainer.createDiv();
        noteBox.style.cssText = `
            background: rgba(212, 175, 55, 0.06);
            border: 1px solid rgba(212, 175, 55, 0.25);
            border-radius: 6px;
            padding: 0;
            margin-bottom: 14px;
            overflow: hidden;
        `;
        
        const noteTextarea = noteBox.createEl('textarea');
        noteTextarea.style.cssText = `
            width: 100%;
            min-height: 80px;
            background: transparent;
            border: none;
            color: rgba(212, 175, 55, 0.9);
            padding: 12px;
            font-family: 'SF Mono', monospace;
            font-size: 12px;
            resize: vertical;
            outline: none;
            box-sizing: border-box;
        `;
        noteTextarea.placeholder = "输入笔记或备注...";
        
        const storageKey = `sgf-note-${coord}`;
        const savedNote = localStorage.getItem(storageKey);
        if (savedNote) {
            noteTextarea.value = savedNote;
        }
        
        noteTextarea.addEventListener('input', () => {
            localStorage.setItem(storageKey, noteTextarea.value);
        });

        if (links.length > 0) {
            const linksTitle = panelContainer.createDiv();
            linksTitle.style.cssText = "font-size: 10px; font-weight: 600; color: rgba(212, 175, 55, 0.5); margin-bottom: 10px;";
            linksTitle.setText("📌 连接分析");

            const linksList = panelContainer.createDiv();
            linksList.style.cssText = "display: flex; flex-direction: column; gap: 8px;";

            const linkStats = await this.getLinkStats(links);

            linkStats.forEach(({ name, count }) => {
                const linkItem = linksList.createDiv();
                linkItem.style.cssText = `
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    font-size: 12px;
                    color: rgba(180, 200, 255, 0.8);
                    cursor: pointer;
                    padding: 10px 12px;
                    border-radius: 6px;
                    border: 1px solid rgba(180, 200, 255, 0.15);
                    background: rgba(180, 200, 255, 0.05);
                    transition: all 0.2s ease;
                `;
                
                const linkName = linkItem.createSpan();
                linkName.style.cssText = "flex: 1; color: rgba(100, 180, 255, 0.9);";
                linkName.setText(`[[${name}]]`);

                const countBadge = linkItem.createSpan();
                countBadge.style.cssText = `
                    background: rgba(212, 175, 55, 0.2);
                    color: rgba(212, 175, 55, 0.95);
                    padding: 3px 8px;
                    border-radius: 4px;
                    font-weight: 700;
                    font-size: 11px;
                    border: 1px solid rgba(212, 175, 55, 0.25);
                `;
                countBadge.setText(count.toString());

                linkItem.addEventListener('click', () => {
                    this.openWikiLink(name);
                });
            });
        }

        const closeBtn = panelContainer.createEl('button');
        if (closeBtn) {
            closeBtn.setText('✕');
            closeBtn.style.cssText = `
                position: absolute;
                top: 10px;
                right: 10px;
                background: none;
                border: none;
                font-size: 16px;
                color: rgba(212, 175, 55, 0.4);
                cursor: pointer;
                transition: color 0.15s;
            `;
            closeBtn.addEventListener('click', () => {
                panelContainer.remove();
                this.isWindowPinned = false;
            });
        }

        if (!isPinned) {
            panelContainer.addEventListener('mouseleave', () => {
                panelContainer.remove();
            });
        }
    }

    private parseSGF(sgfText: string): void {
        const movePattern = /;([BW])\[([a-s])([a-s])\]/g;
        let match;
        while ((match = movePattern.exec(sgfText)) !== null) {
            const color = match[1] === 'B' ? 'black' : 'white';
            const col = match[2];
            const row = match[3];
            if (col && row) {
                const coord = col + row;
                this.stones.set(coord, color);
            }
        }
    }

    private indexToCoord(col: number, row: number): string {
        return String.fromCharCode('a'.charCodeAt(0) + col) + String.fromCharCode('a'.charCodeAt(0) + row);
    }

    private openWikiLink(linkName: string): void {
        if (!this.app) return;
        try {
            const file = this.app.vault.getAbstractFileByPath(`${linkName}.md`);
            if (file) {
                this.app.workspace.getLeaf().openFile(file);
            } else {
                this.app.workspace.openLinkText(linkName, '', false);
            }
        } catch (err) {
            console.error(`❌ 打开连接失败:`, err);
        }
    }

    private render(): void {
        this.container.empty();
        const intersectionsContainer = this.createBoardSkeleton();
        
        const panelPlaceholder = this.container.createDiv("sgf-panel-placeholder");
        panelPlaceholder.style.cssText = `
            width: 300px;
            height: 100%;
            flex-shrink: 0;
            position: relative;
        `;
        
        this.activateStones(intersectionsContainer);
    }
}