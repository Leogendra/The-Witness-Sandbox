import { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Grid } from './components/Grid';
import { TETROMINOS, TetrominoType, getEnabledPieces } from './components/TetrisShape';
import { PaletteShape } from './components/PaletteShape';
import { GridProvider } from './components/GridContext';

export default function App() {
    const [gridSize, setGridSize] = useState<number>(5);
    const [editionMode, setEditionMode] = useState<boolean>(false);

    const tetrominoTypes: TetrominoType[] = getEnabledPieces();

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
                                {/* Tetris shapes */}
                                <div>
                                    <div className="grid grid-cols-2 gap-4">
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
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </GridProvider>
        </DndProvider>
    );
}