import { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Grid } from './components/Grid';
import { PIECES, getEnabledPieces } from './components/TetrisShape';
import { PaletteShape } from './components/PaletteShape';
import { GridProvider } from './components/GridContext';
import { ShapeCreator, CustomPiece } from './components/ShapeCreator';

const PALETTE_SHAPE_CELL_SIZE = 25;


export default function App() {
    const [gridRows, setGridRows] = useState<number>(5);
    const [gridCols, setGridCols] = useState<number>(5);
    const [editionMode, setEditionMode] = useState<boolean>(false);
    const [customShapes, setCustomShapes] = useState<CustomPiece[]>([]);

    // Load custom shapes from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('customShapes');
        if (saved) {
            try {
                setCustomShapes(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to load custom shapes:', e);
            }
        }
    }, []);

    // Save custom shapes to localStorage
    useEffect(() => {
        localStorage.setItem('customShapes', JSON.stringify(customShapes));
    }, [customShapes]);

    const defaultPiecesIds: string[] = getEnabledPieces();

    const handleSaveShape = (shape: CustomPiece) => {
        setCustomShapes(prev => {
            const existing = prev.findIndex(s => s.id === shape.id);
            if (existing >= 0) {
                const updated = [...prev];
                updated[existing] = shape;
                return updated;
            }
            return [...prev, shape];
        });
    };

    const handleDeleteShape = (id: string) => {
        setCustomShapes(prev => prev.filter(s => s.id !== id));
    };

    const handleEditShape = (shape: CustomPiece) => {
        // Edit handled by the ShapeCreator component
    };

    return (
        <DndProvider backend={HTML5Backend}>
            <GridProvider>
                <div className="min-h-screen bg-gray-900 pt-8 pl-5 pr-5">
                    <div className="max-w-6xl mx-auto">
                        <h1 className="text-4xl text-white text-center mb-8">
                            The Witness Tetris Sandbox
                        </h1>

                        <div className="bg-white rounded-xl shadow-2xl p-8">
                            <div className="grid lg:grid-cols-2 gap-2">
                                {/* Tetris shapes and creator */}
                                <div className="space-y-6">
                                    <div>
                                        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(120px,1fr))]">
                                            {/* Preset shapes */}
                                            {defaultPiecesIds.map((pieceId) => (
                                                <div key={pieceId} className="flex flex-col items-center gap-2">
                                                    <PaletteShape
                                                        type={pieceId}
                                                        color={PIECES[pieceId].color}
                                                        initialPattern={PIECES[pieceId].pattern}
                                                        cellSize={PALETTE_SHAPE_CELL_SIZE}
                                                    />
                                                </div>
                                            ))}

                                            {/* Custom shapes */}
                                            {customShapes.map((shape) => (
                                                <div key={shape.id} className="flex flex-col items-center gap-2 group relative">
                                                    <PaletteShape
                                                        type={shape.id}
                                                        color={shape.color}
                                                        initialPattern={shape.pattern}
                                                        cellSize={PALETTE_SHAPE_CELL_SIZE}
                                                    />
                                                    {/* Delete button on hover */}
                                                    <button
                                                        onClick={() => {
                                                            handleDeleteShape(shape.id);
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-all"
                                                        title="Delete shape"
                                                    >
                                                        x
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <ShapeCreator
                                        onSaveShape={handleSaveShape}
                                        onDeleteShape={handleDeleteShape}
                                        onEditShape={handleEditShape}
                                        existingShapes={customShapes}
                                    />
                                </div>

                                {/* Grid */}
                                <div>
                                    <div className="mb-4 flex flex-wrap items-center justify-center gap-4">
                                        <div className="flex flex-col items-start">
                                            <label htmlFor="grid-rows" className="text-sm font-medium text-gray-700 mb-1">Rows</label>
                                            <input
                                                id="grid-rows"
                                                type="number"
                                                min={1}
                                                max={10}
                                                value={gridRows}
                                                onChange={(e) => setGridRows(Math.max(1, Math.min(10, parseInt(e.target.value || '1'))))}
                                                className="rounded-lg border border-gray-300 px-2 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                                                style={{ width: '7ch' }}
                                            />
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <label htmlFor="grid-cols" className="text-sm font-medium text-gray-700 mb-1">Columns</label>
                                            <input
                                                id="grid-cols"
                                                type="number"
                                                min={1}
                                                max={10}
                                                value={gridCols}
                                                onChange={(e) => setGridCols(Math.max(1, Math.min(10, parseInt(e.target.value || '1'))))}
                                                className="rounded-lg border border-gray-300 px-2 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                                                style={{ width: '7ch' }}
                                            />
                                        </div>
                                    </div>
                                    <Grid
                                        key={`${gridRows}x${gridCols}`}
                                        rows={gridRows}
                                        cols={gridCols}
                                        editionMode={editionMode}
                                        onToggleEditionMode={() => setEditionMode(!editionMode)}
                                    />
                                </div>
                            </div>

                            {/* Instructions */}
                            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                                <h3 className="font-semibold text-blue-900 mb-2">How to use:</h3>
                                <ul className="text-sm text-blue-800 space-y-1">
                                    <li>• Toggle edition mode to draw walls on grid edges, or markers on cells</li>
                                    <li>• Drag shapes to move them or drag outside to remove</li>
                                    <li>• Click shapes to rotate them 90°</li>
                                    <li>• Click "Create new shape" to build custom shapes by clicking cells</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </GridProvider>
        </DndProvider>
    );
}