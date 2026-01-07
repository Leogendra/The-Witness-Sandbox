import React from 'react';
import { useDrag } from 'react-dnd';
import pieceConfig from '../../piece_config.json';

// Color palette applied in order
const COLOR_PALETTE = [
    '#F5BE02',
    '#00f0f0',
    '#a000f0',
    '#00f000',
    '#f00000',
    '#0000f0',
    '#ff69b4',
    '#9370db',
    '#20b2aa',
    '#ff6b9d',
    '#32cd32',
    '#ff4500',
    '#1e90ff',
];


interface TetrisShapeProps {
    type: string;
    color: string;
    pattern: number[][];
    pieceId?: string;
    onRemove?: () => void;
    onRotate?: () => void;
    style?: React.CSSProperties;
    cellSize?: number;
}


export const TetrisShape = React.forwardRef<HTMLDivElement, TetrisShapeProps>(
    ({ type, color, pattern, pieceId, onRemove, onRotate, style, cellSize = 33 }, forwardedRef) => {
        const dragStartOffsetRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
        const [isHovered, setIsHovered] = React.useState(false);

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
        }), [type, pattern, pieceId, color, onRemove]);

        const setRefs = React.useCallback((node: HTMLDivElement | null) => {
            drag(node);
            if (typeof forwardedRef === 'function') {
                forwardedRef(node);
            } else if (forwardedRef) {
                forwardedRef.current = node;
            }
        }, [forwardedRef, drag]);

        const handleClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (onRotate) {
                onRotate();
            }
        };

        return (
            <div
                ref={setRefs}
                className="inline-block p-0 bg-transparent rounded-none transition-colors relative"
                style={{ opacity: isDragging ? 0.5 : 1, pointerEvents: 'none', ...(style || {}) }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div className="flex flex-col gap-0.5" style={{ lineHeight: 0 }}>
                    {pattern.map((row, i) => (
                        <div key={i} className="flex gap-0.5">
                            {row.map((cell, j) =>
                                cell ? (
                                    <div
                                        key={j}
                                        onClick={handleClick}
                                        className="cursor-move"
                                        style={{
                                            width: `${cellSize}px`,
                                            height: `${cellSize}px`,
                                            backgroundColor: color,
                                            border: '1px solid #1a202c',
                                            boxSizing: 'border-box',
                                            borderRadius: 0,
                                            pointerEvents: 'auto',
                                            boxShadow: (isHovered && !isDragging) ? 'inset 0 0 0 2px rgba(96, 165, 250, 0.6)' : 'none',
                                            transition: 'box-shadow 0.2s ease',
                                        }}
                                    />
                                ) : (
                                    <div
                                        key={j}
                                        style={{
                                            width: `${cellSize}px`,
                                            height: `${cellSize}px`,
                                            pointerEvents: 'none',
                                        }}
                                    />
                                )
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    }
);

TetrisShape.displayName = 'TetrisShape';


export const PIECES: Record<string, { pattern: number[][], color: string }> =
    pieceConfig.pieces.reduce((acc, piece, index) => {
        acc[piece.id] = {
            pattern: piece.pattern,
            color: COLOR_PALETTE[index % COLOR_PALETTE.length]
        };
        return acc;
    }, {} as Record<string, { pattern: number[][], color: string }>);


export const getEnabledPieces = (): string[] => {
    return pieceConfig.pieces
        .filter(piece => piece.enabled)
        .map(piece => piece.id);
};