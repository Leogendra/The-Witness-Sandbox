import { useState } from 'react';
import { TetrisShape } from './TetrisShape';


interface PaletteShapeProps {
    type: string;
    color: string;
    initialPattern: number[][];
    cellSize?: number;
}


export const PaletteShape = ({ type, color, initialPattern, cellSize }: PaletteShapeProps) => {
    const [pattern, setPattern] = useState(initialPattern);

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

    const handleRotate = () => {
        setPattern(prev => rotatePattern(prev));
    };

    return (
        <TetrisShape
            type={type}
            color={color}
            pattern={pattern}
            onRotate={handleRotate}
            cellSize={cellSize}
        />
    );
};


PaletteShape.displayName = 'PaletteShape';