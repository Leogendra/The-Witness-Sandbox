import React, { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';


export interface CustomPiece {
    id: string;
    pattern: number[][];
    color: string;
    createdAt: number;
}

interface ShapeCreatorProps {
    onSaveShape: (shape: CustomPiece) => void;
    existingShapes: CustomPiece[];
    onDeleteShape: (id: string) => void;
    onEditShape: (shape: CustomPiece) => void;
}


export const ShapeCreator: React.FC<ShapeCreatorProps> = ({ onSaveShape, existingShapes, onDeleteShape, onEditShape }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedColor, setSelectedColor] = useState('#F5BE02');
    const [gridSize, setGridSize] = useState(6);
    const [pattern, setPattern] = useState<number[][]>(Array(6).fill(null).map(() => Array(6).fill(0)));
    const [editingShape, setEditingShape] = useState<CustomPiece | null>(null);

    const toggleCell = (row: number, col: number) => {
        const newPattern = pattern.map(r => [...r]);
        newPattern[row][col] = newPattern[row][col] ? 0 : 1;
        setPattern(newPattern);
    };

    const trimPattern = (pat: number[][]): number[][] => {
        // Remove empty rows from top and bottom
        let minRow = pat.length;
        let maxRow = -1;
        let minCol = pat[0].length;
        let maxCol = -1;

        for (let i = 0; i < pat.length; i++) {
            for (let j = 0; j < pat[i].length; j++) {
                if (pat[i][j]) {
                    minRow = Math.min(minRow, i);
                    maxRow = Math.max(maxRow, i);
                    minCol = Math.min(minCol, j);
                    maxCol = Math.max(maxCol, j);
                }
            }
        }

        if (minRow > maxRow) {
            return [[1]]; // Empty pattern, return a single cell
        }

        const trimmed: number[][] = [];
        for (let i = minRow; i <= maxRow; i++) {
            trimmed.push(pat[i].slice(minCol, maxCol + 1));
        }

        return trimmed;
    };

    const handleSaveShape = () => {
        const trimmedPattern = trimPattern(pattern);
        const newShape: CustomPiece = {
            id: editingShape?.id || `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            pattern: trimmedPattern,
            color: selectedColor,
            createdAt: editingShape?.createdAt || Date.now(),
        };

        onSaveShape(newShape);
        resetForm();
        setIsOpen(false);
    };

    const handleEditShape = (shape: CustomPiece) => {
        setEditingShape(shape);
        setSelectedColor(shape.color);
        setPattern(shape.pattern);
        setGridSize(Math.max(shape.pattern.length, shape.pattern[0]?.length || 1) + 1);
        setIsOpen(true);
    };

    const resetForm = () => {
        setSelectedColor('#F5BE02');
        setGridSize(6);
        setPattern(Array(6).fill(null).map(() => Array(6).fill(0)));
        setEditingShape(null);
    };

    const handleClose = () => {
        setIsOpen(false);
        resetForm();
    };

    return (
        <div className="w-full flex flex-col items-center">
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button className="px-10 py-2 mb-4">Create New Shape</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingShape ? 'Edit shape' : 'Create new shape'}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Color Picker */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Color</label>
                            <input
                                type="color"
                                value={selectedColor}
                                onChange={(e) => setSelectedColor(e.target.value)}
                                className="w-full h-10 rounded cursor-pointer"
                            />
                        </div>

                        {/* Grid Size Control */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Grid Size: 6x6</label>
                        </div>

                        {/* Pattern Grid */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Click cells to create pattern</label>
                            <div className="inline-block bg-gray-100 p-2 rounded">
                                <div className="flex flex-col gap-1">
                                    {pattern.map((row, i) => (
                                        <div key={i} className="flex gap-1">
                                            {row.map((cell, j) => (
                                                <button
                                                    key={`${i}-${j}`}
                                                    onClick={() => toggleCell(i, j)}
                                                    className="w-8 h-8 rounded border-2 transition-colors"
                                                    style={{
                                                        backgroundColor: cell ? selectedColor : '#e5e7eb',
                                                        borderColor: cell ? selectedColor : '#9ca3af',
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Clear Pattern Button */}
                        <Button
                            variant="outline"
                            onClick={() => setPattern(Array(6).fill(null).map(() => Array(6).fill(0)))}
                            className="w-full"
                        >
                            Clear Pattern
                        </Button>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveShape}>
                            {editingShape ? 'Update Shape' : 'Save Shape'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};