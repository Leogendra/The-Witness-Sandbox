import { useState, useRef, useLayoutEffect, useContext, useCallback } from 'react';
import GridContext from './GridContext';
import { useDrop, useDrag, useDragLayer } from 'react-dnd';


const gridCellSize = 30;
const gridPaddingSize = 5;
const wallWidth = 5;
const gridCellColor = '#2d3748';
const gridBackgroundColor = '#1a202c';
const wallColor = 'white';


interface GridProps {
    rows: number;
    cols: number;
    editionMode: boolean;
    onToggleEditionMode: () => void;
    gridCellSize?: number;
    gridPaddingSize?: number;
}

interface PlacedPiece {
    id: string;
    type: string;
    pattern: number[][];
    originalPattern: number[][];
    color: string;
    row: number;
    col: number;
    rotation: number;
}

export const Grid: React.FC<GridProps> = ({ rows, cols, editionMode, onToggleEditionMode, gridCellSize: propGridCellSize, gridPaddingSize: propGridPaddingSize }) => {
    const [pieces, setPieces] = useState<PlacedPiece[]>([]);
    const [walls, setWalls] = useState<Set<string>>(new Set());
    const [markedCells, setMarkedCells] = useState<Set<string>>(new Set());
    const [cellMinis, setCellMinis] = useState<Map<string, { pattern: number[][]; color: string }>>(new Map());
    const [hoveredCell, setHoveredCell] = useState<string | null>(null);
    const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const gridCtx = useContext(GridContext);

    const cellSize = propGridCellSize ?? gridCellSize;
    const gapSize = propGridPaddingSize ?? gridPaddingSize;
    const containerPadding = gapSize + 3;
    const gridInnerWidth = cols * cellSize + (cols - 1) * gapSize;
    const gridInnerHeight = rows * cellSize + (rows - 1) * gapSize;

    const rotatePattern = (pattern: number[][]): number[][] => {
        const rows = pattern.length;
        const cols = pattern[0].length;
        const rotated: number[][] = Array(cols).fill(null).map(() => Array(rows).fill(0));

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                rotated[j][rows - 1 - i] = pattern[i][j];
            }
        }

        return rotated;
    };

    const handleDrop = (item: any, clientOffset: { x: number, y: number } | null) => {
        if (!clientOffset || !containerRef.current) return;

        const { pattern, type, color, pieceId } = item;

        // Safety check: ensure pattern exists and is valid
        if (!pattern || !Array.isArray(pattern) || pattern.length === 0 || !pattern[0]) {
            return;
        }

        const rect = containerRef.current.getBoundingClientRect();
        const padding = containerPadding; // effective padding

        // Edition mode: drop a miniature of the piece into the nearest cell center
        if (editionMode) {
            const xInGrid = clientOffset.x - rect.left - padding;
            const yInGrid = clientOffset.y - rect.top - padding;
            let colCell = Math.round(xInGrid / (cellSize + gapSize));
            let rowCell = Math.round(yInGrid / (cellSize + gapSize));
            if (colCell < 0 || colCell >= cols || rowCell < 0 || rowCell >= rows) return;
            const cellId = `${rowCell}-${colCell}`;
            // Deep-clone the pattern to preserve current rotation state at drop time
            const clonedPattern: number[][] = pattern.map((r: number[]) => [...r]);
            setCellMinis(prev => {
                const next = new Map(prev);
                next.set(cellId, { pattern: clonedPattern, color });
                return next;
            });
            // Replace the white marker with the mini if it exists
            setMarkedCells(prev => {
                if (!prev.has(cellId)) return prev;
                const next = new Set(prev);
                next.delete(cellId);
                return next;
            });
            return;
        }

        // Compute pointer offset (where in the piece did user grab it)
        const pointerOffset = item.pointerOffset || { x: 0, y: 0 };
        const patternCols = pattern[0].length;
        const patternRows = pattern.length;
        let blockIndexX = Math.floor(pointerOffset.x / (cellSize + gapSize));
        let blockIndexY = Math.floor(pointerOffset.y / (cellSize + gapSize));
        if (blockIndexX < 0) blockIndexX = 0;
        if (blockIndexY < 0) blockIndexY = 0;
        if (blockIndexX >= patternCols) blockIndexX = patternCols - 1;
        if (blockIndexY >= patternRows) blockIndexY = patternRows - 1;

        // Compute drop cell accounting for padding and gaps (round to nearest cell)
        const xInGrid = clientOffset.x - rect.left - padding;
        const yInGrid = clientOffset.y - rect.top - padding;
        let col = Math.round(xInGrid / (cellSize + gapSize)) - blockIndexX;
        let row = Math.round(yInGrid / (cellSize + gapSize)) - blockIndexY;

        // Validate placement (bounds only, overlaps allowed)
        for (let i = 0; i < pattern.length; i++) {
            for (let j = 0; j < pattern[i].length; j++) {
                if (pattern[i][j]) {
                    const targetRow = row + i;
                    const targetCol = col + j;
                    if (targetRow >= rows || targetCol >= cols || targetRow < 0 || targetCol < 0) {
                        return; // Shape doesn't fit
                    }
                }
            }
        }

        // Atomically remove old piece (if any) and add new piece
        // The pattern from drag item is always the current (possibly rotated) pattern
        const existingPiece = pieces.find(p => p.id === pieceId);
        const originalPattern = existingPiece?.originalPattern || pattern;
        const currentRotation = existingPiece?.rotation || 0;

        const newPiece: PlacedPiece = {
            id: pieceId || `piece-${Date.now()}-${Math.random()}`,
            type,
            pattern: pattern, // already rotated if applicable
            originalPattern,
            color,
            row,
            col,
            rotation: currentRotation,
        };

        setPieces(prev => {
            const without = prev.filter(p => !(pieceId && p.id === pieceId));
            return [...without, newPiece];
        });
    };

    const removePiece = (id: string) => {
        setPieces(prev => prev.filter(p => p.id !== id));
    };

    const rotatePiece = (id: string) => {
        setPieces(prev => prev.map(p => {
            if (p.id === id) {
                const rotatedPattern = rotatePattern(p.pattern);
                return { ...p, pattern: rotatedPattern, rotation: (p.rotation + 90) % 360 };
            }
            return p;
        }));
    };

    const toggleWall = (wallId: string) => {
        setWalls(prev => {
            const newWalls = new Set(prev);
            if (newWalls.has(wallId)) {
                newWalls.delete(wallId);
            } 
            else {
                newWalls.add(wallId);
            }
            return newWalls;
        });
    };

    const clearGrid = () => {
        setPieces([]);
        setWalls(new Set());
        setMarkedCells(new Set());
        setCellMinis(new Map());
    };

    const toggleMarkedCell = (cellId: string) => {
        // First check if there's a mini piece - remove it if present
        if (cellMinis.has(cellId)) {
            setCellMinis(prev => {
                const next = new Map(prev);
                next.delete(cellId);
                return next;
            });
            return;
        }
        
        // Otherwise toggle the white marker
        setMarkedCells(prev => {
            const newMarked = new Set(prev);
            if (newMarked.has(cellId)) {
                newMarked.delete(cellId);
            } 
            else {
                newMarked.add(cellId);
            }
            return newMarked;
        });
    };

    // Track current drag state for hover preview
    const { isDragging, dragItem, dragClientOffset } = useDragLayer((monitor) => ({
        isDragging: monitor.isDragging(),
        dragItem: monitor.getItem(),
        dragClientOffset: monitor.getClientOffset(),
    }));

    // Calculate which cells would be occupied by the dragged piece
    const getHoverCells = (): Set<string> => {
        if (!isDragging || !dragItem || !dragClientOffset || !containerRef.current || editionMode) {
            return new Set();
        }

        const rect = containerRef.current.getBoundingClientRect();
        const padding = containerPadding;
        const { pattern } = dragItem;

        // Safety check: ensure pattern exists and is valid
        if (!pattern || !Array.isArray(pattern) || pattern.length === 0 || !pattern[0]) {
            return new Set();
        }

        const pointerOffset = dragItem.pointerOffset || { x: 0, y: 0 };

        const patternCols = pattern[0].length;
        const patternRows = pattern.length;
        let blockIndexX = Math.floor(pointerOffset.x / (cellSize + gapSize));
        let blockIndexY = Math.floor(pointerOffset.y / (cellSize + gapSize));
        if (blockIndexX < 0) blockIndexX = 0;
        if (blockIndexY < 0) blockIndexY = 0;
        if (blockIndexX >= patternCols) blockIndexX = patternCols - 1;
        if (blockIndexY >= patternRows) blockIndexY = patternRows - 1;

        const xInGrid = dragClientOffset.x - rect.left - padding;
        const yInGrid = dragClientOffset.y - rect.top - padding;
        let col = Math.round(xInGrid / (cellSize + gapSize)) - blockIndexX;
        let row = Math.round(yInGrid / (cellSize + gapSize)) - blockIndexY;

        const hoverCells = new Set<string>();
        for (let i = 0; i < pattern.length; i++) {
            for (let j = 0; j < pattern[i].length; j++) {
                if (pattern[i][j]) {
                    const targetRow = row + i;
                    const targetCol = col + j;
                    if (targetRow >= 0 && targetRow < rows && targetCol >= 0 && targetCol < cols) {
                        hoverCells.add(`${targetRow}-${targetCol}`);
                    }
                }
            }
        }
        return hoverCells;
    };

    const hoverCells = getHoverCells();

    // Edition mode: compute hovered cell while dragging to guide mini placement
    const getEditionHoverCellId = (): string | null => {
        if (!editionMode || !containerRef.current) return null;
        // If dragging, compute from pointer; else, use mouse-hover state
        if (isDragging && dragClientOffset) {
            const rect = containerRef.current.getBoundingClientRect();
            const xInGrid = dragClientOffset.x - rect.left - containerPadding;
            const yInGrid = dragClientOffset.y - rect.top - containerPadding;
            let colCell = Math.round(xInGrid / (cellSize + gapSize));
            let rowCell = Math.round(yInGrid / (cellSize + gapSize));
            if (colCell < 0 || colCell >= cols || rowCell < 0 || rowCell >= rows) return null;
            return `${rowCell}-${colCell}`;
        }
        return hoveredCell;
    };
    const editionHoverId = getEditionHoverCellId();

    // Compute cell colors based on pieces
    const getCellColor = (row: number, col: number): string | null => {
        // Check pieces in reverse order so last placed is on top
        for (let i = pieces.length - 1; i >= 0; i--) {
            const piece = pieces[i];
            for (let r = 0; r < piece.pattern.length; r++) {
                for (let c = 0; c < piece.pattern[r].length; c++) {
                    if (piece.pattern[r][c] && piece.row + r === row && piece.col + c === col) {
                        return piece.color;
                    }
                }
            }
        }
        return null;
    };

    // register grid DOM rect and cellSize in context for drag preview
    useLayoutEffect(() => {
        const update = () => {
            const rect = containerRef.current?.getBoundingClientRect() ?? null;
            const prev = gridCtx.info;

            const rectChanged = (() => {
                if (!prev.rect && !rect) return false;
                if (!prev.rect && rect) return true;
                if (prev.rect && !rect) return true;
                if (prev.rect && rect) {
                    return (
                        prev.rect.left !== rect.left ||
                        prev.rect.top !== rect.top ||
                        prev.rect.width !== rect.width ||
                        prev.rect.height !== rect.height
                    );
                }
                return false;
            })();

            const cellSizeChanged = prev.cellSize !== cellSize;

            if (rectChanged || cellSizeChanged) {
                gridCtx.setInfo({ rect, cellSize });
            }
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, [rows, cols, cellSize, gridCtx.setInfo]);

    // Drop handler for the entire grid container
    const [{ isOver }, dropRef] = useDrop(() => ({
        accept: 'tetromino',
        drop: (item, monitor) => {
            const clientOffset = monitor.getClientOffset();
            handleDrop(item, clientOffset);
            return { dropped: true };
        },
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
        }),
    }), [editionMode, rows, cols, cellSize]);

    return (
        <div className="flex flex-col items-center gap-4">
            <div
                ref={(node) => {
                    containerRef.current = node;
                    dropRef(node);
                }}
                className="relative rounded-lg"
                style={{
                    width: `${gridInnerWidth + containerPadding * 2}px`,
                    height: `${gridInnerHeight + containerPadding * 2}px`,
                    backgroundColor: gridBackgroundColor,
                }}
            >
                {/* Grid cells */}
                <div
                    className="absolute grid"
                    style={{
                        left: `${containerPadding}px`,
                        top: `${containerPadding}px`,
                        width: `${gridInnerWidth}px`,
                        height: `${gridInnerHeight}px`,
                        gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
                        gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
                        gap: `${gapSize}px`,
                    }}
                >
                    {Array(rows).fill(null).map((_, rowIndex) =>
                        Array(cols).fill(null).map((_, colIndex) => {
                            const cellColor = getCellColor(rowIndex, colIndex);
                            const isHovered = hoverCells.has(`${rowIndex}-${colIndex}`);
                            const cellId = `${rowIndex}-${colIndex}`;
                            const isMarked = markedCells.has(cellId);
                            const isEditionHover = editionMode && editionHoverId === cellId;
                            const mini = cellMinis.get(cellId);
                            const miniBlock = Math.floor(cellSize / 5);
                            return (
                                <div
                                    key={cellId}
                                    className={`w-full h-full transition-all relative ${editionMode ? 'hover:brightness-125' : ''}`}
                                    style={{
                                        backgroundColor: cellColor || gridCellColor,
                                        border: `1px solid #1a202c`,
                                        borderRadius: 0,
                                        boxShadow: isHovered || isEditionHover ? 'inset 0 0 0 2px rgba(96, 165, 250, 0.7), 0 0 8px rgba(96, 165, 250, 0.35)' : 'none',
                                        cursor: editionMode ? 'pointer' : 'default',
                                    }}
                                    onClick={editionMode ? () => toggleMarkedCell(cellId) : undefined}
                                    onMouseEnter={editionMode ? () => setHoveredCell(cellId) : undefined}
                                    onMouseLeave={editionMode ? () => setHoveredCell(prev => (prev === cellId ? null : prev)) : undefined}
                                >
                                    {mini && mini.pattern && mini.pattern.length > 0 && mini.pattern[0] && (
                                        <div
                                            className="absolute"
                                            style={{
                                                top: '50%',
                                                left: '50%',
                                                transform: 'translate(-50%, -50%)',
                                                width: `${mini.pattern[0].length * miniBlock}px`,
                                                height: `${mini.pattern.length * miniBlock}px`,
                                                pointerEvents: 'none',
                                            }}
                                        >
                                            {mini.pattern.map((r, i) => (
                                                r.map((v, j) => v ? (
                                                    <div
                                                        key={`${i}-${j}`}
                                                        className="absolute"
                                                        style={{
                                                            left: `${j * miniBlock}px`,
                                                            top: `${i * miniBlock}px`,
                                                            width: `${miniBlock - 1}px`,
                                                            height: `${miniBlock - 1}px`,
                                                            backgroundColor: mini.color,
                                                            borderRadius: '1px',
                                                        }}
                                                    />
                                                ) : null)
                                            ))}
                                        </div>
                                    )}
                                    {isMarked && (
                                        <div
                                            className="absolute z-30"
                                            style={{
                                                top: '50%',
                                                left: '50%',
                                                transform: 'translate(-50%, -50%)',
                                                width: '8px',
                                                height: '8px',
                                                backgroundColor: 'white',
                                                borderRadius: '1px',
                                                pointerEvents: 'none',
                                            }}
                                        />
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Wall edges */}
                {editionMode && (
                    <>
                        {/* Horizontal edges */}
                        {Array(rows + 1).fill(null).map((_, row) =>
                            Array(cols).fill(null).map((_, col) => {
                                const wallId = `h-${row}-${col}`;
                                const isWall = walls.has(wallId);
                                const isInner = row > 0 && row < rows;
                                const thickness = isWall ? wallWidth : (isInner ? gapSize : wallWidth);
                                const centerY = isInner
                                    ? (containerPadding + row * (cellSize + gapSize) - gapSize / 2)
                                    : (row === 0
                                        ? containerPadding
                                        : containerPadding + gridInnerHeight);
                                const top = centerY - thickness / 2;
                                const left = containerPadding + col * (cellSize + gapSize);
                                return (
                                    <div
                                        key={wallId}
                                        className="absolute cursor-pointer transition-colors z-10"
                                        style={{
                                            left: `${left}px`,
                                            top: `${top}px`,
                                            width: `${cellSize}px`,
                                            height: `${thickness}px`,
                                            backgroundColor: isWall
                                                ? wallColor
                                                : (hoveredEdgeId === wallId ? 'rgba(96, 165, 250, 0.35)' : 'transparent'),
                                            boxShadow: hoveredEdgeId === wallId
                                                ? 'inset 0 0 0 2px rgba(96, 165, 250, 0.7), 0 0 8px rgba(96, 165, 250, 0.35)'
                                                : 'none',
                                        }}
                                        onMouseEnter={() => setHoveredEdgeId(wallId)}
                                        onMouseLeave={() => setHoveredEdgeId(prev => (prev === wallId ? null : prev))}
                                        onClick={() => toggleWall(wallId)}
                                    />
                                );
                            })
                        )}

                        {/* Vertical edges */}
                        {Array(rows).fill(null).map((_, row) =>
                            Array(cols + 1).fill(null).map((_, col) => {
                                const wallId = `v-${row}-${col}`;
                                const isWall = walls.has(wallId);
                                const isInner = col > 0 && col < cols;
                                const thickness = isWall ? wallWidth : (isInner ? gapSize : wallWidth);
                                const centerX = isInner
                                    ? (containerPadding + col * (cellSize + gapSize) - gapSize / 2)
                                    : (col === 0
                                        ? containerPadding
                                        : containerPadding + gridInnerWidth);
                                const left = centerX - thickness / 2;
                                const top = containerPadding + row * (cellSize + gapSize);
                                return (
                                    <div
                                        key={wallId}
                                        className="absolute cursor-pointer transition-colors z-10"
                                        style={{
                                            left: `${left}px`,
                                            top: `${top}px`,
                                            width: `${thickness}px`,
                                            height: `${cellSize}px`,
                                            backgroundColor: isWall
                                                ? wallColor
                                                : (hoveredEdgeId === wallId ? 'rgba(96, 165, 250, 0.35)' : 'transparent'),
                                            boxShadow: hoveredEdgeId === wallId
                                                ? 'inset 0 0 0 2px rgba(96, 165, 250, 0.7), 0 0 8px rgba(96, 165, 250, 0.35)'
                                                : 'none',
                                        }}
                                        onMouseEnter={() => setHoveredEdgeId(wallId)}
                                        onMouseLeave={() => setHoveredEdgeId(prev => (prev === wallId ? null : prev))}
                                        onClick={() => toggleWall(wallId)}
                                    />
                                );
                            })
                        )}
                    </>
                )}

                {/* Display walls when not in edition mode */}
                {!editionMode && (
                    <>
                        {/* Horizontal walls */}
                        {Array(rows + 1).fill(null).map((_, row) =>
                            Array(cols).fill(null).map((_, col) => {
                                const wallId = `h-${row}-${col}`;
                                if (!walls.has(wallId)) return null;
                                const isInner = row > 0 && row < rows;
                                const centerY = isInner
                                    ? (containerPadding + row * (cellSize + gapSize) - gapSize / 2)
                                    : (row === 0
                                        ? containerPadding
                                        : containerPadding + gridInnerHeight);
                                const top = centerY - wallWidth / 2;
                                const left = containerPadding + col * (cellSize + gapSize);
                                return (
                                    <div
                                        key={wallId}
                                        className="absolute pointer-events-none z-20"
                                        style={{
                                            left: `${left}px`,
                                            top: `${top}px`,
                                            width: `${cellSize}px`,
                                            height: `${wallWidth}px`,
                                            backgroundColor: wallColor,
                                        }}
                                    />
                                );
                            })
                        )}

                        {/* Vertical walls */}
                        {Array(rows).fill(null).map((_, row) =>
                            Array(cols + 1).fill(null).map((_, col) => {
                                const wallId = `v-${row}-${col}`;
                                if (!walls.has(wallId)) return null;
                                const isInner = col > 0 && col < cols;
                                const centerX = isInner
                                    ? (containerPadding + col * (cellSize + gapSize) - gapSize / 2)
                                    : (col === 0
                                        ? containerPadding
                                        : containerPadding + gridInnerWidth);
                                const left = centerX - wallWidth / 2;
                                const top = containerPadding + row * (cellSize + gapSize);
                                return (
                                    <div
                                        key={wallId}
                                        className="absolute pointer-events-none z-20"
                                        style={{
                                            left: `${left}px`,
                                            top: `${top}px`,
                                            width: `${wallWidth}px`,
                                            height: `${cellSize}px`,
                                            backgroundColor: wallColor,
                                        }}
                                    />
                                );
                            })
                        )}
                    </>
                )}

                {/* Invisible draggable overlays for each piece */}
                {!editionMode && pieces.map((piece) => (
                    <PieceOverlay
                        key={piece.id}
                        piece={piece}
                        cellSize={cellSize}
                        gapSize={gapSize}
                        containerPadding={containerPadding}
                        onRemove={() => removePiece(piece.id)}
                        onRotate={() => rotatePiece(piece.id)}
                    />
                ))}
            </div>
            <div className="flex flex-col gap-3">
                <button
                    onClick={onToggleEditionMode}
                    className={`px-4 py-2 rounded-lg transition-colors ${editionMode
                        ? 'bg-purple-600 text-white shadow-lg hover:bg-purple-700'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    {editionMode ? 'Edition Mode ON' : 'Edition Mode OFF'}
                </button>
                <button
                    onClick={clearGrid}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                    Clear Grid
                </button>
            </div>
        </div>
    );
};

interface PieceOverlayProps {
    piece: PlacedPiece;
    cellSize: number;
    gapSize: number;
    containerPadding: number;
    onRemove: () => void;
    onRotate: () => void;
}

const PieceOverlay: React.FC<PieceOverlayProps> = ({ piece, cellSize, gapSize, containerPadding, onRemove, onRotate }) => {
    const dragStartOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    const [{ isDragging }, drag] = useDrag(() => ({
        type: 'tetromino',
        item: (monitor) => {
            const initialOffset = monitor.getInitialClientOffset();
            const sourceOffset = monitor.getInitialSourceClientOffset();
            if (initialOffset && sourceOffset) {
                dragStartOffsetRef.current = {
                    x: initialOffset.x - sourceOffset.x,
                    y: initialOffset.y - sourceOffset.y
                };
            }
            return { type: piece.type, pattern: piece.pattern, pieceId: piece.id, color: piece.color, pointerOffset: dragStartOffsetRef.current };
        },
        end: (item, monitor) => {
            if (!monitor.didDrop() && onRemove) {
                onRemove();
            }
        },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }), [piece.pattern, piece.type, piece.id, piece.color, onRemove]);

    const setDragRef = useCallback((node: HTMLDivElement | null) => {
        drag(node);
    }, [drag]);

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onRotate();
    };

    const cols = piece.pattern[0].length;
    const rows = piece.pattern.length;

    return (
        <div
            ref={setDragRef}
            className="absolute z-30"
            style={{
                left: `${piece.col * (cellSize + gapSize) + containerPadding}px`,
                top: `${piece.row * (cellSize + gapSize) + containerPadding}px`,
                pointerEvents: 'none',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Render individual hit-test zones for each block */}
            {piece.pattern.map((row, i) => (
                row.map((cell, j) => {
                    if (!cell) return null;
                    const blockId = `${i}-${j}`;
                    return (
                        <div
                            key={blockId}
                            onClick={handleClick}
                            className="absolute cursor-move"
                            style={{
                                left: `${j * (cellSize + gapSize)}px`,
                                top: `${i * (cellSize + gapSize)}px`,
                                width: `${cellSize - gapSize}px`,
                                height: `${cellSize - gapSize}px`,
                                opacity: isDragging ? 0.5 : 1,
                                boxShadow: (isHovered && !isDragging) ? 'inset 0 0 0 2px rgba(96, 165, 250, 0.8), 0 0 8px rgba(96, 165, 250, 0.6)' : 'none',
                                borderRadius: 0,
                                transition: 'box-shadow 0.2s ease',
                                pointerEvents: 'auto',
                            }}
                        />
                    );
                })
            ))}
        </div>
    );
};

