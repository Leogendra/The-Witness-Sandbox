import { useState, useRef, useLayoutEffect, useContext } from 'react';
import GridContext from './GridContext';
import { useDrop, useDrag, useDragLayer } from 'react-dnd';
import { TetrisShape } from './TetrisShape';

interface GridProps {
  size: number;
  editionMode: boolean;
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

export const Grid: React.FC<GridProps> = ({ size, editionMode }) => {
  const [pieces, setPieces] = useState<PlacedPiece[]>([]);
  const [walls, setWalls] = useState<Set<string>>(new Set());
  const [markedCells, setMarkedCells] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gridCtx = useContext(GridContext);

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
    const padding = 8; // p-2 = 8px padding

    // Compute pointer offset (where in the piece did user grab it)
    const pointerOffset = item.pointerOffset || { x: 0, y: 0 };
    const patternCols = pattern[0].length;
    const patternRows = pattern.length;
    let blockIndexX = Math.floor(pointerOffset.x / cellSize);
    let blockIndexY = Math.floor(pointerOffset.y / cellSize);
    if (blockIndexX < 0) blockIndexX = 0;
    if (blockIndexY < 0) blockIndexY = 0;
    if (blockIndexX >= patternCols) blockIndexX = patternCols - 1;
    if (blockIndexY >= patternRows) blockIndexY = patternRows - 1;

    // Compute drop cell accounting for padding
    const pointerCellX = (clientOffset.x - rect.left - padding) / cellSize;
    const pointerCellY = (clientOffset.y - rect.top - padding) / cellSize;
    let col = Math.floor(pointerCellX + 0.5) - blockIndexX;
    let row = Math.floor(pointerCellY + 0.5) - blockIndexY;

    // Validate placement (bounds only, overlaps allowed)
    for (let i = 0; i < pattern.length; i++) {
      for (let j = 0; j < pattern[i].length; j++) {
        if (pattern[i][j]) {
          const targetRow = row + i;
          const targetCol = col + j;
          if (targetRow >= size || targetCol >= size || targetRow < 0 || targetCol < 0) {
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
      pattern: pattern, // Use pattern from drag item (already rotated if applicable)
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
      } else {
        newWalls.add(wallId);
      }
      return newWalls;
    });
  };

  const clearGrid = () => {
    setPieces([]);
  };

  const clearWalls = () => {
    setWalls(new Set());
  };

  const toggleMarkedCell = (cellId: string) => {
    setMarkedCells(prev => {
      const newMarked = new Set(prev);
      if (newMarked.has(cellId)) {
        newMarked.delete(cellId);
      } else {
        newMarked.add(cellId);
      }
      return newMarked;
    });
  };

  // Create a visual grid with cells colored by pieces
  const cellSize = 33; // Size including gap
  
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
    const padding = 8;
    const { pattern } = dragItem;
    
    // Safety check: ensure pattern exists and is valid
    if (!pattern || !Array.isArray(pattern) || pattern.length === 0 || !pattern[0]) {
      return new Set();
    }
    
    const pointerOffset = dragItem.pointerOffset || { x: 0, y: 0 };
    
    const patternCols = pattern[0].length;
    const patternRows = pattern.length;
    let blockIndexX = Math.floor(pointerOffset.x / cellSize);
    let blockIndexY = Math.floor(pointerOffset.y / cellSize);
    if (blockIndexX < 0) blockIndexX = 0;
    if (blockIndexY < 0) blockIndexY = 0;
    if (blockIndexX >= patternCols) blockIndexX = patternCols - 1;
    if (blockIndexY >= patternRows) blockIndexY = patternRows - 1;

    const pointerCellX = (dragClientOffset.x - rect.left - padding) / cellSize;
    const pointerCellY = (dragClientOffset.y - rect.top - padding) / cellSize;
    let col = Math.floor(pointerCellX + 0.5) - blockIndexX;
    let row = Math.floor(pointerCellY + 0.5) - blockIndexY;

    const hoverCells = new Set<string>();
    for (let i = 0; i < pattern.length; i++) {
      for (let j = 0; j < pattern[i].length; j++) {
        if (pattern[i][j]) {
          const targetRow = row + i;
          const targetCol = col + j;
          if (targetRow >= 0 && targetRow < size && targetCol >= 0 && targetCol < size) {
            hoverCells.add(`${targetRow}-${targetCol}`);
          }
        }
      }
    }
    return hoverCells;
  };

