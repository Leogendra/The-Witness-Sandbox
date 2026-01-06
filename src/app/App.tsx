import { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Grid } from './components/Grid';
import { TETROMINOS, TetrominoType, getEnabledPieces } from './components/TetrisShape';
import { PaletteShape } from './components/PaletteShape';
import { GridProvider } from './components/GridContext';
import { ShapeCreator, CustomPiece } from './components/ShapeCreator';

export default function App() {
    const [gridSize, setGridSize] = useState<number>(5);
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

    const tetrominoTypes: TetrominoType[] = getEnabledPieces();

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
        // Edit is handled by the ShapeCreator component
        // This callback is just for consistency
    };

    return (
        <DndProvider backend={HTML5Backend}>
            <GridProvider>
                <div className="min-h-screen bg-gray-900 p-8">
                    <div className="max-w-6xl mx-auto">
                        <h1 className="text-4xl text-white text-center mb-8">
                            The Witness Sandbox
                        </h1>

                        <div className="bg-white rounded-xl shadow-2xl p-8">
                            {/* Grid Size Selector */}
                            <div className="mb-8">
                                <label className="block text-lg mb-3">Grid Size</label>
                                <div className="flex gap-4">
                                    {[4, 5, 6].map((size) => (
                                        <button
                                            key={size}
                                            onClick={() => setGridSize(size)}
                                            className={`px-6 py-3 rounded-lg transition-all ${gridSize === size
                                                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                }`}
                                        >
                                            {size}x{size}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Edition Mode Toggle */}
                            <div className="mb-8">
                                <button
                                    onClick={() => setEditionMode(!editionMode)}
                                    className={`px-6 py-3 rounded-lg transition-all ${editionMode
                                            ? 'bg-purple-600 text-white shadow-lg'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                >
                                    {editionMode ? 'Edition Mode ON' : 'Edition Mode OFF'}
                                </button>
                                {editionMode && (
                                    <p className="text-sm text-purple-600 mt-2">
                                        Click on grid edges to add/remove walls
                                    </p>
                                )}
                            </div>

                            <div className="grid lg:grid-cols-2 gap-8">
                                {/* Tetris shapes and creator */}
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4">Shapes</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Custom Shapes First */}
                                            {customShapes.map((shape) => (
                                                <div key={shape.id} className="flex flex-col items-center gap-2 group relative">
                                                    <PaletteShape
                                                        type={shape.id}
                                                        color={shape.color}
                                                        initialPattern={shape.pattern}
                                                    />
                                                    {/* Delete button on hover */}
                                                    <button
                                                        onClick={() => {
                                                            if (confirm('Delete this shape?')) {
                                                                onDeleteShape(shape.id);
                                                            }
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-all"
                                                        title="Delete shape"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}

                                            {/* Preset Shapes */}
                                            {tetrominoTypes.map((type) => (
                                                <div key={type} className="flex flex-col items-center gap-2">
                                                    <PaletteShape
                                                        type={type}
                                                        color={TETROMINOS[type].color}
                                                        initialPattern={TETROMINOS[type].pattern}
                                                    />
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
                                    <Grid key={gridSize} size={gridSize} editionMode={editionMode} />
                                </div>
                            </div>

                            {/* Instructions */}
                            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                                <h3 className="font-semibold text-blue-900 mb-2">How to use:</h3>
                                <ul className="text-sm text-blue-800 space-y-1">
                                    <li>• Select grid size (4x4, 5x5, or 6x6)</li>
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