import React, { createContext, useState } from 'react';


export interface GridInfo {
    rect: DOMRect | null;
    cellSize: number;
}

export interface GridContextValue {
    info: GridInfo;
    setInfo: (info: GridInfo) => void;
}

export const GridContext = createContext<GridContextValue>({
    info: { rect: null, cellSize: 30 },
    setInfo: () => { },
});

export const GridProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
    const [info, setInfo] = useState<GridInfo>({ rect: null, cellSize: 33 });
    return (
        <GridContext.Provider value={{ info, setInfo }}>
            {children}
        </GridContext.Provider>
    );
};


export default GridContext;