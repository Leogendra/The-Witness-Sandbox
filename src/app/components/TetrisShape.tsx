import React from 'react';
import { useDrag } from 'react-dnd';
import pieceConfig from '../../piece_config.json';

export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'L' | 'J' | '1x1' | '2x1' | '3x1' | 'L3' | '2x2' | '4x1';

// Color palette applied in order
const COLOR_PALETTE = [
    '#00f0f0', // cyan
    '#f0f000', // yellow
    '#a000f0', // purple
    '#00f000', // green
    '#f00000', // red
    '#f0a000', // orange
    '#0000f0', // blue
    '#ff69b4', // pink
    '#9370db', // medium purple
    '#20b2aa', // light sea green
    '#ff6b9d', // hot pink
    '#32cd32', // lime green
    '#ff4500', // orange red
    '#1e90ff', // dodger blue
    '#ffd700', // gold
];


interface TetrisShapeProps {
    type: TetrominoType;
    color: string;
    pattern: number[][];
    pieceId?: string;
    onRemove?: () => void;
    onRotate?: () => void;
    style?: React.CSSProperties;
}


export const TetrisShape = React.forwardRef<HTMLDivElement, TetrisShapeProps>(
    ({ type, color, pattern, pieceId, onRemove, onRotate, style }, forwardedRef) => {
        const dragStartOffsetRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });

        const [{ isDragging }, drag, preview] = useDrag(() => ({
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
            return { type, pattern, pieceId, color, pointerOffset: dragStartOffsetRef.current };
        },
        end: (item, monitor) => {
            if (!monitor.didDrop() && pieceId && onRemove) {
                onRemove();
            }
        },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onRotate) {
            onRotate();
        }
    };

    return (
        <div
            ref={drag}
            onClick={handleClick}
            className="cursor-move inline-block p-0 bg-transparent rounded-none transition-colors"
            style={{ opacity: isDragging ? 0.5 : 1, ...(style || {}) }}
        >
            <div className="flex flex-col gap-0.5" style={{ lineHeight: 0 }}>
                {pattern.map((row, i) => (
                    <div key={i} className="flex gap-0.5">
                        {row.map((cell, j) =>
                            cell ? (
                                <div
                                    key={j}
                                    className="rounded-sm"
                                    style={{
                                        width: 'var(--cell-size, 33px)',
                                        height: 'var(--cell-size, 33px)',
                                        backgroundColor: color,
                                        border: '1px solid #1a202c',
                                        boxSizing: 'border-box',
                                    }}
                                />
                            ) : null
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
    }
);

TetrisShape.displayName = 'TetrisShape';


export const TETROMINOS: Record<TetrominoType, { pattern: number[][], color: string }> =
    pieceConfig.pieces.reduce((acc, piece, index) => {
        acc[piece.id as TetrominoType] = {
            pattern: piece.pattern,
            color: COLOR_PALETTE[index % COLOR_PALETTE.length]
        };
        return acc;
    }, {} as Record<TetrominoType, { pattern: number[][], color: string }>);


export const getEnabledPieces = (): TetrominoType[] => {
    return pieceConfig.pieces
        .filter(piece => piece.enabled)
        .map(piece => piece.id as TetrominoType);
};