  const hoverCells = getHoverCells();
  
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
  }, [size, cellSize, gridCtx.setInfo]);

  // Drop handler for the entire grid container
  const [{ isOver }, dropRef] = useDrop(() => ({
    accept: 'tetromino',
    drop: (item, monitor) => {
      if (!editionMode) {
        const clientOffset = monitor.getClientOffset();
        handleDrop(item, clientOffset);
      }
      return { dropped: true };
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }), [editionMode, size, cellSize]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div 
        ref={(node) => {
          containerRef.current = node;
          dropRef(node);
        }}
        className="relative bg-gray-800 p-2 rounded-lg"
        style={{ 
          width: `${size * cellSize + 16}px`,
          height: `${size * cellSize + 16}px`,
        }}
      >
        {/* Grid cells */}
        <div 
          className="absolute inset-2 grid gap-0.5"
          style={{ 
            gridTemplateColumns: `repeat(${size}, 1fr)`,
          }}
        >
          {Array(size).fill(null).map((_, rowIndex) =>
            Array(size).fill(null).map((_, colIndex) => {
              const cellColor = getCellColor(rowIndex, colIndex);
              const isHovered = hoverCells.has(`${rowIndex}-${colIndex}`);
              const cellId = `${rowIndex}-${colIndex}`;
              const isMarked = markedCells.has(cellId);
              return (
                <div
                  key={cellId}
                  className={`w-full h-full rounded-sm transition-all relative ${editionMode ? 'hover:brightness-125' : ''}`}
                  style={{
                    backgroundColor: cellColor || '#2d3748',
                    border: '1px solid #1a202c',
                    boxShadow: isHovered ? 'inset 0 0 0 2px rgba(96, 165, 250, 0.6)' : 'none',
                    cursor: editionMode ? 'pointer' : 'default',
                  }}
                  onClick={editionMode ? () => toggleMarkedCell(cellId) : undefined}
                >
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
            {Array(size + 1).fill(null).map((_, row) =>
              Array(size).fill(null).map((_, col) => {
                const wallId = `h-${row}-${col}`;
                const isWall = walls.has(wallId);
                return (
                  <div
                    key={wallId}
                    className="absolute cursor-pointer hover:bg-blue-400 transition-colors z-10"
                    style={{
                      left: `${col * cellSize + 8}px`,
                      top: `${row * cellSize + 6}px`,
                      width: `${cellSize - 0.5}px`,
                      height: '4px',
                      backgroundColor: isWall ? 'white' : 'transparent',
                    }}
                    onClick={() => toggleWall(wallId)}
                  />
                );
              })
            )}
            
            {/* Vertical edges */}
            {Array(size).fill(null).map((_, row) =>
              Array(size + 1).fill(null).map((_, col) => {
                const wallId = `v-${row}-${col}`;
                const isWall = walls.has(wallId);
                return (
                  <div
                    key={wallId}
                    className="absolute cursor-pointer hover:bg-blue-400 transition-colors z-10"
                    style={{
                      left: `${col * cellSize + 6}px`,
                      top: `${row * cellSize + 8}px`,
                      width: '4px',
                      height: `${cellSize - 0.5}px`,
                      backgroundColor: isWall ? 'white' : 'transparent',
                    }}
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
            {Array(size + 1).fill(null).map((_, row) =>
              Array(size).fill(null).map((_, col) => {
                const wallId = `h-${row}-${col}`;
                if (!walls.has(wallId)) return null;
                return (
                  <div
                    key={wallId}
                    className="absolute pointer-events-none z-20"
                    style={{
                      left: `${col * cellSize + 8}px`,
                      top: `${row * cellSize + 6}px`,
                      width: `${cellSize - 0.5}px`,
                      height: '4px',
                      backgroundColor: 'white',
                    }}
                  />
                );
              })
            )}
            
            {/* Vertical walls */}
            {Array(size).fill(null).map((_, row) =>
              Array(size + 1).fill(null).map((_, col) => {
                const wallId = `v-${row}-${col}`;
                if (!walls.has(wallId)) return null;
                return (
                  <div
                    key={wallId}
                    className="absolute pointer-events-none z-20"
                    style={{
                      left: `${col * cellSize + 6}px`,
                      top: `${row * cellSize + 8}px`,
                      width: '4px',
                      height: `${cellSize - 0.5}px`,
                      backgroundColor: 'white',
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
            onRemove={() => removePiece(piece.id)}
            onRotate={() => rotatePiece(piece.id)}
          />
        ))}
      </div>
      <div className="flex gap-3">
        <button
          onClick={clearGrid}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Clear Grid
        </button>
        {walls.size > 0 && (
          <button
            onClick={clearWalls}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Clear Walls
          </button>
        )}
      </div>
    </div>
  );
};

interface PieceOverlayProps {
  piece: PlacedPiece;
  cellSize: number;
  onRemove: () => void;
  onRotate: () => void;
}

const PieceOverlay: React.FC<PieceOverlayProps> = ({ piece, cellSize, onRemove, onRotate }) => {
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

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRotate();
  };

  const cols = piece.pattern[0].length;
  const rows = piece.pattern.length;

  return (
    <div
      ref={drag}
      className="absolute z-30"
      style={{
        left: `${piece.col * cellSize + 8}px`,
        top: `${piece.row * cellSize + 8}px`,
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
                left: `${j * cellSize}px`,
                top: `${i * cellSize}px`,
                width: `${cellSize - 2}px`,
                height: `${cellSize - 2}px`,
                opacity: isDragging ? 0.5 : 1,
                boxShadow: (isHovered && !isDragging) ? 'inset 0 0 0 2px rgba(96, 165, 250, 0.8), 0 0 8px rgba(96, 165, 250, 0.6)' : 'none',
                borderRadius: '4px',
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

